/**
 * ingest:headless — reintenta con navegador headless las fuentes BLOQUEADAS.
 *
 * Apunta solo a documentos cuyo GET simple fue bloqueado por antibot
 * (HTTP 403/429/503) o falló por red/timeout (`unavailable`). NO reintenta 404
 * (URL equivocada → revisión manual). Renderiza con el navegador headless real
 * (gstack browse), verifica el dominio oficial y corre el mismo pipeline
 * (extracción → puerta de validez → parser → persistencia).
 *
 * Requiere el binario `browse` de gstack instalado.
 *
 * Uso:
 *   npm run ingest:headless
 *   npm run ingest:headless -- --provider openai
 *   npm run ingest:headless -- --limit 5
 */

import { parseArgs } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadRegistry, saveRegistry, flattenDocuments } from "../src/lib/sources";
import { ingestDocument, ensureDataDirs } from "../src/lib/ingest";
import { resolveBrowseBin, disconnectBrowser } from "../src/lib/headlessFetcher";
import { LOGS_DIR } from "../src/lib/paths";

const { values } = parseArgs({
  options: {
    provider: { type: "string" },
    limit: { type: "string" },
    headed: { type: "boolean", default: false },
  },
});

const BLOCK_STATUSES = new Set([403, 429, 503]);

async function main() {
  if (!resolveBrowseBin()) {
    console.error("No se encontró el navegador headless (gstack browse). Instalá gstack /browse y reintentá.");
    process.exit(1);
  }

  await ensureDataDirs();
  const registry = await loadRegistry();
  let docs = flattenDocuments(registry, values.provider);

  // Fuentes que un navegador real puede resolver pero un GET simple no:
  //  - bloqueadas por antibot (403/429/503) o caídas por red (unavailable);
  //  - respondieron 200 pero el GET no rindió contenido válido (SPA, muro de
  //    consentimiento, redirección a otro host): quedaron unsupported_format o
  //    needs_manual_review con http 200. 404 NO (URL equivocada).
  let targets = docs.filter(
    (d) =>
      d.document.sourceUrl &&
      ((d.document.sourceStatus === "failed_fetch" &&
        d.document.httpStatus !== null &&
        BLOCK_STATUSES.has(d.document.httpStatus)) ||
        d.document.sourceStatus === "unavailable" ||
        ((d.document.sourceStatus === "unsupported_format" ||
          d.document.sourceStatus === "needs_manual_review") &&
          d.document.httpStatus === 200)),
  );

  const limit = values.limit ? parseInt(values.limit, 10) : undefined;
  if (limit) targets = targets.slice(0, limit);

  if (targets.length === 0) {
    console.log("No hay fuentes bloqueadas (403/429/503) o caídas para reintentar con headless.");
    return;
  }

  const headed = values.headed === true;
  console.log(`Reintentando ${targets.length} fuente(s) con navegador ${headed ? "real (headed)" : "headless"}…\n`);

  // Cambiar de modo requiere reiniciar el daemon del navegador.
  if (headed) await disconnectBrowser();

  const results = [];
  for (const flat of targets) {
    const result = await ingestDocument(flat, { headless: true, headed });
    results.push({ provider: flat.provider.providerId, ...result });

    flat.document.sourceStatus = result.status;
    flat.document.lastCheckedAt = new Date().toISOString();
    flat.document.notes = `[headless] ${result.reason}`;
    if (result.httpStatus !== null) flat.document.httpStatus = result.httpStatus;
    if (result.finalUrl) flat.document.finalUrl = result.finalUrl;

    const mark = result.wrote ? "✓" : result.skipped ? "=" : "✗";
    console.log(`  ${mark} ${flat.provider.providerId}/${flat.document.documentId} -> ${result.status}: ${result.reason}`);
  }

  await saveRegistry(registry);
  if (headed) await disconnectBrowser();

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(LOGS_DIR, `ingest-headless-${ts}.json`);
  await fs.writeFile(logPath, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2) + "\n", "utf8");

  const wrote = results.filter((r) => r.wrote).length;
  console.log(`\nResumen: ${wrote} escritos de ${results.length} reintentos.`);
  console.log(`Log: ${path.relative(process.cwd(), logPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
