/**
 * Dashboard widgets hook: the `dashboardWidgets` slot on PluginAdminModule.
 *
 * A trusted plugin that declares dashboard widgets (`admin.widgets`) can, per widget id, say which
 * role sees the card (`minRole`, interface only: the plugin's routes enforce access), have EmDash
 * honour the `size` the widget declares (`full`, `half`, `third`) and put actions in the card's
 * title bar. The card's content stays the plugin's own `widgets` component.
 *
 * A widget the slot doesn't mention is drawn as EmDash draws it. While no plugin exports the slot
 * the dashboard is EmDash's own: `useDashboardWidgetLayout().isHooked` is false for every widget.
 *
 * emdash-suite hook: dashboard-widgets
 */

import { LayerCard } from "@cloudflare/kumo";
import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { useCurrentUser } from "./api/current-user.js";
import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

/** Role levels (matching @emdash-cms/auth), as every admin file that checks roles declares them. */
const ROLE_CONTRIBUTOR = 20;
const ROLE_AUTHOR = 30;
const ROLE_EDITOR = 40;
const ROLE_ADMIN = 50;

export type DashboardWidgetRole = "contributor" | "author" | "editor" | "admin";

export interface DashboardWidgetExtension {
	/** Lowest role that sees the card. Everyone sees it when left out. Interface only. */
	minRole?: DashboardWidgetRole;
	/** Drawn at the right of the card's title bar (a link or a button). */
	actions?: React.ComponentType;
}

const ROLE_LEVEL: Record<DashboardWidgetRole, number> = {
	contributor: ROLE_CONTRIBUTOR,
	author: ROLE_AUTHOR,
	editor: ROLE_EDITOR,
	admin: ROLE_ADMIN,
};

/** The plugin grid is six columns wide from `lg` up: full is 6, half is 3, third is 2. */
const SIZE_CLASS: Record<string, string> = {
	full: "lg:col-span-6",
	half: "lg:col-span-3",
	third: "lg:col-span-2",
};
const DEFAULT_SIZE_CLASS = "lg:col-span-3";

export interface DashboardWidgetRef {
	id: string;
	pluginId: string;
	size?: string;
}

export function useDashboardWidgetLayout() {
	const admins = useEnabledPluginAdmins();
	const { data: user } = useCurrentUser();
	const role = user?.role ?? 0;

	const extensionOf = (pluginId: string, widgetId: string) =>
		admins[pluginId]?.dashboardWidgets?.[widgetId];

	return {
		/** False when a plugin's `minRole` hides the card from this user (also while the user loads). */
		isVisible(pluginId: string, widgetId: string): boolean {
			const minRole = extensionOf(pluginId, widgetId)?.minRole;
			return minRole === undefined || role >= ROLE_LEVEL[minRole];
		},
		/** True when any of these widgets is shaped by a plugin: then the dashboard uses the sized grid. */
		isHooked(widgets: readonly DashboardWidgetRef[]): boolean {
			return widgets.some((widget) => extensionOf(widget.pluginId, widget.id) !== undefined);
		},
		extensionOf,
	};
}

/** The plugin cards in a six-column grid, each as wide as its widget declares (half when it doesn't). */
export function DashboardWidgetGrid<T extends DashboardWidgetRef>({
	widgets,
	card,
}: {
	widgets: readonly T[];
	card: (widget: T) => React.ReactNode;
}) {
	const { extensionOf } = useDashboardWidgetLayout();
	return (
		<div className="grid gap-6 lg:grid-cols-6">
			{widgets.map((widget) => (
				<div
					key={`${widget.pluginId}:${widget.id}`}
					className={
						(extensionOf(widget.pluginId, widget.id) && widget.size && SIZE_CLASS[widget.size]) ||
						DEFAULT_SIZE_CLASS
					}
				>
					{card(widget)}
				</div>
			))}
		</div>
	);
}

/** EmDash's plugin card (a heading strip over the widget) with the plugin's actions in the strip. */
export function DashboardWidgetCard({
	extension,
	title,
	children,
}: {
	extension: DashboardWidgetExtension;
	title: React.ReactNode;
	children: React.ReactNode;
}) {
	const Actions = extension.actions;
	return (
		<LayerCard className="h-full">
			<LayerCard.Secondary>
				<h2 className="px-3">{title}</h2>
				{Actions && (
					<div className="-my-1 ml-auto flex items-center gap-2 px-3">
						<PluginFieldErrorBoundary fieldKind="dashboard widget">
							<Actions />
						</PluginFieldErrorBoundary>
					</div>
				)}
			</LayerCard.Secondary>
			<LayerCard.Primary className="flex-1">
				<div className="px-3">{children}</div>
			</LayerCard.Primary>
		</LayerCard>
	);
}
