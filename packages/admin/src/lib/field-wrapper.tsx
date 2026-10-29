/**
 * Field wrapper hook: the `fieldWrapper` slot on PluginAdminModule.
 *
 * A trusted plugin can wrap every field of the content editor's main column: it receives the field's
 * editor as `children` and draws it with extras (a badge, an action) next to it, and it gets the
 * whole form's values and a way to change any field. With no plugin exporting the slot (or none for
 * the collection) a field is drawn exactly as before.
 *
 * emdash-suite hook: field-wrapper
 */

import * as React from "react";

import type { FieldDescriptor } from "../components/ContentEditor.js";
import { PluginFieldErrorBoundary } from "../components/PluginFieldErrorBoundary.js";
import { usePluginAdmins } from "./plugin-context.js";

export interface FieldWrapperProps {
	collection: string;
	/** The field's slug. */
	name: string;
	field: FieldDescriptor;
	/** Every field's current value in the form. */
	values: Record<string, unknown>;
	/** Change any field's value in the form. */
	onChange: (name: string, value: unknown) => void;
	/** The field's own editor. */
	children: React.ReactNode;
}

export interface FieldWrapperExtension {
	/** Restrict the wrapper to these collections. Omit for every collection. */
	collections?: readonly string[];
	component: React.ComponentType<FieldWrapperProps>;
}

/** The wrappers that apply to a collection, in plugin order. */
export function useFieldWrappers(collection: string): FieldWrapperExtension[] {
	const admins = usePluginAdmins();
	return Object.values(admins)
		.flatMap((admin) => admin.fieldWrappers ?? [])
		.filter((wrapper) => !wrapper.collections || wrapper.collections.includes(collection));
}

/** A field's editor inside each wrapper (the first wrapper is the outermost); the editor itself when there are none. */
export function wrapField(
	wrappers: readonly FieldWrapperExtension[],
	props: Omit<FieldWrapperProps, "children">,
	editor: React.ReactNode,
	key: string,
): React.ReactNode {
	if (wrappers.length === 0) return editor;
	return (
		<React.Fragment key={key}>
			{wrappers.reduceRight<React.ReactNode>(
				(inner, wrapper) => (
					<PluginFieldErrorBoundary fieldKind={props.field.kind}>
						<wrapper.component {...props}>{inner}</wrapper.component>
					</PluginFieldErrorBoundary>
				),
				editor,
			)}
		</React.Fragment>
	);
}
