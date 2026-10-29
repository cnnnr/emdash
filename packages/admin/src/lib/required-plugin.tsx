/**
 * Required plugin hook: the `requiredPlugin` slot on PluginAdminModule.
 *
 * A plugin that exports `requiredPlugin` can't be switched off in the Plugin Manager: the switch
 * shows the plugin as on, is disabled, and the card gives the plugin's reason. This only changes
 * the screen; refusing the request on the server is up to the site. With no plugin exporting the
 * slot the Plugin Manager is EmDash's own.
 *
 * emdash-suite hook: required-plugin
 */

import * as React from "react";

import { usePluginAdmins } from "./plugin-context.js";

export interface RequiredPluginExtension {
	/** Why the plugin can't be disabled, shown on its card. */
	reason?: string;
}

/** The plugin's `requiredPlugin`, or `null` when it can be switched off as usual. */
export function useRequiredPlugin(pluginId: string): RequiredPluginExtension | null {
	return usePluginAdmins()[pluginId]?.requiredPlugin ?? null;
}

/** Switch props that pin a required plugin's switch on. Spread after the switch's own props. */
export function requiredSwitchProps(required: RequiredPluginExtension | null) {
	return required ? { checked: true, disabled: true } : {};
}

export function RequiredPluginNote({ required }: { required: RequiredPluginExtension | null }) {
	if (!required) return null;
	return (
		<p className="mt-0.5 text-xs text-kumo-subtle" data-testid="required-plugin-note">
			{required.reason ?? "Required: this plugin is always on."}
		</p>
	);
}
