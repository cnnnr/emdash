/**
 * Email settings hook: the `emailSettings` slot on PluginAdminModule.
 *
 * A plugin adds sections below EmDash's own on Settings > Email (`sections`) and buttons to the page
 * header (`actions`). With no plugin using the slot the page is EmDash's own.
 *
 * emdash-suite hook: email-settings
 */

import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

/** What a plugin exports as `emailSettings`. */
export interface EmailSettingsExtension {
	/** Drawn as extra sections below EmDash's own (use `SettingsSection` styling). */
	sections?: React.ComponentType;
	/** Drawn in the page header, beside the title. */
	actions?: React.ComponentType;
}

function useExtensions(): [string, EmailSettingsExtension][] {
	const admins = useEnabledPluginAdmins();
	return Object.entries(admins).flatMap(([id, admin]) => (admin.emailSettings ? [[id, admin.emailSettings] as [string, EmailSettingsExtension]] : []));
}

/** The plugins' sections, or nothing. */
export function EmailSettingsSections() {
	return (
		<>
			{useExtensions().map(([id, { sections: Sections }]) =>
				Sections ? (
					<PluginFieldErrorBoundary key={id} fieldKind="email settings">
						<Sections />
					</PluginFieldErrorBoundary>
				) : null,
			)}
		</>
	);
}

/** The plugins' header actions, or nothing. */
export function EmailSettingsActions() {
	const actions = useExtensions().filter(([, extension]) => extension.actions);
	if (actions.length === 0) return null;
	return (
		<div className="flex gap-2">
			{actions.map(([id, { actions: Actions }]) => (
				<PluginFieldErrorBoundary key={id} fieldKind="email settings">
					{Actions ? <Actions /> : null}
				</PluginFieldErrorBoundary>
			))}
		</div>
	);
}
