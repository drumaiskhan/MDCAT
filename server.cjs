const path = require("node:path");
const { pathToFileURL } = require("node:url");

process.chdir(__dirname);

const apiEntry = path.join(
  __dirname,
  "backend",
  "dist",
  "index.mjs"
);

import(pathToFileURL(apiEntry).href).catch((error) => {
  console.error("Failed to start MDCAT Proffs API:");
  console.error(error);
  process.exit(1);
});