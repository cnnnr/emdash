/**
 * User actions hook: the `userActions` slot on PluginAdminModule.
 *
 * A plugin draws an action for each user: a fixed last column on the Users list (`placement: "row"`) and
 * a button in the user dialog's footer (`placement: "dialog"`). It gets the user and decides what to draw
 * (nothing is fine: the column cell just stays empty). Clicks in the column don't open the row.
 * With no plugin using the slot there is no extra column and the Users screens are EmDash's own.
 *
 * emdash-suite hook: user-actions
 */

import * as React from "react";

import type { UserDetail, UserListItem } from "./api";
import { useEnabledPluginAdmins } from "./enabled-plugin-admins.js";

export interface UserActionProps {
	/** The user the action is for. */
	user: Pick<UserListItem, "id" | "email" | "name" | "role" | "disabled">;
	/** Where it is drawn: a Users list row, or the user dialog's footer. */
	placement: "row" | "dialog";
}

/** What a plugin exports as `userActions`. */
export type UserActionsExtension = React.ComponentType<UserActionProps>;

function useUserActions(): [string, UserActionsExtension][] {
	const admins = useEnabledPluginAdmins();
	return Object.entries(admins).flatMap(([id, admin]) => (admin.userActions ? [[id, admin.userActions] as [string, UserActionsExtension]] : []));
}

/** The Users list's extra header cell, or nothing. */
export function UserActionsHead() {
	return useUserActions().length > 0 ? <th scope="col" className="w-px px-4 py-3" /> : null;
}

/** A Users list row's extra cell, or nothing. */
export function UserActionsCell({ user }: { user: UserListItem }) {
	const actions = useUserActions();
	if (actions.length === 0) return null;
	return (
		<td className="px-4 py-3 text-end" onClick={(e) => e.stopPropagation()}>
			<div className="flex justify-end gap-2">
				{actions.map(([id, Action]) => (
					<Action key={id} user={user} placement="row" />
				))}
			</div>
		</td>
	);
}

/** The user dialog footer's extra buttons, or nothing. */
export function UserActionsDialog({ user }: { user: UserDetail }) {
	return (
		<>
			{useUserActions().map(([id, Action]) => (
				<Action key={id} user={user} placement="dialog" />
			))}
		</>
	);
}
