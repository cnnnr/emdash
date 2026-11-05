/**
 * Sidebar footer hook: the `sidebarFooter` slot on PluginAdminModule.
 *
 * A plugin draws a component at the bottom of the sidebar, just above EmDash's own footer (the collapse
 * button and the version). It is told whether the sidebar is collapsed, so it can draw an icon instead.
 * With no plugin using the slot nothing is drawn and the sidebar is EmDash's own.
 *
 * emdash-suite hook: sidebar-footer
 */

import { useSidebar } from "@cloudflare/kumo";
import * as React from "react";

import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

export interface SidebarFooterProps {
	/** True while the sidebar is collapsed to its icon rail. */
	collapsed: boolean;
}

/** What a plugin exports as `sidebarFooter`. */
export type SidebarFooterExtension = React.ComponentType<SidebarFooterProps>;

/** Draws every enabled plugin's `sidebarFooter`, or nothing. */
export function SidebarFooterSlot() {
	const admins = useEnabledPluginAdmins();
	const { state } = useSidebar();
	const slots = Object.entries(admins).filter(([, admin]) => admin.sidebarFooter);
	if (slots.length === 0) return null;
	return (
		<>
			{slots.map(([pluginId, admin]) => {
				const Slot = admin.sidebarFooter!;
				return <Slot key={pluginId} collapsed={state === "collapsed"} />;
			})}
		</>
	);
}
