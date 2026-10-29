import * as React from "react";
import { describe, expect, it } from "vitest";

import {
	GeneralSettingsTakeover,
	HideTakenOverSettingsLinks,
	useTakenOverClass,
} from "../../src/lib/general-settings-fields.js";
import { PluginAdminProvider } from "../../src/lib/plugin-context.js";
import { render } from "../utils/render.tsx";

function Probe() {
	return (
		<>
			<span data-testid="title">{String(useTakenOverClass("title"))}</span>
			<span data-testid="tagline">{String(useTakenOverClass("tagline"))}</span>
			<GeneralSettingsTakeover />
			<HideTakenOverSettingsLinks />
		</>
	);
}

describe("general settings fields hook", () => {
	it("is vanilla when no plugin uses it", async () => {
		const screen = await render(
			<PluginAdminProvider pluginAdmins={{}}>
				<Probe />
			</PluginAdminProvider>,
		);
		await expect.element(screen.getByTestId("title")).toHaveTextContent("undefined");
		await expect.element(screen.getByTestId("tagline")).toHaveTextContent("undefined");
	});

	it("hides the named fields and draws the plugin's component", async () => {
		const screen = await render(
			<PluginAdminProvider
				pluginAdmins={{
					p: {
						generalSettingsFields: [
							{ fields: ["title"], component: () => <p>Edited elsewhere</p> },
						],
					},
				}}
			>
				<Probe />
			</PluginAdminProvider>,
		);
		await expect.element(screen.getByTestId("title")).toHaveTextContent("hidden");
		await expect.element(screen.getByTestId("tagline")).toHaveTextContent("undefined");
		await expect.element(screen.getByText("Edited elsewhere")).toBeInTheDocument();
	});

	it("hides the Social Links row when a plugin takes over social", async () => {
		const vanilla = await render(
			<PluginAdminProvider pluginAdmins={{}}>
				<HideTakenOverSettingsLinks />
			</PluginAdminProvider>,
		);
		expect(vanilla.container.querySelector("style")).toBeNull();
		const taken = await render(
			<PluginAdminProvider pluginAdmins={{ p: { generalSettingsFields: [{ fields: ["social"] }] } }}>
				<HideTakenOverSettingsLinks />
			</PluginAdminProvider>,
		);
		expect(taken.container.querySelector("style")?.textContent).toContain("/settings/social");
	});
});
