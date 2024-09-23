import path from "node:path";
import type { Plugin } from "vite";

const useClientDirectivePlugin: Plugin = {
	name: "use-client-plugin",
	transform(code, id) {
		if (id.endsWith(".tsx") || id.endsWith(".ts")) {
			if (code.includes('"use client"') || code.includes("'use client'")) {
				const relativePath = `/${path
					.relative(process.cwd(), id)
					.replace(/\\/g, "/")}`;
				return {
					code: `
              ${code.replace(/"use client"/, "").replace(/'use client'/, "")}
              if (typeof __vite_ssr_exports__ !== 'undefined') {
                if (typeof __vite_ssr_exports__.default === 'function') {
                  __vite_ssr_exports__.default.__componentPath = '${relativePath}';
                }
              } else if (typeof exports !== 'undefined') {
                if (typeof exports.default === 'function') {
                  exports.default.__componentPath = '${relativePath}';
                }
              }
            `,
					map: null,
				};
			}
		}
	},
};

export default useClientDirectivePlugin;
