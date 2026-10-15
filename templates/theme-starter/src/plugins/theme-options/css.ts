/**
 * Turns the saved theme options into a <style> block of token overrides.
 *
 * Every value that reaches the CSS is either a validated hex color or a
 * preset chosen from a fixed list, so nothing an admin types is ever
 * interpolated into the page verbatim.
 */

export interface ThemeOptions {
	brandColor?: string;
	brandColorDark?: string;
	accentColor?: string;
	fontPair?: string;
	corners?: string;
	colorScheme?: string;
	glows?: boolean;
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Font pairs. The --font-* source variables are defined in astro.config.mjs. */
export const FONT_PAIRS: Record<string, { label: string; tokens: Record<string, string> }> = {
	classic: {
		label: "Classic — Inter with Instrument Serif headlines",
		tokens: {},
	},
	modern: {
		label: "Modern — Inter throughout",
		tokens: {
			"--font-display": "var(--font-inter)",
			"--font-weight-display": "600",
			"--tracking-snug": "-0.035em",
		},
	},
	editorial: {
		label: "Editorial — Source Serif with Fraunces headlines",
		tokens: {
			"--font-body": "var(--font-source-serif)",
			"--font-display": "var(--font-fraunces)",
		},
	},
	geometric: {
		label: "Geometric — DM Sans with Space Grotesk headlines",
		tokens: {
			"--font-body": "var(--font-dm-sans)",
			"--font-display": "var(--font-space-grotesk)",
			"--font-weight-display": "500",
			"--tracking-snug": "-0.03em",
		},
	},
	system: {
		label: "System — the visitor's operating system font",
		tokens: {
			"--font-body": "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
			"--font-display": "var(--font-body)",
			"--font-weight-display": "600",
		},
	},
};

export const CORNER_PRESETS: Record<string, { label: string; tokens: Record<string, string> }> = {
	rounded: { label: "Rounded (template default)", tokens: {} },
	soft: {
		label: "Soft — smaller radii, pill buttons",
		tokens: {
			"--radius-sm": "6px",
			"--radius": "8px",
			"--radius-lg": "12px",
			"--radius-xl": "14px",
			"--radius-media": "16px",
			"--radius-sheet": "clamp(14px, 1.4vw, 20px)",
		},
	},
	sharp: {
		label: "Sharp — square corners and buttons",
		tokens: {
			"--radius-sm": "2px",
			"--radius": "3px",
			"--radius-lg": "4px",
			"--radius-xl": "4px",
			"--radius-media": "4px",
			"--radius-sheet": "6px",
			"--radius-full": "4px",
		},
	},
};

export const COLOR_SCHEMES: Record<string, { label: string; value: string | null }> = {
	system: { label: "Follow the visitor's device", value: null },
	light: { label: "Light", value: "light" },
	dark: { label: "Dark", value: "dark" },
};

/** The value as a lowercase hex color, or null if it is not one. */
export function parseHex(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed && HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : null;
}

/** WCAG relative luminance of a validated hex color. */
function luminance(color: string): number {
	const digits =
		color.length === 4
			? Array.from(color.slice(1), (d) => d + d)
			: [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)];
	const [r = 0, g = 0, b = 0] = digits.map((d) => {
		const c = Number.parseInt(d, 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Light or dark text, whichever contrasts more with the given fill. */
export function onColor(fill: string): string {
	const l = luminance(fill);
	const contrastWithWhite = 1.05 / (l + 0.05);
	const contrastWithInk = (l + 0.05) / (luminance("#141312") + 0.05);
	return contrastWithWhite >= contrastWithInk ? "#ffffff" : "#141312";
}

function declarations(tokens: Record<string, string>): string {
	return Object.entries(tokens)
		.map(([name, value]) => `${name}: ${value};`)
		.join(" ");
}

export interface ThemeTokens {
	/** Declarations that apply in both color schemes. */
	tokens: Record<string, string>;
	/** light-dark() refinements for browsers that support it. */
	modeAware: Record<string, string>;
}

export function resolveThemeTokens(options: ThemeOptions): ThemeTokens {
	const tokens: Record<string, string> = {};
	const modeAware: Record<string, string> = {};

	const brand = parseHex(options.brandColor);
	const brandDark = parseHex(options.brandColorDark);
	if (brand) {
		tokens["--color-brand"] = brand;
		tokens["--color-on-brand"] = onColor(brand);
		if (brandDark && brandDark !== brand) {
			modeAware["--color-brand"] = `light-dark(${brand}, ${brandDark})`;
			modeAware["--color-on-brand"] = `light-dark(${onColor(brand)}, ${onColor(brandDark)})`;
		}
	}

	const accent = parseHex(options.accentColor);
	if (accent) tokens["--color-accent"] = accent;

	Object.assign(tokens, FONT_PAIRS[options.fontPair ?? ""]?.tokens);
	Object.assign(tokens, CORNER_PRESETS[options.corners ?? ""]?.tokens);

	const scheme = COLOR_SCHEMES[options.colorScheme ?? ""]?.value;
	if (scheme) tokens["color-scheme"] = scheme;

	if (options.glows === false) {
		tokens["--glow-daylight"] = "none";
		tokens["--glow-dusk"] = "none";
	}

	return { tokens, modeAware };
}

/**
 * Build the override stylesheet, or null when nothing is customized.
 *
 * Rules use `html:root` (0,1,1): it beats the template's `:root` defaults in
 * tokens.css and theme.css, but loses to `:root.light` / `:root.dark` (0,2,0),
 * so a visitor's own light/dark toggle still wins over the admin default.
 */
export function buildThemeCss(options: ThemeOptions): string | null {
	const { tokens, modeAware } = resolveThemeTokens(options);
	if (Object.keys(tokens).length === 0) return null;

	let css = `html:root { ${declarations(tokens)} }`;
	if (Object.keys(modeAware).length > 0) {
		// Browsers without light-dark() keep the plain values above.
		css += ` @supports (color: light-dark(#000, #fff)) { html:root { ${declarations(modeAware)} } }`;
	}
	return css;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const COLOR_KEYS = ["brandColor", "brandColorDark", "accentColor"] as const;

/**
 * Validate a save request. Empty colors and default presets come back as
 * undefined, meaning "remove the stored value".
 */
export function normalizeThemeOptions(input: unknown): {
	values: ThemeOptions;
	errors: Partial<Record<keyof ThemeOptions, string>>;
} {
	const raw = isRecord(input) ? input : {};
	const values: ThemeOptions = {};
	const errors: Partial<Record<keyof ThemeOptions, string>> = {};

	for (const key of COLOR_KEYS) {
		const value = raw[key];
		if (value === undefined || value === null || value === "") continue;
		const color = typeof value === "string" ? parseHex(value) : null;
		if (color) values[key] = color;
		else errors[key] = "Use a hex color such as #2563eb.";
	}

	const preset = (key: "fontPair" | "corners" | "colorScheme", presets: Record<string, unknown>) => {
		const value = raw[key];
		if (typeof value === "string" && value in presets) values[key] = value;
		else if (value !== undefined) errors[key] = "Choose one of the listed options.";
	};
	preset("fontPair", FONT_PAIRS);
	preset("corners", CORNER_PRESETS);
	preset("colorScheme", COLOR_SCHEMES);

	if (typeof raw.glows === "boolean") values.glows = raw.glows;

	return { values, errors };
}
