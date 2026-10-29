/**
 * General Settings fields hook: the `generalSettingsFields` slot on PluginAdminModule.
 *
 * A trusted plugin can take over named fields of the General Settings page: the fields are
 * hidden (their values stay in the form and are saved unchanged) and the plugin's component is
 * drawn at the top of Site Identity in their place. `"social"` takes over the Social Links page
 * instead: its row in the Settings hub is hidden (a plugin writes those values itself). With no
 * plugin exporting the slot nothing is hidden and nothing is rendered, so the page is EmDash's own.
 *
 * emdash-suite hook: general-settings-fields
 */

import * as React from "react";

import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { SettingRow } from "../components/settings/SettingsLayout.js";
import { usePluginAdmins } from "./plugin-context.js";

/** A General Settings field a plugin can take over. */
export type GeneralSettingsFieldName = "title" | "tagline" | "social";

export interface GeneralSettingsFieldsExtension {
	/** The fields to hide. */
	fields: readonly GeneralSettingsFieldName[];
	/** Drawn in their place (optional for `"social"`, which has no place on the General page). */
	component?: React.ComponentType;
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
			{useExtensions().map((Extension, index) =>
				Extension.component ? (
					<SettingRow key={index}>
						<PluginFieldErrorBoundary fieldKind="general settings">
							<Extension.component />
						</PluginFieldErrorBoundary>
					</SettingRow>
				) : null,
			)}
		</>
	);
}

/** Hides the Settings hub's row for a page a plugin has taken over (`"social"`). Draws nothing otherwise. */
export function HideTakenOverSettingsLinks() {
	const hidden = useExtensions().some((extension) => extension.fields.includes("social"));
	return hidden ? <style>{'a[href$="/settings/social"] { display: none; }'}</style> : null;
}
