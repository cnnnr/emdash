/**
 * Draws the sidebar's content area from a plugin's `sidebarLayout` (lib/sidebar-layout.ts), or
 * EmDash's own groups when no plugin has one or it returns `null`.
 *
 * emdash-suite hook: sidebar-layout
 */

import { Sidebar as KumoSidebar } from "@cloudflare/kumo";
import { useLocation } from "@tanstack/react-router";
import * as React from "react";

import { usePluginAdmins } from "../lib/plugin-context";
import type {
	SidebarArrangedSection,
	SidebarLayoutContext,
	SidebarLayoutExtension,
	SidebarLayoutItem,
} from "../lib/sidebar-layout.js";
import { resolveNavIcon } from "./admin-navigation-icons.js";
import {
	isItemActive,
	NavFolderMenu,
	NavMenuLink,
	resolveItemPath,
	useFolderState,
} from "./Sidebar.js";

interface SidebarLayoutContentProps {
	items: readonly SidebarLayoutItem[];
	role: number;
	/** EmDash's own groups, drawn when no layout applies. */
	children: React.ReactNode;
}

const context = (role: number): SidebarLayoutContext => ({
	role,
	resolvePath: resolveItemPath,
	resolveIcon: resolveNavIcon,
});

/** `KumoSidebar.Content`, arranged by a plugin when one provides a layout. */
export function SidebarLayoutContent({ items, role, children }: SidebarLayoutContentProps) {
	const admins = usePluginAdmins();
	const layout = Object.values(admins).find((admin) => admin.sidebarLayout)?.sidebarLayout;
	if (!layout) return <KumoSidebar.Content>{children}</KumoSidebar.Content>;
	return (
		<ArrangedContent layout={layout} items={items} role={role}>
			{children}
		</ArrangedContent>
	);
}

function ArrangedContent({
	layout,
	items,
	role,
	children,
}: SidebarLayoutContentProps & { layout: SidebarLayoutExtension }) {
	const currentPath = useLocation().pathname;
	const folders = useFolderState();
	const sections = layout.useArrangement(items, context(role));
	if (!sections) return <KumoSidebar.Content>{children}</KumoSidebar.Content>;

	function folder(
		label: string,
		members: SidebarLayoutItem[],
		iconName: string | undefined,
		key: string,
	) {
		const open =
			folders.state[label] ??
			members.some((item) => isItemActive(resolveItemPath(item), currentPath));
		return (
			<NavFolderMenu
				key={key}
				folder={{ kind: "folder", label, iconName, items: members }}
				currentPath={currentPath}
				open={open}
				onToggle={() => folders.setOpen(label, !open)}
			/>
		);
	}

	function section(s: SidebarArrangedSection, index: number) {
		return (
			<KumoSidebar.Group
				key={s.key}
				className={
					index === 0
						? "mt-2 md:mt-1.5"
						: // A top-level folder has no group label, so a line keeps it from reading as part of
							// the group above it.
							s.collapsible
							? "mt-2 border-t border-kumo-line pt-2"
							: undefined
				}
			>
				{s.label && !s.collapsible && <KumoSidebar.GroupLabel>{s.label}</KumoSidebar.GroupLabel>}
				<KumoSidebar.Menu>
					{s.collapsible
						? folder(
								s.label ?? "",
								s.entries.flatMap((entry) => [entry.item, ...entry.children]),
								undefined,
								s.key,
							)
						: s.entries.map((entry) =>
								entry.children.length > 0 ? (
									folder(
										entry.item.label,
										[entry.item, ...entry.children],
										entry.item.iconName,
										resolveItemPath(entry.item),
									)
								) : (
									<NavMenuLink
										key={resolveItemPath(entry.item)}
										item={entry.item}
										isActive={isItemActive(resolveItemPath(entry.item), currentPath)}
									/>
								),
							)}
				</KumoSidebar.Menu>
			</KumoSidebar.Group>
		);
	}

	return <KumoSidebar.Content>{sections.map(section)}</KumoSidebar.Content>;
}
