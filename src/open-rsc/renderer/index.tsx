import React, { createElement } from "react";
import ReactDOMServer from "react-dom/server";
import { OpenRSC } from "..";
import { routes } from "../routes";

type ModuleType = {
	default?: React.ComponentType<unknown> | (() => Promise<React.ReactElement>);
	__componentPath?: string;
	[key: string]: unknown;
};

function isClientComponent(
	component: React.ComponentType<unknown> | (() => Promise<React.ReactElement>),
): boolean {
	return (
		(component as { __componentPath?: string }).__componentPath !== undefined ||
		(typeof component.toString === "function" &&
			component.toString().includes('"use client"'))
	);
}

function wrapClientComponent(
	Component: React.ComponentType<unknown>,
	props: Record<string, unknown>,
) {
	const WrappedComponent: React.FC<Record<string, unknown>> = (
		componentProps,
	) => (
		<div
			data-client-component
			data-component-path={
				(Component as { __componentPath?: string }).__componentPath
			}
		>
			{createElement(Component, componentProps)}
		</div>
	);
	return <WrappedComponent {...props} />;
}

function replaceClientComponents(
	element: React.ReactElement,
): React.ReactElement {
	if (typeof element.type === "function" && isClientComponent(element.type)) {
		return wrapClientComponent(
			element.type as React.ComponentType<unknown>,
			element.props,
		);
	}

	const children = React.Children.map(element.props.children, (child) => {
		if (React.isValidElement(child)) {
			return replaceClientComponents(child);
		}
		return child;
	});

	return React.cloneElement(element, {}, children);
}

export async function render(url: string) {
	const route = routes.find((r) => r.path === url || r.path === "*");

	if (!route) {
		console.log(`No matching route found for ${url}`);
		return { html: "", ssr: false, data: null };
	}

	const module = (await route.component()) as ModuleType;
	const Component =
		module.default ||
		(Object.values(module).find((value) => typeof value === "function") as
			| React.ComponentType<unknown>
			| (() => Promise<React.ReactElement>)
			| undefined);

	if (!Component) {
		return { html: "", ssr: false, data: null };
	}

	let element: React.ReactElement;

	element = await (Component as () => Promise<React.ReactElement>)();

	element = replaceClientComponents(element);

	const appHtml = ReactDOMServer.renderToString(<OpenRSC>{element}</OpenRSC>);

	return { html: appHtml, ssr: true, data: null };
}
