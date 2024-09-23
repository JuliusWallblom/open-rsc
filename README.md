# OpenRSC

OpenRSC is an unopinionated, open-source React Server Components implementation package for Vite.

![Version](https://img.shields.io/npm/v/open-rsc)
![License](https://img.shields.io/npm/l/open-rsc)
![Downloads](https://img.shields.io/npm/dm/open-rsc)

## Features

- Asynchronous RSC (React Server Components)
- "use client" directive
- Self-owned: Modify OpenRSC to fit your needs
- Flexible and customizable
- Supports express, Koa and node-http

## Getting Started

### Install
To install OpenRSC in your Vite project, navigate to the root directory of your repository and run:

```
npx open-rsc@latest init
```

### Configure

Add your routes in the routes configuration file and add the OpenRSC router (```<OpenRSC routes={routes} />```) with your routes as a prop. That's it!