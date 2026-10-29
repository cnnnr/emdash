/**
 * Blocks field hook: the `blocksField` slot on PluginAdminModule.
 *
 * Lets a trusted plugin shape how a `blocks` field (sections) and the repeater items inside
 * it behave: which cards start collapsed and hearing about changes, header actions next to
 * "Add block", a rewrite of a collapsed card's one-line summary, whether repeater items
 * inside a block start collapsed, and moving the "Version N" badge from the title to a footer. With no plugin exporting the slot, every function here
 * returns its input untouched and nothing is rendered, so the editor is EmDash's own.
 *
 * When several plugins export the slot, their contributions combine like this:
 * - `initialCollapsed` and `repeaterItemsCollapsed`: the first plugin (in plugin order) that
 *   returns a boolean decides; `undefined` passes the question on. No answer means open.
 * - `onCollapsedChange`: every plugin hears every change.
 * - `headerActions`: every plugin's component renders, in plugin order.
 * - `useSummaryRewriter`: rewrites chain; each plugin receives the previous one's output.
 * - `hideVersionBadge`: hidden if any plugin asks. `cardFooter`: every plugin's footer renders.
 *
 * emdash-suite hook: blocks-field
 */

import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { usePluginAdmins } from "./plugin-context.js";

/** Which card a callback is about. */
export interface BlocksFieldCard {
	/** Path of the blocks field, e.g. `sections`. */
	fieldPath: string;
	blockKey: string;
	blockType: string;
	/** True for a card added after the field first rendered (added or duplicated). */
	isNew: boolean;
}

/** What `headerActions` components receive. */
export interface BlocksFieldControls {
	fieldPath: string;
	/** Keys of every card, in order. */
	blockKeys: readonly string[];
	/** Keys of the cards that are collapsed right now. */
	collapsedKeys: ReadonlySet<string>;
	collapseAll: () => void;
	expandAll: () => void;
}

export interface BlocksFieldExtension {
	/** Whether a card starts collapsed. Return `undefined` to leave it to the next plugin. */
	initialCollapsed?: (card: BlocksFieldCard) => boolean | undefined;
	/** Called when a card's collapsed state changes after the first render, including a new card opening. */
	onCollapsedChange?: (card: BlocksFieldCard, collapsed: boolean) => void;
	/** Rendered next to "Add block". */
	headerActions?: React.ComponentType<BlocksFieldControls>;
	/** A React hook returning a function that rewrites a collapsed card's summary text. */
	useSummaryRewriter?: () => (text: string, card: BlocksFieldCard) => string;
	/** Whether repeater items inside a block start collapsed (new items always open). */
	repeaterItemsCollapsed?: (context: { blockType: string }) => boolean | undefined;
	/** Hides the "Version N" badge next to a card's title (pair it with `cardFooter`). */
	hideVersionBadge?: boolean;
	/** Rendered at the bottom of an expanded card. */
	cardFooter?: React.ComponentType<{
		fieldPath: string;
		blockKey: string;
		blockType: string;
		version: number;
	}>;
}

function useExtensions(): readonly BlocksFieldExtension[] {
	return Object.values(usePluginAdmins()).flatMap((admin) =>
		admin.blocksField ? [admin.blocksField] : [],
	);
}

function firstAnswer(
	extensions: readonly BlocksFieldExtension[],
	ask: (extension: BlocksFieldExtension) => boolean | undefined,
): boolean | undefined {
	for (const extension of extensions) {
		const answer = ask(extension);
		if (answer !== undefined) return answer;
	}
	return undefined;
}

/**
 * Called by BlocksField next to its collapsed state. Applies plugins' initial collapsed state,
 * reports changes, and returns the header actions (null with no plugin).
 */
export function useBlocksField(args: {
	fieldPath: string;
	blocks: ReadonlyArray<{ _key: string; _type: string }>;
	collapsed: Set<string>;
	setCollapsed: (next: Set<string>) => void;
}): { headerActions: React.ReactNode } {
	const { fieldPath, blocks, collapsed, setCollapsed } = args;
	const extensions = useExtensions();
	const known = React.useRef<Map<string, boolean> | null>(null);

	React.useLayoutEffect(() => {
		if (extensions.length === 0) return;
		const initial = known.current === null;
		const map = (known.current ??= new Map());
		let next = collapsed;
		const present = new Set<string>();
		for (const block of blocks) {
			present.add(block._key);
			const card = { fieldPath, blockKey: block._key, blockType: block._type, isNew: !initial };
			if (!map.has(block._key)) {
				if (
					firstAnswer(extensions, (e) => e.initialCollapsed?.(card)) === true &&
					!next.has(block._key)
				) {
					next = new Set(next).add(block._key);
				}
				map.set(block._key, next.has(block._key));
				if (!initial) for (const e of extensions) e.onCollapsedChange?.(card, next.has(block._key));
			} else if (map.get(block._key) !== next.has(block._key)) {
				map.set(block._key, next.has(block._key));
				for (const e of extensions) e.onCollapsedChange?.(card, next.has(block._key));
			}
		}
		for (const key of map.keys()) if (!present.has(key)) map.delete(key);
		if (next !== collapsed) setCollapsed(next);
	}, [extensions, fieldPath, blocks, collapsed, setCollapsed]);

	const actions = extensions.filter((e) => e.headerActions);
	const hideBadge = extensions.some((e) => e.hideVersionBadge);
	if (actions.length === 0 && !hideBadge) return { headerActions: null };
	const blockKeys = blocks.map((block) => block._key);
	const controls: BlocksFieldControls = {
		fieldPath,
		blockKeys,
		collapsedKeys: collapsed,
		collapseAll: () => setCollapsed(new Set(blockKeys)),
		expandAll: () => setCollapsed(new Set()),
	};
	return {
		headerActions: (
			<>
				{hideBadge && <style>{HIDE_VERSION_BADGE_CSS}</style>}
				{actions.length > 0 && (
					<div className="ms-auto flex items-center gap-2">
						{actions.map((extension, index) => {
							const Actions = extension.headerActions!;
							return (
								<PluginFieldErrorBoundary key={index} fieldKind="blocks">
									<Actions {...controls} />
								</PluginFieldErrorBoundary>
							);
						})}
					</div>
				)}
			</>
		),
	};
}

/** The version badge is the element right after the title in the card's header row. */
const HIDE_VERSION_BADGE_CSS =
	'section[data-blocks-field="hide-version"] > div:first-child .flex-wrap > .font-medium + * { display: none; }';

/** Called by BlockCard: attributes for its `<section>` and the footer inside its expanded body. */
export function useBlockCard(
	block: { _key: string; _type: string; _version: number },
	fieldPath: string,
): { sectionProps: Record<string, string>; footer: React.ReactNode } {
	const extensions = useExtensions();
	const footers = extensions.filter((e) => e.cardFooter);
	return {
		sectionProps: extensions.some((e) => e.hideVersionBadge)
			? { "data-blocks-field": "hide-version" }
			: {},
		footer:
			footers.length === 0 ? null : (
				<>
					{footers.map((extension, index) => {
						const Footer = extension.cardFooter!;
						return (
							<PluginFieldErrorBoundary key={index} fieldKind="blocks">
								<Footer
									fieldPath={fieldPath}
									blockKey={block._key}
									blockType={block._type}
									version={block._version}
								/>
							</PluginFieldErrorBoundary>
						);
					})}
				</>
			),
	};
}

/**
 * The block as it should look while its summary is computed: the summary's text (the first
 * non-empty string field) passed through every plugin's rewriter, in order. Returns `block`
 * itself when no plugin rewrites. Use only around the summary; never for what's edited or saved.
 */
export function useSummaryBlock<B extends { _key: string; _type: string }>(
	block: B,
	fields: ReadonlyArray<{ slug: string }> | undefined,
	fieldPath: string,
): B {
	const extensions = useExtensions();
	// Hooks run per plugin, in a stable order (the plugin list doesn't change while mounted).
	const rewriters = extensions.map((extension) => extension.useSummaryRewriter?.());
	if (!fields || rewriters.every((rewriter) => !rewriter)) return block;
	const card = { fieldPath, blockKey: block._key, blockType: block._type, isNew: false };
	for (const field of fields) {
		const value = (block as Record<string, unknown>)[field.slug];
		if (typeof value !== "string" || !value.trim()) continue;
		let text = value.trim();
		for (const rewriter of rewriters) if (rewriter) text = rewriter(text, card);
		return text === value.trim() ? block : { ...block, [field.slug]: text };
	}
	return block;
}

const InsideBlock = React.createContext<{ blockType: string } | null>(null);

/**
 * Wraps a block's `renderField` so repeaters inside it know their block type. Returns
 * `renderField` itself when no plugin uses `repeaterItemsCollapsed`.
 */
export function useBlockRenderField<T extends { name: string; field: { id?: string } }>(
	renderField: (input: T) => React.ReactNode,
	blockType: string,
): (input: T) => React.ReactNode {
	const extensions = useExtensions();
	if (!extensions.some((extension) => extension.repeaterItemsCollapsed)) return renderField;
	return (input) => (
		<InsideBlock.Provider key={input.field.id ?? input.name} value={{ blockType }}>
			{renderField(input)}
		</InsideBlock.Provider>
	);
}

/** Called by RepeaterField next to its collapsed items: collapses the initial items when asked. */
export function useRepeaterStartCollapsed(
	items: ReadonlyArray<{ _key: string }>,
	setCollapsed: (next: Set<string>) => void,
): void {
	const extensions = useExtensions();
	const inside = React.useContext(InsideBlock);
	React.useLayoutEffect(() => {
		if (!inside || items.length === 0) return;
		const answer = firstAnswer(extensions, (e) =>
			e.repeaterItemsCollapsed?.({ blockType: inside.blockType }),
		);
		if (answer === true) setCollapsed(new Set(items.map((item) => item._key)));
		// Only the items present when the repeater mounts start collapsed.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
