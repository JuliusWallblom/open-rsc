"use client";

import type { MouseEvent, ReactNode } from "react";
import { useCallback } from "react";

export interface LinkProps {
	to: string;
	children: ReactNode;
}

export function Link({ to, children }: LinkProps) {
	const handleClick = useCallback(
		(e: MouseEvent<HTMLAnchorElement>) => {
			const currentUrl = new URL(window.location.href);
			const targetUrl = new URL(to, window.location.origin);

			// Compare the full URLs, ignoring trailing slashes
			if (
				currentUrl.pathname.replace(/\/$/, "") ===
					targetUrl.pathname.replace(/\/$/, "") &&
				currentUrl.search === targetUrl.search
			) {
				e.preventDefault();
				return;
			}

			const isServerRendered = !document
				.getElementById("root")
				?.hasAttribute("data-ssr-complete");

			if (!isServerRendered) {
				e.preventDefault();
				window.history.pushState({}, "", to);
				window.dispatchEvent(
					new CustomEvent("routeChange", { detail: { path: to } }),
				);
			}
		},
		[to],
	);

	return (
		<a href={to} onClick={handleClick}>
			{children}
		</a>
	);
}
