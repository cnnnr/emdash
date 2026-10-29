/**
 * emdash-suite hook: nested-field-editors
 *
 * Lets a trusted plugin choose the editor for a field inside a section (blocks field) or a
 * repeater item, through `PluginAdminModule.nestedFieldEditors`. The first extension whose
 * `match` accepts the field supplies the editor; with none, EmDash's own editor renders.
 */

import * as React from "react";

import { usePluginAdmins } from "../lib/plugin-context.js";
import { PluginFieldErrorBoundary } from "./PluginFieldErrorBoundary.js";

export interface NestedFieldEditorProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
	minimal?: boolean;
	readOnly?: boolean;
	multiline?: boolean;
}

export interface NestedFieldInfo {
	type: string;
	slug: string;
	label: string;
	required?: boolean;
	validation?: Record<string, unknown>;
}

export interface NestedFieldEditorContext {
	parent: "block" | "repeater";
	blockType?: string;
	insideBlock: boolean;
}

export interface NestedFieldEditorExtension {
	/** Whether this editor handles the field. The first extension that returns true wins. */
	match: (field: NestedFieldInfo, context: NestedFieldEditorContext) => boolean;
	component: React.ComponentType<NestedFieldEditorProps>;
}

/** Set around a section's fields so repeaters inside a section know it (and which block type). */
const InsideBlockContext = React.createContext<{ blockType: string } | null>(null);

function useExtensions(): readonly NestedFieldEditorExtension[] {
	return Object.values(usePluginAdmins()).flatMap((admin) => admin.nestedFieldEditors ?? []);
}

function pluginEditor(
	extensions: readonly NestedFieldEditorExtension[],
	field: NestedFieldInfo,
	context: NestedFieldEditorContext,
	props: Omit<NestedFieldEditorProps, "multiline">,
): React.ReactElement | null {
	for (const extension of extensions) {
		if (!extension.match(field, context)) continue;
		const Editor = extension.component;
		return (
			<PluginFieldErrorBoundary key={props.id} fieldKind={field.type}>
				<Editor {...props} multiline={field.type === "text"} />
			</PluginFieldErrorBoundary>
		);
	}
	return null;
}

/** A plugin's editor for a repeater sub-field, or null for EmDash's own. */
export function useRepeaterFieldEditor(
	field: NestedFieldInfo,
	props: Omit<NestedFieldEditorProps, "multiline">,
): React.ReactElement | null {
	const extensions = useExtensions();
	const inside = React.useContext(InsideBlockContext);
	if (extensions.length === 0) return null;
	return pluginEditor(
		extensions,
		field,
		{
			parent: "repeater",
			blockType: inside?.blockType,
			insideBlock: inside !== null,
		},
		props,
	);
}

/**
 * Wraps a section's `renderField` so a plugin can replace a field's editor, and so repeaters
 * inside the section know they are in one. Returns `renderField` itself when no plugin uses the slot.
 */
export function useSectionFieldRenderer<
	T extends {
		name: string;
		field: { id?: string; label?: string; required?: boolean };
		value: unknown;
		onChange: (value: unknown) => void;
	},
>(
	renderField: (input: T) => React.ReactNode,
	blockType: string,
	fields: readonly NestedFieldInfo[] | undefined,
	readOnly: boolean,
): (input: T) => React.ReactNode {
	const extensions = useExtensions();
	if (extensions.length === 0) return renderField;
	const context = { parent: "block", blockType, insideBlock: true } as const;
	return (input) => {
		const definition = fields?.find((candidate) => input.name.endsWith(`.${candidate.slug}`));
		const id = input.field.id ?? input.name;
		const editor = definition
			? pluginEditor(extensions, definition, context, {
					id,
					label: definition.label,
					required: definition.required,
					readOnly,
					value: input.value,
					onChange: input.onChange,
				})
			: null;
		return (
			editor ?? (
				<InsideBlockContext.Provider key={id} value={{ blockType }}>
					{renderField(input)}
				</InsideBlockContext.Provider>
			)
		);
	};
}
