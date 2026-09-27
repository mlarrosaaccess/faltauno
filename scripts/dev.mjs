import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = 54329;

loadEnv(path.join(root, ".env"));

let postgres = null;
if (!process.env.DATABASE_URL) {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const databaseDir = path.join(root, ".pgdata");
  postgres = new EmbeddedPostgres({
    databaseDir,
    user: "faltauno",
    password: "faltauno",
    port,
    persistent: true,
  });
  if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
    await postgres.initialise();
  }
  await postgres.start();
  process.env.DATABASE_URL = `postgresql://faltauno:faltauno@127.0.0.1:${port}/faltauno`;
  console.log(`PostgreSQL local en ${process.env.DATABASE_URL}`);
}

const env = { ...process.env };
if (paso("prisma", ["migrate", "deploy"]) !== 0 || paso("tsx", ["prisma/seed.ts"]) !== 0) {
  if (postgres) await postgres.stop().catch(() => undefined);
  process.exit(1);
}

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const next = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  env,
  stdio: "inherit",
});

let cerrando = false;
async function cerrar(code) {
  if (cerrando) return;
  cerrando = true;
  if (next.exitCode === null) next.kill();
  if (postgres) {
    try {
      await postgres.stop();
    } catch {
      /* ya estaba detenido */
    }
  }
  process.exit(code ?? 0);
}

next.on("exit", (code) => {
  void cerrar(code ?? 0);
});
process.on("SIGINT", () => void cerrar(0));
process.on("SIGTERM", () => void cerrar(0));

function paso(bin, args) {
  const entry =
    bin === "prisma"
      ? path.join(root, "node_modules", "prisma", "build", "index.js")
      : path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  return result.status ?? 1;
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([^#=]+)=(.*)$/.exec(line.trim());
    if (!match) continue;
    const key = match[1].trim();
    if (process.env[key]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
