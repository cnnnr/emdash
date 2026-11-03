// Main App
export { AdminApp, default as App } from "./App";

// Router
export { createAdminRouter, Link, useNavigate, useParams } from "./router";

// Components
export * from "./components";

// API client
export * from "./lib/api";

// The code editor (CodeMirror, loaded on first use) for plugins. emdash-suite hook: code-editor
export { EmbedCodeEditor } from "./components/editor/EmbedBlockShell"; // emdash-suite hook: code-editor
export type { CodeEditorProps, CodeEditorLanguage } from "./components/editor/CodeEditor"; // emdash-suite hook: code-editor

// Plugin admin modules of the enabled plugins only, for plugins that read each other's admin exports. emdash-suite hook: enabled-plugin-admins
export { useEnabledPluginAdmins } from "./lib/enabled-plugin-admins"; // emdash-suite hook: enabled-plugin-admins

// Utilities
export { cn } from "./lib/utils";

export {
	type ContentEditorPanelContext,
	type ContentEditorPanelExtension,
} from "./lib/content-editor-panels";

// Plugin admin context (for accessing plugin components)
export {
	PluginAdminProvider,
	usePluginAdmins,
	usePluginWidget,
	usePluginPage,
	usePluginField,
	usePluginHasPages,
	usePluginHasWidgets,
	type PluginAdminModule,
	type PluginAdmins,
} from "./lib/plugin-context";

export type {
	ContentListColumnHeaderContext,
	ContentListColumnCellContext,
	ContentListColumnExtension,
} from "./lib/content-list-columns.js";

// Auth provider context (for accessing pluggable auth provider components)
export {
	AuthProviderProvider,
	useAuthProviders,
	useAuthProviderList,
	type AuthProviderModule,
	type AuthProviders,
} from "./lib/auth-provider-context";

// Admin branding context (for accessing configured white-label logo/site name)
export type { AdminBranding } from "./lib/admin-branding-context";

// Locales
export {
	useLocale,
	SUPPORTED_LOCALES,
	SUPPORTED_LOCALE_CODES,
	DEFAULT_LOCALE,
	resolveLocale,
} from "./locales/index.js";
export type { SupportedLocale } from "./locales/index.js";
