import * as React from "react";
import { describe, expect, it } from "vitest";

import { EmailSettingsActions, EmailSettingsSections, EmailSettingsStatus } from "../../src/lib/email-settings.js";
import { PluginAdminProvider } from "../../src/lib/plugin-context.js";
import { render } from "../utils/render.tsx";

function Probe() {
	return (
		<>
			<EmailSettingsSections />
			<EmailSettingsActions />
			<EmailSettingsStatus />
		</>
	);
}

describe("email settings hook", () => {
	it("draws nothing when no plugin uses it", async () => {
		const screen = await render(
			<PluginAdminProvider pluginAdmins={{}}>
				<Probe />
			</PluginAdminProvider>,
		);
		expect(screen.container.innerHTML).toBe("");
	});

	it("draws a plugin's sections and header actions", async () => {
		const screen = await render(
			<PluginAdminProvider
				pluginAdmins={{
					p: { emailSettings: { sections: () => <p>Provider</p>, actions: () => <button>Sent Log</button>, status: () => <p>Email Active</p> } },
				}}
			>
				<Probe />
			</PluginAdminProvider>,
		);
		await expect.element(screen.getByText("Provider")).toBeInTheDocument();
		await expect.element(screen.getByRole("button", { name: "Sent Log" })).toBeInTheDocument();
		await expect.element(screen.getByText("Email Active")).toBeInTheDocument();
		expect(screen.container.querySelector("style")?.textContent).toContain("emdash-email-status");
	});
});
