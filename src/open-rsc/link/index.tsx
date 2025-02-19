import type { MouseEvent, ReactNode } from "react";

import { useCallback } from "react";

export interface LinkProps {
	href: string;
	children: ReactNode;
	className?: string;
}

export default function Link({ href, children, className }: LinkProps) {
	const handleClick = useCallback(
		(e: MouseEvent<HTMLAnchorElement>) => {
			const currentUrl = new URL(window.location.href);
			const targetUrl = new URL(href, window.location.origin);

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
				window.history.pushState({}, "", href);
				window.dispatchEvent(
					new CustomEvent("routeChange", { detail: { path: href } }),
				);
			}
		},
		[href],
	);

	return (
		<a href={href} onClick={handleClick} className={className}>
			{children}
		</a>
	);
}
