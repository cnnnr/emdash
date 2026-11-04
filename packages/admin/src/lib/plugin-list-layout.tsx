/**
 * Plugin list layout hook: the `pluginListLayout` slot on PluginAdminModule.
 *
 * A plugin that exports `pluginListLayout` draws the Plugin Manager's list of plugins itself. It gets
 * the plugins and `renderCard(plugin)`, which draws EmDash's own card for one (switch, settings,
 * details and dialogs all work as usual), so it can group, order and style the cards. The cards carry
 * a stable `data-plugin-row` attribute (the plugin id) to style them from.
 *
 * With no enabled plugin exporting the slot, the Plugin Manager is EmDash's own.
 *
 * emdash-suite hook: plugin-list-layout
 */

import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import type { PluginInfo } from "./api/plugins.js";
import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

export interface PluginListLayoutProps {
	plugins: readonly PluginInfo[];
	/** EmDash's card for one plugin. */
	renderCard: (plugin: PluginInfo) => React.ReactNode;
}

export type PluginListLayoutExtension = React.ComponentType<PluginListLayoutProps>;

/** True inside the plugin's layout, where cards draw. */
const InsideLayout = React.createContext(false);

function usePluginListLayout(): PluginListLayoutExtension | null {
	for (const admin of Object.values(useEnabledPluginAdmins())) {
		if (admin.pluginListLayout) return admin.pluginListLayout;
	}
	return null;
}

/** Draws the plugin's layout, or nothing while no enabled plugin has one. */
export function PluginListLayoutSlot(props: PluginListLayoutProps) {
	const Layout = usePluginListLayout();
	if (!Layout) return null;
	return (
		<InsideLayout.Provider value>
			<PluginFieldErrorBoundary fieldKind="plugin list">
				<Layout {...props} />
			</PluginFieldErrorBoundary>
		</InsideLayout.Provider>
	);
}

/** True for EmDash's own list while a plugin's layout draws the cards instead. */
export function usePluginCardHidden(): boolean {
	return usePluginListLayout() !== null && !React.useContext(InsideLayout);
}
