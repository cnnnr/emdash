/**
 * Plugin admin modules of the plugins that are switched on: what every suite hook reads instead of
 * `usePluginAdmins()`, which lists every installed plugin. EmDash's own slots (content editor panels,
 * list columns, dashboard widgets) skip a plugin the Plugin Manager has disabled; this applies the same
 * rule, from the same source (the admin manifest's `plugins[id].enabled`, the one `["manifest"]` query
 * the router already loads), so a disabled plugin's hooks stop too. Until the manifest has loaded nothing
 * is filtered, as in EmDash's own slots.
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
