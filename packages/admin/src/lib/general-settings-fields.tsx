/**
 * General Settings fields hook: the `generalSettingsFields` slot on PluginAdminModule.
 *
 * A trusted plugin can take over named fields of the General Settings page: the fields are
 * hidden (their values stay in the form and are saved unchanged) and the plugin's component is
 * drawn at the top of Site Identity in their place. With no plugin exporting the slot nothing is
 * hidden and nothing is rendered, so the page is EmDash's own.
 *
 * emdash-suite hook: general-settings-fields
 */

import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { SettingRow } from "../components/settings/SettingsLayout.js";
import { usePluginAdmins } from "./plugin-context.js";

/** A General Settings field a plugin can take over. */
export type GeneralSettingsFieldName = "title" | "tagline";

export interface GeneralSettingsFieldsExtension {
	/** The fields to hide. */
	fields: readonly GeneralSettingsFieldName[];
	/** Drawn in their place. */
	component: React.ComponentType;
}

function useExtensions(): GeneralSettingsFieldsExtension[] {
	const admins = usePluginAdmins();
	return Object.values(admins).flatMap((admin) => admin.generalSettingsFields ?? []);
}

/** `"hidden"` for a field a plugin has taken over, otherwise `undefined`. Pass it as a row's `className`. */
export function useTakenOverClass(field: GeneralSettingsFieldName): string | undefined {
	return useExtensions().some((extension) => extension.fields.includes(field))
		? "hidden"
		: undefined;
}

/** The plugins' replacement components (nothing when no plugin takes a field over). */
export function GeneralSettingsTakeover() {
	return (
		<>
			{useExtensions().map((extension, index) => (
				<SettingRow key={index}>
					<PluginFieldErrorBoundary fieldKind="general settings">
						<extension.component />
					</PluginFieldErrorBoundary>
				</SettingRow>
			))}
		</>
	);
}
