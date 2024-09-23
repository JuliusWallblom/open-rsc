import type { Route } from "./router";
import { RSCRouter } from "./router";

interface AppProps {
	routes?: Route[];
	children?: React.ReactNode;
}

export function OpenRSC({ routes, children }: AppProps) {
	return children || <RSCRouter routes={routes} />;
}
