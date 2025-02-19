import Layout from "../layout";
import { createElement } from "react";
import ReactDOM from "react-dom/client";

async function hydrate() {
	const clientComponents = document.querySelectorAll("[data-client-component]");
	for (const container of clientComponents) {
		const componentPath = container.getAttribute("data-component-path");
		if (componentPath) {
			const module = await import(/* @vite-ignore */ componentPath);
			const Component = module.default;
			ReactDOM.hydrateRoot(
				container,
				<Layout>{createElement(Component)}</Layout>,
			);
		}
	}
}

const rootElement = document.getElementById("root");
if (rootElement) {
	hydrate();
}
