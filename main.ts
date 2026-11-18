import fs from "node:fs";
import path from "node:path";
import { parseSnapshot, buildRadar, boardIssue, dataScript } from "./lib/model.ts";
import { buildDossier } from "./vendor/makefun-board.ts";

const fail = (message: string, code: number): never => {
  console.error(message);
  process.exit(code);
};
const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] : undefined;
};
const copyRegular = (source: string, target: string): string[] => {
  fs.mkdirSync(target, { recursive: true });
  const copied: string[] = [];
  for (const name of fs.readdirSync(source).sort()) {
    if (name.startsWith(".")) continue;
    const from = path.join(source, name);
    if (fs.statSync(from).isFile()) {
      fs.copyFileSync(from, path.join(target, name));
      copied.push(name);
    }
  }
  return copied;
};

const inputOption = option("--input") ?? "/input/snapshot.json";
const input = fs.existsSync(inputOption) && fs.statSync(inputOption).isDirectory()
  ? path.join(inputOption, "snapshot.json")
  : inputOption;
if (!fs.existsSync(input)) fail("token radar: no snapshot", 2);
const output = option("--output") ?? process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const snapshot = parseSnapshot(fs.readFileSync(input, "utf8"));
const { board, radar } = buildRadar(snapshot);
if (boardIssue(board, snapshot) !== null) {
  fail("token radar: the model wrote a board the gate refuses", 1);
}

fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "board.json"), JSON.stringify({ rows: board }) + "\n");
fs.writeFileSync(path.join(output, "data.js"), dataScript(radar));
const here = path.dirname(new URL(import.meta.url).pathname);
copyRegular(path.join(here, "dashboard"), path.join(output, "dashboard"));
const images = copyRegular(path.join(here, "screenshots"), path.join(output, "screenshots"));
if (images.length < 3) fail(`token radar: screenshots/ holds ${images.length} image(s)`, 1);
const safeImage = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
for (const image of images) {
  if (!safeImage.test(image)) fail(`token radar: unsafe screenshot name: ${image}`, 1);
}
const dossier = buildDossier(output, {
  text_max_bytes: 65536,
  screenshots: { max: 4, max_bytes: 524288 },
  dashboard: { max_files: 400, max_bytes: 4194304 },
});
fs.writeFileSync(path.join(output, "dossier.json"), dossier);

console.log(`token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)`);
console.log(`token radar: wrote ${output}/board.json, ${output}/data.js, ${output}/dashboard (3 files), ${output}/screenshots (${images.length} images) and ${output}/dossier.json`);
