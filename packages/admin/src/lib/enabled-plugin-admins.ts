/**
 * Plugin admin modules of the plugins that are switched on: what every suite hook reads instead of
 * `usePluginAdmins()`, which lists every installed plugin. EmDash's own slots (content editor panels,
 * list columns, dashboard widgets) skip a plugin the Plugin Manager has disabled; this applies the same
 * rule, from the same source (the admin manifest's `plugins[id].enabled`, the one `["manifest"]` query
 * the router already loads), so a disabled plugin's hooks stop too. Until the manifest has loaded nothing
 * is filtered, as in EmDash's own slots.
 *
 * `usePluginAvailable(pluginId)` is the same rule for one plugin: false once the manifest has loaded and doesn't
 * list the plugin as enabled (the plugin's own page and field widgets resolve from the admin modules, not the
 * manifest, so they ask this). A server can leave a plugin out of the manifest for a user, so it doesn't exist for them.
 *
 * emdash-suite hook: enabled-plugin-admins
 */

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { fetchManifest, type AdminManifest } from "./api/client.js";
import { type PluginAdmins, usePluginAdmins } from "./plugin-context.js";

/** `admins` without the plugins `plugins` (the manifest's plugin states) lists as missing or disabled; unchanged without states. */
export function filterEnabledPluginAdmins(
	admins: PluginAdmins,
	plugins: AdminManifest["plugins"] | undefined,
): PluginAdmins {
	if (!plugins) return admins;
	const enabled: PluginAdmins = {};
	for (const [pluginId, admin] of Object.entries(admins)) {
		const state = plugins[pluginId];
		if (!state || state.enabled === false) continue;
		enabled[pluginId] = admin;
	}
	return enabled;
}

export function useEnabledPluginAdmins(): PluginAdmins {
	const admins = usePluginAdmins();
	const { data: manifest } = useQuery({ queryKey: ["manifest"], queryFn: fetchManifest });
	return React.useMemo(
		() => filterEnabledPluginAdmins(admins, manifest?.plugins),
		[admins, manifest?.plugins],
	);
}

/** Whether `pluginId` exists for this user: listed as enabled by the manifest, or the manifest hasn't loaded yet. */
export function isPluginAvailable(plugins: AdminManifest["plugins"] | undefined, pluginId: string): boolean {
	if (!plugins) return true;
	const state = plugins[pluginId];
	return state !== undefined && state.enabled !== false;
}

export function usePluginAvailable(pluginId: string): boolean {
	const { data: manifest } = useQuery({ queryKey: ["manifest"], queryFn: fetchManifest });
	return isPluginAvailable(manifest?.plugins, pluginId);
}
