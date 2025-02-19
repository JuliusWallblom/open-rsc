import React from "react";
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
			component.toString().includes('"use client"')) ||
		// Check if the component or its prototype has a __componentPath
		(component as { prototype?: { __componentPath?: string } }).prototype
			?.__componentPath !== undefined
	);
}

function wrapClientComponent(
	Component: React.ComponentType<Record<string, unknown>>,
	props: Record<string, unknown>,
) {
	const WrappedComponent: React.FC = () => {
		const { className, style, ...restProps } = props;
		return (
			<div
				data-client-component
				data-component-path={
					(Component as { __componentPath?: string }).__componentPath
				}
				className={className as string}
				style={{ ...(style as React.CSSProperties), display: "contents" }}
			>
				<Component {...restProps} />
			</div>
		);
	};

	return <WrappedComponent />;
}

function replaceClientComponents(
	element: React.ReactNode,
	insideClientComponent = false,
): React.ReactNode {
	if (!React.isValidElement(element)) {
		return element;
	}

	let processedElement = element;
	let isCurrentComponentClient = insideClientComponent;

	// Check if the current element is a function (potential component)
	if (typeof element.type === "function") {
		const Component = element.type as React.ComponentType<unknown>;

		if (isClientComponent(Component) || insideClientComponent) {
			isCurrentComponentClient = true;
		}
	}

	// Process children, passing down the client component status
	const children = React.Children.toArray(processedElement.props.children);
	const processedChildren = children.map((child) =>
		replaceClientComponents(child, isCurrentComponentClient),
	);

	// Create new element with processed children
	if (typeof processedElement.type === "function") {
		const Component = processedElement.type as React.ComponentType<unknown>;
		const processedProps = {
			...processedElement.props,
			children: processedChildren,
		};

		if (isCurrentComponentClient) {
			processedElement = wrapClientComponent(Component, processedProps);
		} else {
			processedElement = React.createElement(Component, processedProps);
		}
	} else if (React.isValidElement(processedElement)) {
		if (!children.every((child, index) => child === processedChildren[index])) {
			processedElement = React.cloneElement(
				processedElement,
				processedElement.props,
				...processedChildren,
			);
		}
	}

	return processedElement;
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

	try {
		element = await (Component as () => Promise<React.ReactElement>)();

		const processedElement = replaceClientComponents(element);

		element = React.isValidElement(processedElement)
			? processedElement
			: element;
	} catch (error) {
		console.error("Error rendering component:", error);
		element = <div>Error rendering component</div>;
	}

	const appHtml = ReactDOMServer.renderToString(<OpenRSC>{element}</OpenRSC>);

	return { html: appHtml, ssr: true, data: null };
}
