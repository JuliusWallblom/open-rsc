import { createElement, useCallback, useEffect, useRef, useState } from "react";
import type { ComponentType, FC, ReactElement } from "react";

export type ComponentModule = {
	[key: string]:
		| ComponentType<unknown>
		| boolean
		| undefined
		| (() => Promise<ReactElement>)
		| string;
	default?: ComponentType<unknown> | (() => Promise<ReactElement>);
	__componentPath?: string;
};

export interface Route {
	path: string;
	component: () => Promise<ComponentModule>;
}

interface RouterProps {
	routes?: Route[];
}

export const RSCRouter: FC<RouterProps> = ({ routes }) => {
	const [currentPath, setCurrentPath] = useState(window.location.pathname);
	const [Component, setComponent] = useState<ReactElement | null>(null);
	const isInitialRenderRef = useRef(true);
	const isServerRendered = useRef(
		document.getElementById("root")?.hasAttribute("data-ssr-complete") || false,
	);

	const loadComponent = useCallback(
		async (path: string) => {
			const route = routes?.find((r) => r.path === path);
			if (route) {
				const module = await route.component();
				const LoadedComponent =
					module.default ||
					(Object.values(module).find(
						(value) => typeof value === "function",
					) as ComponentType<unknown>);

				if (LoadedComponent) {
					if (LoadedComponent.constructor.name === "AsyncFunction") {
						const asyncElement = await (
							LoadedComponent as () => Promise<ReactElement>
						)();
						setComponent(asyncElement);
					} else {
						setComponent(
							createElement(LoadedComponent as ComponentType<unknown>),
						);
					}
				} else {
					setComponent(<div>404 - Not Found</div>);
				}
			} else {
				setComponent(<div>404 - Not Found</div>);
			}
		},
		[routes],
	);

	useEffect(() => {
		const handleRouteChange = (event: Event) => {
			const customEvent = event as CustomEvent<{ path: string }>;
			setCurrentPath(customEvent.detail.path);
		};

		const handlePopState = () => {
			setCurrentPath(window.location.pathname);
		};

		window.addEventListener("routeChange", handleRouteChange);
		window.addEventListener("popstate", handlePopState);

		return () => {
			window.removeEventListener("routeChange", handleRouteChange);
			window.removeEventListener("popstate", handlePopState);
		};
	}, []);

	useEffect(() => {
		if (!isInitialRenderRef.current || !isServerRendered.current) {
			loadComponent(currentPath);
		}
		isInitialRenderRef.current = false;
	}, [currentPath, loadComponent]);

	if (isServerRendered.current && isInitialRenderRef.current) {
		return null;
	}

	return Component;
};
