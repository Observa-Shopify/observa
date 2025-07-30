if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  serverModuleFormat: "cjs",

  // 👇 These two lines are added for Vercel support
  serverBuildTarget: "vercel",
  server: "./server.js",

  dev: { port: process.env.HMR_SERVER_PORT || 8002 },
  future: {},
};
