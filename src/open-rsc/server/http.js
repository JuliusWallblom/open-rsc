import fs from "node:fs/promises";
import http from "node:http";
import { URL } from "node:url";

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

// Create http server
const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host}`);
		let vite;
		let template;
		let render;

		if (!isProduction) {
			const { createServer } = await import("vite");
			vite = await createServer({
				server: { middlewareMode: true },
				appType: "custom",
				base,
			});

			// Use Vite's connect middleware
			await new Promise((resolve) => {
				vite.middlewares.handle(req, res, resolve);
			});

			template = await fs.readFile("./index.html", "utf-8");
			template = await vite.transformIndexHtml(url.pathname, template);
			render = (await vite.ssrLoadModule("/src/open-rsc/renderer/index.tsx"))
				.render;
		} else {
			const compression = (await import("compression")).default;
			const sirv = (await import("sirv")).default;

			// Apply compression
			await new Promise((resolve) => {
				compression()(req, res, resolve);
			});

			// Serve static files
			const staticHandler = sirv("./dist/client", { extensions: [] });
			await new Promise((resolve) => {
				staticHandler(req, res, resolve);
			});

			template = templateHtml;
			render = (await import("./dist/server/entry-server.js")).render;
		}

		const { html: appHtml, ssr: shouldSSR } = await render(
			url.pathname,
			ssrManifest,
		);

		let finalHtml = appHtml;

		if (shouldSSR) {
			finalHtml = finalHtml.replace(
				'<div id="root">',
				'<div id="root" data-ssr-complete="true">',
			);
		}

		const html = template
			.replace("<!--app-head-->", "")
			.replace("<!--app-html-->", finalHtml);

		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	} catch (e) {
		console.error(e.stack);
		res.writeHead(500, { "Content-Type": "text/plain" });
		res.end(e.stack);
	}
});

// Start http server
server.listen(port, () => {
	console.log(`Open-RSC started at http://localhost:${port}`);
});
