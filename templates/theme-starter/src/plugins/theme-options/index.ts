import { fileURLToPath } from "node:url";

import type { PluginContext, PluginDescriptor } from "emdash";
import { definePlugin } from "emdash";

import { buildThemeCss, normalizeThemeOptions, type ThemeOptions } from "./css";

const ID = "theme-options";
const VERSION = "0.1.0";
const ADMIN_ENTRY = fileURLToPath(new URL("./admin.tsx", import.meta.url));

const OPTION_KEYS = [
	"brandColor",
	"brandColorDark",
	"accentColor",
	"fontPair",
	"corners",
	"colorScheme",
	"glows",
] as const satisfies ReadonlyArray<keyof ThemeOptions>;

async function readOptions(settings: PluginContext["settings"]): Promise<ThemeOptions> {
	const stored = await settings.list();
	return Object.fromEntries(stored.map(({ key, value }) => [key, value]));
}

export function createPlugin() {
	return definePlugin({
		id: ID,
		version: VERSION,
		capabilities: ["hooks.page-fragments:register"],
		admin: {
			entry: ADMIN_ENTRY,
			pages: [{ path: "/", label: "Theme Options", icon: "palette" }],
		},
		routes: {
			settings: {
				methods: ["GET"],
				handler: async (ctx) => readOptions(ctx.settings),
			},
			save: {
				methods: ["POST"],
				handler: async (ctx) => {
					const { values, errors } = normalizeThemeOptions(ctx.input);
					if (Object.keys(errors).length > 0) return { saved: false, errors };

					for (const key of OPTION_KEYS) {
						const value = values[key];
						if (value === undefined) await ctx.settings.delete(key);
						else await ctx.settings.set(key, value);
					}
					return { saved: true, values: await readOptions(ctx.settings) };
				},
			},
		},
		hooks: {
			"page:fragments": async (event, ctx) => {
				if (event.page.path.startsWith("/_emdash/")) return null;

				const css = buildThemeCss(await readOptions(ctx.settings));
				if (!css) return null;

				return {
					kind: "html",
					placement: "head",
					html: `<style data-theme-options>${css}</style>`,
					key: "theme-options",
				};
			},
		},
	});
}

export function themeOptionsPlugin(): PluginDescriptor {
	return {
		id: ID,
		version: VERSION,
		format: "native",
		entrypoint: fileURLToPath(import.meta.url),
		adminEntry: ADMIN_ENTRY,
		options: {},
	};
}
