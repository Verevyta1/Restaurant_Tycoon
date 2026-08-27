import { readFile, writeFile } from "node:fs/promises";

const configUrl = new URL("../dist/server/wrangler.json", import.meta.url);
const workerName = process.env.CLOUDFLARE_WORKER_NAME || "london-tycoon";
const databaseId = process.env.CLOUDFLARE_DATABASE_ID || "f1ac3034-53b0-487c-aab3-fab1c6c9dd6f";

const config = JSON.parse(await readFile(configUrl, "utf8"));
config.name = workerName;
config.topLevelName = workerName;
config.observability = { enabled: true };

const database = config.d1_databases?.find((entry) => entry.binding === "DB");
if (!database) throw new Error("The generated Worker config is missing the DB binding.");
database.database_name = "london-tycoon";
database.database_id = databaseId;

await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Prepared ${workerName} for Cloudflare deployment.`);
