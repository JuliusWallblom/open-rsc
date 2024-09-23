#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import stripJsonComments from "strip-json-comments";

const greenCheckmark = '\x1b[32m✓\x1b[0m';

async function askQuestion(query) {
  const answer = await inquirer.prompt([
    {
      type: "input",
      name: "result",
      message: query,
    },
  ]);
  return answer.result.toLowerCase().trim();
}

async function selectOption(question, options) {
  const answer = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: question,
      choices: options,
    },
  ]);
  return answer.selected;
}

function updateTsConfigNode(hasSrcDir) {
  const tsConfigNodePath = path.join(process.cwd(), "tsconfig.node.json");
  if (fs.existsSync(tsConfigNodePath)) {
    try {
      const fileContent = fs.readFileSync(tsConfigNodePath, "utf8");

      // Strip comments and parse
      const strippedContent = stripJsonComments(fileContent);
      const tsConfigNode = JSON.parse(strippedContent);

      const pluginPath = hasSrcDir
        ? "src/open-rsc/plugin/vite/index.ts"
        : "open-rsc/plugin/vite/index.ts";

      if (!Array.isArray(tsConfigNode.include)) {
        tsConfigNode.include = [];
      }

      if (!tsConfigNode.include.includes(pluginPath)) {
        tsConfigNode.include.push(pluginPath);
      }

      // Write back without stripping comments
      fs.writeFileSync(tsConfigNodePath, JSON.stringify(tsConfigNode, null, 2));
      console.log(`${greenCheckmark} tsconfig.node.json has been configured successfully`);
    } catch (error) {
      console.error("Error parsing tsconfig.node.json:", error);
      console.error("File path:", tsConfigNodePath);
      throw error; // Re-throw the error to stop the execution
    }
  } else {
    console.warn("tsconfig.node.json not found. Skipping update.");
  }
}

function updateViteConfig(hasSrcDir) {
  const viteConfigPath = path.join(process.cwd(), "vite.config.ts");
  if (fs.existsSync(viteConfigPath)) {
    let viteConfig = fs.readFileSync(viteConfigPath, "utf8");
    const pluginPath = hasSrcDir
      ? "./src/open-rsc/plugin/vite"
      : "./open-rsc/plugin/vite";

    // Add import if it doesn't exist
    if (!viteConfig.includes("useClientDirectivePlugin")) {
      viteConfig = `import useClientDirectivePlugin from '${pluginPath}';\n${viteConfig}`;
    }

    // Add plugin to the plugins array
    if (viteConfig.includes("plugins:")) {
      viteConfig = viteConfig.replace(
        /plugins:\s*\[([\s\S]*?)\]/,
        (match, pluginsContent) => {
          if (!pluginsContent.includes("useClientDirectivePlugin")) {
            return `plugins: [${pluginsContent}${
              pluginsContent.trim() ? "," : ""
            } useClientDirectivePlugin]`;
          }
          return match;
        }
      );
    } else {
      // If plugins array doesn't exist, add it
      viteConfig = viteConfig.replace(
        /export\s+default\s+defineConfig\(\{/,
        "export default defineConfig({\n  plugins: [useClientDirectivePlugin],"
      );
    }

    fs.writeFileSync(viteConfigPath, viteConfig);
    console.log(`${greenCheckmark} vite.config.ts has been configured successfully`);
  } else {
    console.warn("vite.config.ts not found. Skipping update.");
  }
}

function updateIndexHtml(hasSrcDir) {
  const indexHtmlPath = path.join(process.cwd(), "index.html");
  if (fs.existsSync(indexHtmlPath)) {
    let content = fs.readFileSync(indexHtmlPath, "utf8");

    // Add lines to head with proper indentation and new line
    content = content.replace(/<head>([\s\S]*?)<\/head>/, (match, p1) => {
      const indent = p1.match(/^\s*/)[0]; // Get the existing indentation
      return `<head>
${indent}${p1.trim()}
${indent}<!--app-head-->
${indent}<!--ssr-marker-->
  </head>`;
    });

    // Update div with id "root"
    content = content.replace(
      /<div id="root"><\/div>/,
      '<div id="root"><!--app-html--></div>'
    );

    // Update script src
    const scriptSrc = hasSrcDir
      ? "/src/open-rsc/hydration/index.tsx"
      : "/open-rsc/hydration/index.tsx";
    content = content.replace(
      /<script type="module" src="\/src\/main\.tsx"><\/script>/,
      `<script type="module" src="${scriptSrc}"></script>`
    );

    // Remove any extra blank lines
    content = content.replace(/^\s*$(?:\r\n?|\n)/gm, "");

    fs.writeFileSync(indexHtmlPath, content);
    console.log(`${greenCheckmark} index.html has been configured successfully`);
  } else {
    console.warn("index.html not found. Skipping update.");
  }
}

async function updatePackageJson(serverFramework) {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    // Add @types/node as a dev dependency
    packageJson.devDependencies["@types/node"] = "^22.5.5"; // You can adjust the version as needed

    if (serverFramework === "express" && !packageJson.dependencies.express) {
      packageJson.dependencies.express = "^4.17.1"; // You can adjust the version as needed
    } else if (serverFramework === "koa") {
      if (!packageJson.dependencies.koa) {
        packageJson.dependencies.koa = "^2.13.1"; // You can adjust the version as needed
      }
      if (!packageJson.dependencies["@koa/router"]) {
        packageJson.dependencies["@koa/router"] = "^10.1.1"; // You can adjust the version as needed
      }
    } else if (serverFramework === "hono") {
      if (!packageJson.dependencies.hono) {
        packageJson.dependencies.hono = "^4.6.2"; // You can adjust the version as needed
      }
      if (!packageJson.dependencies["@hono/node-server"]) {
        packageJson.dependencies["@hono/node-server"] = "^1.13.1"; // You can adjust the version as needed
      }
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(
      `Updated package.json with ${serverFramework} dependencies and @types/node`
    );

    // Install the new dependencies
    console.log(
      `Installing ${serverFramework} dependencies and @types/node...`
    );
    execSync("npm install", { stdio: "inherit" });
    execSync("npm install --save-dev @types/node", { stdio: "inherit" });
  } else {
    console.warn("package.json not found. Skipping dependency update.");
  }
}

function copyFileOrDir(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const childItemName of fs.readdirSync(src)) {
      copyFileOrDir(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    }
  } else if (stats.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

function updatePackageJsonScript(hasSrcDir) {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }

      const serverPath = hasSrcDir ? "src/open-rsc/server" : "open-rsc/server";
      packageJson.scripts.dev = `node ${serverPath}`;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(`${greenCheckmark} 'dev' script has been configured successfully`);
    } catch (error) {
      console.error("Error updating package.json:", error);
    }
  } else {
    console.warn("package.json not found. Skipping script update.");
  }
}

async function init() {
  console.log("Initializing open-rsc...");

  const packageName = "open-rsc";
  const targetDir = process.cwd();

  // Ask questions
  const hasSrcDir = await askQuestion(
    "Do you want to install OpenRSC in the src directory? (y/n): "
  );

  const serverFramework = await selectOption(
    "Which server framework would you like to use?",
    ["hono", "express", "koa", "http"]
  );

  // Ask for routes.ts location
  const routesLocation = await askQuestion(
    'Where would you like to place the route configuration file? (relative to project root, e.g., "src" or "src/router"): '
  );

  const installDir =
    hasSrcDir === "y" ? path.join(targetDir, "src") : targetDir;

  if (
    serverFramework === "hono" ||
    serverFramework === "express" ||
    serverFramework === "koa"
  ) {
    await updatePackageJson(serverFramework);
  }

  const routesDir = path.join(targetDir, routesLocation);

  // Create a temporary directory
  const tempDir = fs.mkdtempSync("open-rsc-temp-");

  try {
    // Download the package to the temporary directory
    console.log("Downloading open-rsc...");
    execSync(`npm pack ${packageName}`, { cwd: tempDir, stdio: "inherit" });

    // Find the downloaded tarball
    const tarball = fs
      .readdirSync(tempDir)
      .find((file) => file.startsWith(packageName) && file.endsWith(".tgz"));

    if (!tarball) {
      throw new Error("Could not find downloaded package");
    }

    // Extract the tarball
    console.log("Extracting package...");
    execSync(`tar -xzf ${tarball}`, { cwd: tempDir, stdio: "inherit" });

    // Copy the open-rsc folder to the target directory
    console.log("Installing OpenRSC...");
    const openRscPath = path.join(tempDir, "package", "src", "open-rsc");
    if (fs.existsSync(openRscPath)) {
      const destPath = path.join(installDir, "open-rsc");
      fs.mkdirSync(destPath, { recursive: true });

      // Copy all files and directories except the 'server' directory and 'routes.ts'
      for (const item of fs.readdirSync(openRscPath)) {
        if (item !== "server" && item !== "routes.ts") {
          const srcItem = path.join(openRscPath, item);
          const destItem = path.join(destPath, item);
          copyFileOrDir(srcItem, destItem);
        }
      }

      // Copy the selected server file from the 'server' directory
      const serverDir = path.join(openRscPath, "server");
      const serverSrcPath = path.join(serverDir, `${serverFramework}.js`);
      const serverDestPath = path.join(destPath, "server.js");
      if (fs.existsSync(serverSrcPath)) {
        fs.copyFileSync(serverSrcPath, serverDestPath);
        console.log(
          `${greenCheckmark} ${serverFramework} server has been copied to ${serverDestPath}`
        );

        // Modify the server.js file based on whether the user has a src folder
        let serverContent = fs.readFileSync(serverDestPath, "utf8");
        const rendererPath = hasSrcDir
          ? "/src/open-rsc/renderer/index.tsx"
          : "/open-rsc/renderer/index.tsx";

        serverContent = serverContent.replace(
          'vite.ssrLoadModule("/src/open-rsc/renderer/index.tsx")',
          `vite.ssrLoadModule("${rendererPath}")`
        );

        fs.writeFileSync(serverDestPath, serverContent);
        console.log(
          `${greenCheckmark} ${serverFramework} server has been configured successfully`
        );
      } else {
        console.error(`Error: ${serverFramework} server file not found`);
      }

      // Copy routes.ts to the specified location and adjust the import
      const routesSrcPath = path.join(openRscPath, "routes.ts");
      if (fs.existsSync(routesSrcPath)) {
        fs.mkdirSync(routesDir, { recursive: true });
        const routesDestPath = path.join(routesDir, "routes.ts");

        // Read the content of routes.ts
        let routesContent = fs.readFileSync(routesSrcPath, "utf8");

        // Calculate the relative path from routes.ts to the open-rsc directory
        const openRscRelativePath = path.relative(
          routesDir,
          path.join(installDir, "open-rsc")
        );

        // Adjust the import statement, adding "./" only if needed
        routesContent = routesContent.replace(
          'import type { Route } from "./router";',
          `import type { Route } from "${
            openRscRelativePath.startsWith("..") ? "" : "./"
          }${openRscRelativePath}/router";`
        );

        // Write the adjusted content to the new location
        fs.writeFileSync(routesDestPath, routesContent);
        console.log(
          `${greenCheckmark} Routes have been configured successfully`
        );
      } else {
        console.error("Error: routes.ts file not found in the package");
      }

      // Adjust the import in renderer/index.tsx
      const rendererPath = path.join(destPath, "renderer", "index.tsx");
      if (fs.existsSync(rendererPath)) {
        let rendererContent = fs.readFileSync(rendererPath, "utf8");

        // Calculate the relative path from renderer/index.tsx to the routes file
        const routesRelativePath = path.relative(
          path.dirname(rendererPath),
          routesDir
        );

        // Adjust the import statement, adding "./" only if needed
        rendererContent = rendererContent.replace(
          'import { routes } from "../routes";',
          `import { routes } from "${
            routesRelativePath.startsWith("..") ? "" : "./"
          }${routesRelativePath}/routes";`
        );

        // Write the adjusted content back to renderer/index.tsx
        fs.writeFileSync(rendererPath, rendererContent);
        console.log(`${greenCheckmark} Updated route configuration import in renderer`);
      } else {
        console.error("Error: renderer/index.tsx file not found");
      }

      // Update tsconfig.node.json
      updateTsConfigNode(hasSrcDir === "y");

      // Update vite.config.ts
      updateViteConfig(hasSrcDir === "y");

      // Update index.html
      updateIndexHtml(hasSrcDir === "y");

      // Update package.json script
      updatePackageJsonScript(hasSrcDir === "y");
      console.log(`${greenCheckmark} open-rsc installed successfully!`);
    } else {
      console.error("Error: open-rsc folder not found in the package");
    }
  } finally {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[2] === "init") {
  init().catch(console.error);
} else {
  console.log("Usage: npx open-rsc init");
}
