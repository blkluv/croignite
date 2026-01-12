#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath, { override } = { override: false }) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) continue;
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!override && process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

const stubPath = path.resolve(__dirname, "disable-sentry.cjs");
const convexPackageJson = require.resolve("convex/package.json");
const cliEntrypoint = path.resolve(convexPackageJson, "../bin/main.js");
const extraArgs = process.argv.slice(2);
const projectRoot = path.resolve(__dirname, "..");

loadEnvFile(path.join(projectRoot, ".env"), { override: false });
loadEnvFile(path.join(projectRoot, ".env.local"), { override: true });

const child = spawn(
  process.execPath,
  ["--require", stubPath, cliEntrypoint, "dev", ...extraArgs],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (typeof code === "number") {
    process.exit(code);
  }
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(0);
  }
});
