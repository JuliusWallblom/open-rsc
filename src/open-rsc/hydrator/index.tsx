import { createElement } from "react";
import ReactDOM from "react-dom/client";

async function hydrate() {
	const clientComponents = document.querySelectorAll("[data-client-component]");
	for (const container of clientComponents) {
		const componentPath = container.getAttribute("data-component-path");
		if (componentPath) {
			const module = await import(componentPath);
			const Component = module.default;
			ReactDOM.hydrateRoot(container, createElement(Component));
		}
	}
}

const rootElement = document.getElementById("root");
if (rootElement) {
	hydrate();
}
