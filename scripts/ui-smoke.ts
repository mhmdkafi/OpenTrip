// Backward-compatible entry point for the current browser smoke test.
import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["scripts/prototype-smoke.mjs"], { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
