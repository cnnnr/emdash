/**
 * Sidebar layout hook: types for the `sidebarLayout` slot on PluginAdminModule.
 *
 * A trusted plugin receives the nav items this user can already see (role-filtered) and returns
 * how to arrange them: sections in order, items nested under items, renamed or hidden items,
 * collapsible sections. It can only rearrange what it is given. Returning `null` keeps EmDash's
 * own sidebar. See components/SidebarLayout.tsx for the drawing.
 *
 * emdash-suite hook: sidebar-layout
 */

import type * as React from "react";

import type { NavItem } from "../components/Sidebar.js";

/** A sidebar item as EmDash builds it (`to`, `params`, `label`, `icon`, `iconName`, `badge`...). */
export type SidebarLayoutItem = NavItem;

export interface SidebarLayoutContext {
	/** Current user's role level (matching @emdash-cms/auth). */
	role: number;
	/** The item's address, with route params filled in (`/content/pages`, `/plugins/x/y`). */
	resolvePath: (item: SidebarLayoutItem) => string;
	/** Resolve a Phosphor icon name the way EmDash does for plugin pages. */
	resolveIcon: (name: string | undefined, fallback?: React.ComponentType) => React.ElementType;
}

export interface SidebarArrangedEntry {
	item: SidebarLayoutItem;
	/** Items nested under `item`; drawn with it as one folder. */
	children: SidebarLayoutItem[];
}

export interface SidebarArrangedSection {
	key: string;
	/** Heading, or the folder's name when `collapsible`. */
	label?: string;
	/** Drawn as one folder that opens and closes, instead of a heading. */
	collapsible?: boolean;
	entries: SidebarArrangedEntry[];
}

export interface SidebarLayoutExtension {
	/**
	 * A React hook, called while the sidebar renders. `items` is what this user can see: Dashboard,
	 * Calendar, collections, Manage, Admin and plugin items. Return `null` for EmDash's own sidebar
	 * (for example while the plugin's settings are loading).
	 */
	useArrangement: (
		items: readonly SidebarLayoutItem[],
		context: SidebarLayoutContext,
	) => SidebarArrangedSection[] | null;
}
