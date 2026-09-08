import { copyFileSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SHIM = "module.exports = {};";

/**
 * Replace `server-only` with a no-op so workflow steps can load outside Next.js.
 * Restores originals on process exit.
 */
export function patchServerOnly(projectRoot: string): void {
  const candidates = [
    join(projectRoot, "node_modules", "server-only", "index.js"),
    join(
      projectRoot,
      "node_modules",
      ".pnpm",
      "server-only@0.0.1",
      "node_modules",
      "server-only",
      "index.js"
    ),
  ];

  const backups: Array<{ path: string; backup: string }> = [];

  for (const serverOnlyPath of candidates) {
    if (!existsSync(serverOnlyPath)) {
      continue;
    }
    const backup = `${serverOnlyPath}.graphitti-runner-backup`;
    if (!existsSync(backup)) {
      copyFileSync(serverOnlyPath, backup);
    }
    writeFileSync(serverOnlyPath, SHIM);
    backups.push({ path: serverOnlyPath, backup });
  }

  function restore(): void {
    for (const { path, backup } of backups) {
      if (existsSync(backup)) {
        copyFileSync(backup, path);
        unlinkSync(backup);
      }
    }
  }

  process.on("exit", restore);
  process.on("SIGINT", () => {
    restore();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    restore();
    process.exit(143);
  });
}
