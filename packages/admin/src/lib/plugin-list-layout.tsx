/**
 * Plugin list layout hook: the `pluginListLayout` slot on PluginAdminModule.
 *
 * A plugin that exports `pluginListLayout` draws the Plugin Manager's list itself. It gets the
 * plugins and `renderCard(plugin)`, which returns EmDash's own card for one (switch, settings,
 * details and dialogs all work as usual), so it can group, order and style the cards. The cards
 * carry stable markers to style them from: `data-plugin-row` (the plugin id) on the card,
 * `data-plugin-summary` on its top row, `data-plugin-features` on the feature icons and
 * `data-plugin-actions` on its buttons and switch.
 *
 * With no enabled plugin exporting the slot, the children (EmDash's own cards) render as they are.
 * If the layout throws, EmDash's own cards render instead.
 *
 * emdash-suite hook: plugin-list-layout
 */

import * as React from "react";

import type { PluginInfo } from "./api/plugins.js";
import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

export interface PluginListLayoutProps {
	plugins: readonly PluginInfo[];
	/** EmDash's card for one plugin. */
	renderCard: (plugin: PluginInfo) => React.ReactNode;
}

export type PluginListLayoutExtension = React.ComponentType<PluginListLayoutProps>;

/** Shows `fallback` when what it wraps throws while rendering. */
class LayoutBoundary extends React.Component<
	{ fallback: React.ReactNode; children: React.ReactNode },
	{ failed: boolean }
> {
	override state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	override render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}

/** Wraps EmDash's own cards; hands them to the plugin's layout when an enabled plugin has one. */
export function PluginListLayoutSlot({
	plugins,
	children,
}: {
	plugins: readonly PluginInfo[];
	children: React.ReactNode;
}) {
	const admins = useEnabledPluginAdmins();
	const Layout = Object.values(admins).find((admin) => admin.pluginListLayout)?.pluginListLayout;
	if (!Layout) return <>{children}</>;
	const cards = new Map<string, React.ReactNode>();
	for (const card of React.Children.toArray(children)) {
		const id = React.isValidElement<{ plugin?: PluginInfo }>(card)
			? card.props.plugin?.id
			: undefined;
		if (id) cards.set(id, card);
	}
	return (
		<LayoutBoundary fallback={children}>
			<Layout plugins={plugins} renderCard={(plugin) => cards.get(plugin.id)} />
		</LayoutBoundary>
	);
}
