// Sizzle & Serve — a working best-cooking-game entry (Node 22, standard
// library only): the game is this directory's game/ folder, plain static
// files a desktop browser loads offline (game/index.html and its ES modules,
// no library and no network request), and the program hands it in. It copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Empty a directory's contents without removing the directory itself: the
 * grader runs this program as a non-root user with a read-only repository
 * and a writable /output, and deleting /output itself would fail there. */
function clearContents(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true });
}

mkdirSync(out, { recursive: true });
clearContents(join(out, 'game'));
clearContents(join(out, 'screenshots'));
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Write the dossier, then verify it round-trips: the gate compares
// dossier.json byte for byte against a fresh buildDossier, so a stale or
// half-written dossier must fail the run loudly here, not on the server.
const dossier = buildDossier(out, DOSSIER_CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);
const check = buildDossier(out, DOSSIER_CAPS);
if (!Buffer.from(check).equals(Buffer.from(dossier))) {
  throw new Error('dossier.json does not match a fresh buildDossier run');
}
