import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

// Constants
const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;
const base = process.env.BASE || "/";

// Cached production assets
const templateHtml = isProduction
	? await fs.readFile("./dist/client/index.html", "utf-8")
	: "";
const ssrManifest = isProduction
	? await fs.readFile("./dist/client/.vite/ssr-manifest.json", "utf-8")
	: undefined;

// Create Hono app
const app = new Hono();

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
	const { createServer } = await import("vite");
	vite = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
		base,
	});

	// Adapt Vite middleware for Hono
	app.use("*", async (c, next) => {
		const middleware = vite.middlewares;
		await new Promise((resolve) => {
			const mockReq = {
				url: c.req.url,
				method: c.req.method,
				headers: c.req.raw.headers,
				// Add other properties as needed
			};
			const mockRes = {
				setHeader: (name, value) => c.header(name, value),
				end: (chunk) => {
					if (chunk) c.res.body = chunk;
					resolve();
				},
				// Add other methods as needed
			};
			middleware(mockReq, mockRes, resolve);
		});
		await next();
	});
} else {
	const { default: compress } = await import("@hono/compress");
	const { serveStatic } = await import("@hono/node-server/serve-static");
	app.use(compress());
	app.use("*", serveStatic({ root: "./dist/client" }));
}

app.get("*", async (c) => {
	const url = new URL(c.req.url);

	// Skip Vite-specific routes in development
	if (
		!isProduction &&
		(url.pathname.startsWith("/@") || url.pathname.includes("."))
	) {
		return c.body(null);
	}

	try {
		let template;
		let render;
		if (!isProduction) {
			template = await fs.readFile("./index.html", "utf-8");
			template = await vite.transformIndexHtml(url.pathname, template);
			render = (await vite.ssrLoadModule("/src/open-rsc/renderer/index.tsx"))
				.render;
		} else {
			template = templateHtml;
			render = (await import("./dist/server/entry-server.js")).render;
		}

		const { html: appHtml, ssr: shouldSSR } = await render(
			url.pathname,
			ssrManifest,
		);

		let finalHtml = appHtml;

		if (shouldSSR) {
			// Add the data-ssr-complete attribute to the root element
			finalHtml = finalHtml.replace(
				'<div id="root">',
				'<div id="root" data-ssr-complete="true">',
			);
		}

		const html = template
			.replace("<!--app-head-->", "")
			.replace("<!--app-html-->", finalHtml);

		return c.html(html);
	} catch (e) {
		vite?.ssrFixStacktrace(e);
		console.log(e.stack);
		return c.text(e.stack, 500);
	}
});

// Start http server
serve(
	{
		fetch: app.fetch,
		port,
	},
	(info) => {
		console.log(`Open-RSC started at http://localhost:${info.port}`);
	},
);
