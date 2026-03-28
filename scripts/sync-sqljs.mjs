import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const sqlDist = join(root, "node_modules", "sql.js", "dist");

const filesToCopy = [
  {
    from: join(sqlDist, "sql-wasm.js"),
    to: join(root, "public", "assets", "sql-wasm.js"),
  },
  {
    from: join(sqlDist, "sql-wasm.wasm"),
    to: join(root, "public", "assets", "sql-wasm.wasm"),
  },
  {
    from: join(sqlDist, "sql-wasm.js"),
    to: join(root, "public", "sql-wasm.js"),
  },
  {
    from: join(sqlDist, "sql-wasm.wasm"),
    to: join(root, "public", "sql-wasm.wasm"),
  },
];

for (const file of filesToCopy) {
  const targetDir = dirname(file.to);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (!existsSync(file.from)) {
    throw new Error(`sql.js file not found: ${file.from}`);
  }

  copyFileSync(file.from, file.to);
}

console.log("sql.js wasm assets synchronized");
