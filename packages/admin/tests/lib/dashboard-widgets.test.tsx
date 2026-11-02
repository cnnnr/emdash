import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	DashboardWidgetCard,
	DashboardWidgetGrid,
	useDashboardWidgetLayout,
	type DashboardWidgetRef,
} from "../../src/lib/dashboard-widgets.js";
import { PluginAdminProvider, type PluginAdmins } from "../../src/lib/plugin-context.js";
import { render } from "../utils/render.tsx";

const mockUseCurrentUser = vi.fn();
vi.mock("../../src/lib/api/current-user.js", () => ({
	useCurrentUser: () => mockUseCurrentUser(),
}));

const widgets: DashboardWidgetRef[] = [
	{ id: "visitors", pluginId: "analytics", size: "third" },
	{ id: "leads", pluginId: "analytics", size: "full" },
	{ id: "other", pluginId: "other", size: "full" },
];

function Probe() {
	const layout = useDashboardWidgetLayout();
	return (
		<>
			<span data-testid="visitors">{String(layout.isVisible("analytics", "visitors"))}</span>
			<span data-testid="other">{String(layout.isVisible("other", "other"))}</span>
			<span data-testid="hooked">{String(layout.isHooked(widgets))}</span>
		</>
	);
}

function renderWith(pluginAdmins: PluginAdmins, ui: React.ReactNode) {
	return render(<PluginAdminProvider pluginAdmins={pluginAdmins}>{ui}</PluginAdminProvider>);
}

describe("dashboard widgets hook", () => {
	beforeEach(() => {
		mockUseCurrentUser.mockReturnValue({ data: { role: 20 } });
	});

	it("is vanilla when no plugin uses it", async () => {
		const screen = await renderWith({}, <Probe />);
		await expect.element(screen.getByTestId("visitors")).toHaveTextContent("true");
		await expect.element(screen.getByTestId("other")).toHaveTextContent("true");
		await expect.element(screen.getByTestId("hooked")).toHaveTextContent("false");
	});

	it("hides a card below its minRole and shows it from that role up", async () => {
		const admins: PluginAdmins = {
			analytics: { dashboardWidgets: { visitors: { minRole: "editor" } } },
		};
		const contributor = await renderWith(admins, <Probe />);
		await expect.element(contributor.getByTestId("visitors")).toHaveTextContent("false");
		await expect.element(contributor.getByTestId("other")).toHaveTextContent("true");
		await expect.element(contributor.getByTestId("hooked")).toHaveTextContent("true");
		await contributor.unmount();

		mockUseCurrentUser.mockReturnValue({ data: { role: 40 } });
		const editor = await renderWith(admins, <Probe />);
		await expect.element(editor.getByTestId("visitors")).toHaveTextContent("true");
	});

	it("keeps a role-limited card hidden while the user loads", async () => {
		mockUseCurrentUser.mockReturnValue({ data: undefined });
		const screen = await renderWith(
			{ analytics: { dashboardWidgets: { visitors: { minRole: "contributor" } } } },
			<Probe />,
		);
		await expect.element(screen.getByTestId("visitors")).toHaveTextContent("false");
	});

	it("sizes cards that a plugin shapes and leaves the others at half", async () => {
		const screen = await renderWith(
			{ analytics: { dashboardWidgets: { visitors: {}, leads: {} } } },
			<DashboardWidgetGrid
				widgets={widgets}
				card={(widget) => <p data-testid={`card-${widget.id}`}>{widget.id}</p>}
			/>,
		);
		const wrapperOf = (id: string) => screen.getByTestId(`card-${id}`).element().parentElement;
		expect(wrapperOf("visitors")?.className).toContain("lg:col-span-2");
		expect(wrapperOf("leads")?.className).toContain("lg:col-span-6");
		expect(wrapperOf("other")?.className).toContain("lg:col-span-3");
	});

	it("draws the plugin's actions in the card's title bar", async () => {
		const screen = await renderWith(
			{},
			<DashboardWidgetCard
				title="Visitors"
				extension={{ actions: () => <a href="/go">View Analytics</a> }}
			>
				<p>Body</p>
			</DashboardWidgetCard>,
		);
		await expect.element(screen.getByRole("heading", { name: "Visitors" })).toBeVisible();
		await expect.element(screen.getByRole("link", { name: "View Analytics" })).toBeVisible();
		await expect.element(screen.getByText("Body")).toBeVisible();
	});
});
