import fs from "node:fs/promises";
import Router from "@koa/router";
import Koa from "koa";

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

// Create Koa app
const app = new Koa();
const router = new Router();

// Add Vite or respective production middlewares
let vite;
if (!isProduction) {
	const { createServer } = await import("vite");
	vite = await createServer({
		server: { middlewareMode: true },
		appType: "custom",
		base,
	});
	// Adapt Vite middleware for Koa
	app.use(async (ctx, next) => {
		const middleware = vite.middlewares;
		await new Promise((resolve) => {
			middleware(ctx.req, ctx.res, resolve);
		});
		await next();
	});
} else {
	const compress = (await import("koa-compress")).default;
	const serve = (await import("koa-static")).default;
	app.use(compress());
	app.use(serve("./dist/client"));
}

router.get("(.*)", async (ctx) => {
	try {
		const url = ctx.url;
		let template;
		let render;
		if (!isProduction) {
			template = await fs.readFile("./index.html", "utf-8");
			template = await vite.transformIndexHtml(url, template);
			render = (await vite.ssrLoadModule("/src/open-rsc/renderer/index.tsx"))
				.render;
		} else {
			template = templateHtml;
			render = (await import("./dist/server/entry-server.js")).render;
		}

		const { html: appHtml, ssr: shouldSSR } = await render(url, ssrManifest);

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

		ctx.type = "html";
		ctx.body = html;
	} catch (e) {
		vite?.ssrFixStacktrace(e);
		console.log(e.stack);
		ctx.status = 500;
		ctx.body = e.stack;
	}
});

app.use(router.routes()).use(router.allowedMethods());

// Start http server
app.listen(port, () => {
	console.log(`Open-RSC started at http://localhost:${port}`);
});
