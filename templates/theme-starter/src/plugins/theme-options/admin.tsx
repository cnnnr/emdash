import { Button, Input, LinkButton, Loader, Select, Switch, Toast } from "@cloudflare/kumo";
import { useLingui } from "@lingui/react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, getErrorMessage, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";

import {
	COLOR_SCHEMES,
	CORNER_PRESETS,
	FONT_PAIRS,
	normalizeThemeOptions,
	onColor,
	parseHex,
	type ThemeOptions,
} from "./css";

const API = "/_emdash/api/plugins/theme-options";

interface FormState {
	brandColor: string;
	brandColorDark: string;
	accentColor: string;
	fontPair: string;
	corners: string;
	colorScheme: string;
	glows: boolean;
}

type ColorKey = "brandColor" | "brandColorDark" | "accentColor";

const DEFAULTS: FormState = {
	brandColor: "",
	brandColorDark: "",
	accentColor: "",
	fontPair: "classic",
	corners: "rounded",
	colorScheme: "system",
	glows: true,
};

/** Template defaults from src/styles/tokens.css, used when a color is left empty. */
const PALETTE = {
	light: {
		bg: "#fafaf9",
		surface: "#ffffff",
		text: "#141312",
		secondary: "#57534e",
		accent: "#d97706",
		onInk: "#fafaf9",
		border: "rgb(20 19 18 / 0.08)",
		glow: "radial-gradient(60% 70% at 100% 0%, rgb(255 205 150 / 0.5), transparent 70%)",
	},
	dark: {
		bg: "#0f0e0d",
		surface: "#181715",
		text: "#f3f2ef",
		secondary: "#b4afa8",
		accent: "#fbbf24",
		onInk: "#141312",
		border: "rgb(255 255 255 / 0.08)",
		glow: "radial-gradient(60% 70% at 100% 0%, rgb(255 170 90 / 0.08), transparent 70%)",
	},
};

const PREVIEW_FONTS: Record<string, { body: string; display: string; weight: number }> = {
	classic: { body: "Inter, sans-serif", display: "'Instrument Serif', serif", weight: 400 },
	modern: { body: "Inter, sans-serif", display: "Inter, sans-serif", weight: 600 },
	editorial: { body: "'Source Serif 4', serif", display: "Fraunces, serif", weight: 400 },
	geometric: { body: "'DM Sans', sans-serif", display: "'Space Grotesk', sans-serif", weight: 500 },
	system: { body: "system-ui, sans-serif", display: "system-ui, sans-serif", weight: 600 },
};

const PRESET_SWATCHES = ["#2563eb", "#0f766e", "#15803d", "#b45309", "#be123c", "#7c3aed", "#141312"];

type Translate = (id: string, message: string, values?: Record<string, string>) => string;

function useT(): Translate {
	const { i18n } = useLingui();
	return React.useCallback(
		(id, message, values) => i18n._({ id: `theme-options.${id}`, message, values }),
		[i18n],
	);
}

const toItems = (t: Translate, group: string, presets: Record<string, { label: string }>) =>
	Object.entries(presets).map(([value, { label }]) => ({
		value,
		label: t(`${group}.${value}`, label),
	}));

function toFormState(saved: ThemeOptions): FormState {
	return {
		brandColor: saved.brandColor ?? DEFAULTS.brandColor,
		brandColorDark: saved.brandColorDark ?? DEFAULTS.brandColorDark,
		accentColor: saved.accentColor ?? DEFAULTS.accentColor,
		fontPair: saved.fontPair ?? DEFAULTS.fontPair,
		corners: saved.corners ?? DEFAULTS.corners,
		colorScheme: saved.colorScheme ?? DEFAULTS.colorScheme,
		glows: saved.glows ?? DEFAULTS.glows,
	};
}

/**
 * Page-specific layout. Colors come from Kumo's tokens so the page follows the
 * admin theme; only spacing, grids and the swatch controls are defined here.
 */
const STYLES = `
.to-page { max-width: 1440px; display: grid; gap: 24px; }
.to-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; }
.to-layout { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 1100px) { .to-layout { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); } }
.to-column { display: grid; gap: 24px; min-width: 0; }
.to-card { border: 1px solid var(--color-kumo-line); background: var(--color-kumo-base); border-radius: 10px; padding: 24px; min-width: 0; }
.to-card-title { font-size: 1.0625rem; font-weight: 600; padding-block-end: 14px; margin-block-end: 4px; border-block-end: 1px solid var(--color-kumo-line); }
.to-card-intro { margin-block: -8px 18px; }
.to-preview .to-card-title { border-block-end: 0; padding-block-end: 0; margin-block-end: 4px; }
.to-row { display: grid; gap: 12px 20px; padding-block: 20px; grid-template-columns: 48px minmax(0, 1fr); align-items: start; }
.to-row + .to-row { border-block-start: 1px solid var(--color-kumo-line); }
.to-row:last-child { padding-block-end: 0; }
@media (min-width: 720px) { .to-row { grid-template-columns: 48px minmax(110px, 150px) minmax(200px, 280px) minmax(0, 1fr); } }
.to-row-label { font-weight: 500; padding-block-start: 10px; }
.to-row-control { grid-column: 2 / -1; display: grid; gap: 10px; }
@media (min-width: 720px) { .to-row-control { grid-column: auto; } }
.to-row-help { grid-column: 2 / -1; font-size: 0.8125rem; line-height: 1.55; }
@media (min-width: 720px) { .to-row-help { grid-column: auto; padding-block-start: 8px; } }
.to-swatch { position: relative; width: 48px; height: 48px; border-radius: 10px; border: 1px solid var(--color-kumo-line); overflow: hidden; }
.to-swatch:focus-within { outline: 2px solid var(--color-kumo-focus, var(--color-kumo-brand)); outline-offset: 2px; }
.to-swatch input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.to-hex { position: relative; }
.to-hex > *, .to-hex input { width: 100%; }
.to-hex input { padding-inline-end: 36px; }
.to-hex-clear { position: absolute; inset-inline-end: 6px; top: 6px; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 6px; color: var(--text-color-kumo-subtle); background: transparent; border: 0; cursor: pointer; font-size: 16px; line-height: 1; }
.to-hex-clear:hover { background: var(--color-kumo-tint); color: var(--text-color-kumo-default); }
.to-hex-clear:focus-visible { outline: 2px solid var(--color-kumo-focus, var(--color-kumo-brand)); }
.to-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.to-chip { width: 22px; height: 22px; border-radius: 6px; border: 0; cursor: pointer; box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12); }
.to-chip[aria-pressed="true"] { outline: 2px solid var(--text-color-kumo-default); outline-offset: 2px; }
.to-chip:focus-visible { outline: 2px solid var(--color-kumo-focus, var(--color-kumo-brand)); outline-offset: 2px; }
.to-pair { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); padding-block-start: 16px; }
@media (min-width: 720px) { .to-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.to-field { display: grid; gap: 6px; align-content: start; min-width: 0; }
.to-field > * { min-width: 0; }
.to-field [role="combobox"] { width: 100%; min-width: 0; overflow: hidden; }
.to-field [role="combobox"] > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.to-field-help { font-size: 0.8125rem; }
.to-switch { padding-block-start: 22px; display: grid; gap: 4px; }
.to-switch .to-field-help { padding-inline-start: 52px; }
.to-panels { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.to-note { font-size: 0.8125rem; line-height: 1.55; margin-block-start: 18px; }
`;

function ColorField({
	label,
	description,
	value,
	placeholder,
	onChange,
}: {
	label: string;
	description: string;
	value: string;
	placeholder: string;
	onChange: (value: string) => void;
}) {
	const t = useT();
	const id = React.useId();
	const valid = parseHex(value);
	const error = value && !valid ? t("color.invalid", "Use a hex color such as #2563eb.") : undefined;
	const shown = valid ?? placeholder;

	return (
		<div className="to-row">
			<div className="to-swatch" style={{ background: shown }}>
				<input
					type="color"
					aria-label={t("color.picker", "{label} picker", { label })}
					value={shown.length === 7 ? shown : placeholder}
					onChange={(e) => onChange(e.target.value)}
				/>
			</div>
			<label htmlFor={id} className="to-row-label">
				{label}
			</label>
			<div className="to-row-control">
				<div className="to-hex">
					<Input
						id={id}
						aria-label={label}
						value={value}
						placeholder={t("color.default", "Template default ({color})", { color: placeholder })}
						error={error}
						onChange={(e) => onChange(e.target.value)}
					/>
					{value && (
						<button
							type="button"
							className="to-hex-clear"
							aria-label={t("color.clear-label", "Clear {label}", { label })}
							title={t("color.clear", "Clear")}
							onClick={() => onChange("")}
						>
							×
						</button>
					)}
				</div>
				<div
					className="to-chips"
					role="group"
					aria-label={t("color.suggestions", "{label} suggestions", { label })}
				>
					{PRESET_SWATCHES.map((swatch) => (
						<button
							key={swatch}
							type="button"
							className="to-chip"
							title={swatch}
							aria-label={t("color.use", "Use {color}", { color: swatch })}
							aria-pressed={valid === swatch}
							onClick={() => onChange(swatch)}
							style={{ background: swatch }}
						/>
					))}
				</div>
			</div>
			<p className="to-row-help text-kumo-subtle">{description}</p>
		</div>
	);
}

function PreviewPanel({ mode, state }: { mode: "light" | "dark"; state: FormState }) {
	const t = useT();
	const modeLabel = mode === "light" ? t("preview.light", "Light mode") : t("preview.dark", "Dark mode");
	const palette = PALETTE[mode];
	const lightBrand = parseHex(state.brandColor);
	const darkBrand = parseHex(state.brandColorDark) ?? lightBrand;
	const brand = (mode === "light" ? lightBrand : darkBrand) ?? palette.text;
	const onBrand = (mode === "light" ? lightBrand : darkBrand) ? onColor(brand) : palette.onInk;
	const accent = parseHex(state.accentColor) ?? palette.accent;
	const fonts = PREVIEW_FONTS[state.fontPair] ?? PREVIEW_FONTS.classic;
	const corners = CORNER_PRESETS[state.corners]?.tokens ?? {};
	const cardRadius = corners["--radius-lg"] ?? "18px";
	const buttonRadius = corners["--radius-full"] ?? "9999px";
	const button = {
		borderRadius: buttonRadius,
		padding: "10px 18px",
		fontSize: 14,
		fontWeight: 500,
		lineHeight: 1.2,
	};

	return (
		<div
			aria-label={t("preview.label", "{mode} preview", { mode: modeLabel })}
			role="img"
			style={{
				background: state.glows ? `${palette.glow}, ${palette.bg}` : palette.bg,
				color: palette.text,
				fontFamily: fonts.body,
				borderRadius: corners["--radius-sheet"] ?? "20px",
				border: `1px solid ${palette.border}`,
				padding: 24,
				display: "grid",
				gap: 18,
				alignContent: "start",
			}}
		>
			<span
				style={{
					justifySelf: "start",
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
					padding: "4px 10px",
					borderRadius: 9999,
					background: mode === "light" ? "rgb(20 19 18 / 0.06)" : "rgb(255 255 255 / 0.08)",
					color: palette.secondary,
				}}
			>
				{modeLabel}
			</span>
			<div
				style={{
					fontFamily: fonts.display,
					fontWeight: fonts.weight,
					fontSize: 34,
					lineHeight: 1.05,
					letterSpacing: "-0.02em",
				}}
			>
				{t("preview.headline", "Your headline here")}
			</div>
			<p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: palette.secondary }}>
				{t("preview.body", "Body text shows how paragraphs read in this font pair.")}
			</p>
			<div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
				<span style={{ ...button, background: brand, color: onBrand }}>
					{t("preview.primary", "Primary button")}
				</span>
				<span
					style={{
						...button,
						background: palette.surface,
						color: palette.text,
						boxShadow: `inset 0 0 0 1px ${palette.border}`,
					}}
				>
					{t("preview.secondary", "Secondary")}
				</span>
			</div>
			<div
				style={{
					background: `color-mix(in srgb, ${accent} ${mode === "light" ? 8 : 10}%, ${palette.surface})`,
					borderRadius: cardRadius,
					borderInlineStart: `3px solid ${accent}`,
					padding: "14px 16px",
					display: "flex",
					gap: 12,
					alignItems: "flex-start",
				}}
			>
				<span style={{ color: accent, fontSize: 30, lineHeight: 0.9, fontFamily: fonts.display }}>“</span>
				<span style={{ fontSize: 14, lineHeight: 1.55 }}>
					{t("preview.card", "A card with the accent color on its quote mark.")}
				</span>
			</div>
		</div>
	);
}

function ThemeOptionsPage() {
	const t = useT();
	const toastManager = Toast.useToastManager();
	const [saved, setSaved] = React.useState<FormState>();
	const [state, setState] = React.useState<FormState>(DEFAULTS);
	const [loadError, setLoadError] = React.useState<string>();
	const [saving, setSaving] = React.useState(false);

	React.useEffect(() => {
		const load = async () => {
			try {
				const response = await apiFetch(`${API}/settings`);
				const loaded = toFormState(
					await parseApiResponse<ThemeOptions>(response, t("load.error", "Could not load theme options")),
				);
				setSaved(loaded);
				setState(loaded);
			} catch (cause) {
				setLoadError(cause instanceof Error ? cause.message : String(cause));
			}
		};
		void load();
	}, [t]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setState((current) => ({ ...current, [key]: value }));

	const hasErrors = Object.keys(normalizeThemeOptions(state).errors).length > 0;
	const dirty = saved !== undefined && JSON.stringify(saved) !== JSON.stringify(state);

	const save = async () => {
		setSaving(true);
		try {
			const response = await apiFetch(`${API}/save`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(state),
			});
			if (!response.ok) throw new Error(await getErrorMessage(response, t("save.error", "Could not save theme options")));
			const result = await parseApiResponse<{ saved: boolean; values?: ThemeOptions }>(response);
			if (!result.saved || !result.values) throw new Error(t("save.invalid", "Some values are not valid."));
			const next = toFormState(result.values);
			setSaved(next);
			setState(next);
			toastManager.add({ title: t("save.success", "Theme options saved"), type: "success", timeout: 3000 });
		} catch (cause) {
			toastManager.add({
				title: cause instanceof Error ? cause.message : t("save.error", "Could not save theme options"),
				type: "error",
			});
		} finally {
			setSaving(false);
		}
	};

	if (loadError) {
		return (
			<p role="alert" className="text-kumo-danger">
				{loadError}
			</p>
		);
	}
	if (!saved) return <Loader />;

	const colorField = (key: ColorKey, label: string, description: string, placeholder: string) => (
		<ColorField
			label={label}
			description={description}
			value={state[key]}
			placeholder={placeholder}
			onChange={(value) => set(key, value)}
		/>
	);

	return (
		<div className="to-page">
			<style>{STYLES}</style>
			<header className="to-header">
				<div>
					<h1 className="text-2xl font-semibold">{t("title", "Theme Options")}</h1>
					<p className="text-kumo-subtle text-sm">
						{t(
							"intro",
							"Brand colors, fonts and shapes for the public site. Changes apply on the next page load.",
						)}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<LinkButton href="/" external variant="secondary">
						{t("view-site", "View site")}
					</LinkButton>
					<Button variant="secondary" onClick={() => setState(DEFAULTS)} disabled={saving}>
						{t("reset", "Reset to defaults")}
					</Button>
					<Button variant="primary" onClick={() => void save()} disabled={!dirty || hasErrors || saving}>
						{saving ? t("saving", "Saving…") : t("save", "Save")}
					</Button>
				</div>
			</header>

			<div className="to-layout">
				<div className="to-column">
					<section className="to-card" aria-labelledby="to-colors">
						<h2 id="to-colors" className="to-card-title">
							{t("colors.title", "Brand colors")}
						</h2>
						{colorField(
							"brandColor",
							t("brand.label", "Brand color"),
							t("brand.description", "Fills primary buttons and highlights."),
							"#141312",
						)}
						{colorField(
							"brandColorDark",
							t("brand-dark.label", "Dark mode brand"),
							t(
								"brand-dark.description",
								"Optional. Used instead of the brand color when the site is dark.",
							),
							"#f3f2ef",
						)}
						{colorField(
							"accentColor",
							t("accent.label", "Accent color"),
							t("accent.description", "Small marks, such as the testimonial quote mark."),
							"#d97706",
						)}
					</section>

					<section className="to-card" aria-labelledby="to-type">
						<h2 id="to-type" className="to-card-title">
							{t("type.title", "Typography & shape")}
						</h2>
						<div className="to-pair">
							<div className="to-field">
								<Select
									label={t("fonts.label", "Fonts")}
									hideLabel={false}
									value={state.fontPair}
									onValueChange={(value) => set("fontPair", value ?? DEFAULTS.fontPair)}
									items={toItems(t, "fonts", FONT_PAIRS)}
								/>
								<p className="to-field-help text-kumo-subtle">
									{t("fonts.description", "Body and headline fonts for the site.")}
								</p>
							</div>
							<div className="to-field">
								<Select
									label={t("corners.label", "Corners")}
									hideLabel={false}
									value={state.corners}
									onValueChange={(value) => set("corners", value ?? DEFAULTS.corners)}
									items={toItems(t, "corners", CORNER_PRESETS)}
								/>
								<p className="to-field-help text-kumo-subtle">
									{t("corners.description", "Corner rounding for cards, photos and buttons.")}
								</p>
							</div>
						</div>
					</section>

					<section className="to-card" aria-labelledby="to-appearance">
						<h2 id="to-appearance" className="to-card-title">
							{t("appearance.title", "Appearance")}
						</h2>
						<div className="to-pair">
							<div className="to-field">
								<Select
									label={t("scheme.label", "Default color scheme")}
									hideLabel={false}
									value={state.colorScheme}
									onValueChange={(value) =>
										set("colorScheme", value ?? DEFAULTS.colorScheme)
									}
									items={toItems(t, "scheme", COLOR_SCHEMES)}
								/>
								<p className="to-field-help text-kumo-subtle">
									{t(
										"scheme.description",
										"Visitors can still switch with the toggle in the site footer.",
									)}
								</p>
							</div>
							<div className="to-switch">
								<Switch
									label={t("glows.label", "Decorative glows on panels")}
									checked={state.glows}
									onCheckedChange={(checked: boolean) => set("glows", checked)}
								/>
								<p className="to-field-help text-kumo-subtle">
									{t(
										"glows.description",
										"A soft colored glow behind the Features and Stats sections. Turn off for flat backgrounds.",
									)}
								</p>
							</div>
						</div>
					</section>
				</div>

				<section className="to-card to-preview" aria-labelledby="to-preview">
					<h2 id="to-preview" className="to-card-title">
						{t("preview.title", "Preview")}
					</h2>
					<p className="to-card-intro text-kumo-subtle text-sm">
						{t("preview.intro", "How your site looks with the current settings, before you save.")}
					</p>
					<div className="to-panels">
						<PreviewPanel mode="light" state={state} />
						<PreviewPanel mode="dark" state={state} />
					</div>
					<p className="to-note text-kumo-subtle">
						{t(
							"preview.fonts-note",
							"Fonts show here only if they are installed on this computer; the site always loads them.",
						)}
					</p>
				</section>
			</div>
		</div>
	);
}

export const pages: PluginAdminExports["pages"] = {
	"/": ThemeOptionsPage,
};
