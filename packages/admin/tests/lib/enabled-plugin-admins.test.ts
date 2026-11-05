import { describe, expect, it } from "vitest";

import { filterEnabledPluginAdmins, isPluginAvailable } from "../../src/lib/enabled-plugin-admins";
import type { PluginAdmins } from "../../src/lib/plugin-context";

const admins = { on: { nestedFieldEditors: [] }, off: { nestedFieldEditors: [] }, unknown: {} } as unknown as PluginAdmins;

describe("filterEnabledPluginAdmins", () => {
	it("keeps only plugins the manifest lists as enabled", () => {
		const result = filterEnabledPluginAdmins(admins, { on: { enabled: true }, off: { enabled: false } });
		expect(Object.keys(result)).toEqual(["on"]);
	});

	it("treats a plugin with no enabled flag as on, and one the manifest doesn't list as off", () => {
		expect(Object.keys(filterEnabledPluginAdmins(admins, { on: {}, off: { enabled: false }, unknown: {} }))).toEqual(["on", "unknown"]);
		expect(Object.keys(filterEnabledPluginAdmins(admins, {}))).toEqual([]);
	});

	it("filters nothing until the manifest has loaded", () => {
		expect(filterEnabledPluginAdmins(admins, undefined)).toBe(admins);
	});
});

describe("isPluginAvailable", () => {
	it("is false for a plugin the manifest leaves out or disables, true for one it lists", () => {
		expect(isPluginAvailable({ on: { enabled: true }, off: { enabled: false } }, "on")).toBe(true);
		expect(isPluginAvailable({ on: {} }, "on")).toBe(true);
		expect(isPluginAvailable({ off: { enabled: false } }, "off")).toBe(false);
		expect(isPluginAvailable({}, "gone")).toBe(false);
	});

	it("is true until the manifest has loaded", () => {
		expect(isPluginAvailable(undefined, "any")).toBe(true);
	});
});
