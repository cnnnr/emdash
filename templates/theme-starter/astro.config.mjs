import node from "@astrojs/node";
import react from "@astrojs/react";
import icon from "astro-iconset";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

import { themeOptionsPlugin } from "./src/plugins/theme-options/index.ts";

export default defineConfig({
	output: "server",
	adapter: node({
		mode: "standalone",
	}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		icon({
			// Only ship the Phosphor icons actually referenced in templates,
			// not the full @iconify-json/ph set.
			include: {
				ph: [
					"arrow-right",
					"bell-simple",
					"buildings",
					"chart-bar",
					"chat-circle",
					"check",
					"check-circle",
					"clock",
					"cloud",
					"code",
					"currency-dollar",
					"envelope",
					"file-text",
					"gauge",
					"globe",
					"heart",
					"leaf",
					"lifebuoy",
					"lightning",
					"list",
					"lock",
					"map-pin",
					"pause",
					"phone",
					"play",
					"plug",
					"plus",
					"shield-check",
					"sparkle",
					"star",
					"sun",
					"thermometer-simple",
					"trend-up",
					"users-three",
					"x",
				],
			},
		}),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [themeOptionsPlugin()],
		}),
	],
	// Every font a theme option can select. Browsers only download the faces a
	// page actually uses, so unused fonts cost nothing but their @font-face rules.
	fonts: [
		font("Inter", "--font-inter", [400, 500, 600, 700], "sans-serif"),
		font("Instrument Serif", "--font-instrument-serif", [400], "serif", ["normal", "italic"]),
		font("Source Serif 4", "--font-source-serif", [400, 600], "serif", ["normal", "italic"]),
		font("Fraunces", "--font-fraunces", [400, 600], "serif", ["normal", "italic"]),
		font("DM Sans", "--font-dm-sans", [400, 500, 600, 700], "sans-serif"),
		font("Space Grotesk", "--font-space-grotesk", [400, 500, 700], "sans-serif"),
	],
	devToolbar: { enabled: false },
});

function font(name, cssVariable, weights, fallback, styles = ["normal"]) {
	return {
		provider: fontProviders.google(),
		name,
		cssVariable,
		weights,
		styles,
		fallbacks: [fallback],
	};
}
