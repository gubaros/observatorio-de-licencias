/**
 * Núcleo de la ingesta real. Orquesta: descargar -> guardar original ->
 * extraer texto -> puerta de validez -> parsear -> persistir JSON validado.
 *
 * Módulo "plano" (sin `server-only`): lo usan los scripts CLI. NO importa la
 * capa de lectura de la UI (storage.ts).
 */

import { promises as fs } from "node:fs";
import {
  ALL_DATA_DIRS,
  LICENSES_DIR,
  extractedAbsPath,
  extractedRelPath,
  fetchedAbsPath,
  fetchedRelPath,
  licenseJsonPath,
} from "./paths";
import { buildDocumentId, toDatePart } from "./id";
import { sha256 } from "./hash";
import { fetchUrl, FETCHER_VERSION } from "./fetcher";
import { fetchUrlHeadless, HEADLESS_FETCHER_VERSION } from "./headlessFetcher";
import { fetchUrlStealth, STEALTH_FETCHER_VERSION } from "./stealthFetcher";
import { detectFormat, extractText, type FetchedFormat } from "./extract";
import { parseLicense } from "./parser";
import { LicenseAnalysisSchema, type LicenseAnalysis, type SourceStatus } from "./schema";
import { hostMatchesDomains, type FlatDocument } from "./sources";

export interface IngestResult {
  id: string;
  documentType: string;
  url: string | null;
  status: SourceStatus;
  wrote: boolean;
  skipped: boolean;
  reason: string;
  httpStatus: number | null;
  finalUrl: string | null;
  contentHash: string | null;
  extractedChars: number | null;
}

export async function ensureDataDirs(): Promise<void> {
  await Promise.all(ALL_DATA_DIRS.map((d) => fs.mkdir(d, { recursive: true })));
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca un análisis YA EXISTENTE con el mismo hash de contenido pero de OTRO
 * documento (id que no es variante de `baseId`). Detecta colisiones entre
 * documentos: p. ej. dos URLs distintas que en realidad apuntan a la misma
 * página (una página índice/landing, no el documento real). Evita "equivalencias
 * falsas" entre, p. ej., Terms y Privacy.
 */
async function findCollidingId(contentHash: string, baseId: string): Promise<string | null> {
  let files: string[] = [];
  try {
    files = await fs.readdir(LICENSES_DIR);
  } catch {
    return null;
  }
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const id = f.slice(0, -5);
    if (id === baseId || id.startsWith(`${baseId}-v`)) continue; // misma fuente / variante
    if ((await readContentHash(id)) === contentHash) return id;
  }
  return null;
}

async function readContentHash(id: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(licenseJsonPath(id), "utf8");
    return (JSON.parse(raw)?.metadata?.contentHash as string | undefined) ?? null;
  } catch {
    return null;
  }
}

const extForFormat: Record<FetchedFormat, string> = {
  html: "html",
  pdf: "pdf",
  text: "txt",
  unknown: "bin",
};

/**
 * Resuelve el id final respetando trazabilidad y dedup por hash:
 *  - si no existe un análisis con el id base -> usa el id base;
 *  - si existe con el MISMO hash -> idempotente (skip);
 *  - si existe con hash distinto -> agrega sufijo de variante estable (-v2, -v3...).
 */
async function resolveVariantId(
  baseId: string,
  contentHash: string,
): Promise<{ id: string; skip: boolean }> {
  let candidate = baseId;
  for (let v = 1; v <= 50; v++) {
    if (v > 1) candidate = `${baseId}-v${v}`;
    if (!(await pathExists(licenseJsonPath(candidate)))) return { id: candidate, skip: false };
    const existingHash = await readContentHash(candidate);
    if (existingHash === contentHash) return { id: candidate, skip: true };
  }
  // Tope de seguridad: sobrescribe la última variante.
  return { id: candidate, skip: false };
}

export interface IngestOptions {
  /** Usar el navegador headless en vez de un GET simple (fuentes bloqueadas). */
  headless?: boolean;
  /** Con headless: usar un navegador real visible (mejor contra Cloudflare). */
  headed?: boolean;
  /** Navegador stealth (evasión anti-bot autorizada) para fuentes bloqueadas. */
  stealth?: boolean;
  now?: Date;
}

/**
 * Ingesta un documento. En modo normal asume que ya está `verified`. En modo
 * `headless` (para fuentes bloqueadas) descarga con navegador real y verifica el
 * dominio oficial sobre la marcha.
 * Devuelve un resultado para logging y para actualizar el estado de la fuente.
 */
export async function ingestDocument(flat: FlatDocument, opts: IngestOptions = {}): Promise<IngestResult> {
  const { headless = false, headed = false, stealth = false, now = new Date() } = opts;
  const { provider, product, document } = flat;
  const datePart = toDatePart(now.toISOString());
  const baseId = buildDocumentId({
    providerId: provider.providerId,
    productId: product.productId,
    documentId: document.documentId,
    datePart,
  });

  const base: Omit<IngestResult, "status" | "wrote" | "skipped" | "reason"> = {
    id: baseId,
    documentType: document.documentType,
    url: document.sourceUrl,
    httpStatus: null,
    finalUrl: null,
    contentHash: null,
    extractedChars: null,
  };

  if (!document.sourceUrl) {
    return { ...base, status: "needs_manual_review", wrote: false, skipped: false, reason: "sin URL de fuente" };
  }

  await ensureDataDirs();

  const res = stealth
    ? await fetchUrlStealth(document.sourceUrl)
    : headless
      ? await fetchUrlHeadless(document.sourceUrl, { headed })
      : await fetchUrl(document.sourceUrl);
  const browserMode = stealth || headless;
  base.httpStatus = res.status || null;
  base.finalUrl = res.finalUrl;

  if (res.status === 0) {
    return { ...base, status: "unavailable", wrote: false, skipped: false, reason: `error: ${res.error ?? "desconocido"}` };
  }
  if (!res.ok) {
    return { ...base, status: "failed_fetch", wrote: false, skipped: false, reason: `HTTP ${res.status}` };
  }

  // Con navegador (headless/stealth) la fuente no pasó por sources:verify:
  // validamos el dominio oficial aquí (host final ∈ officialDomains).
  if (browserMode) {
    let host = "";
    try {
      host = new URL(res.finalUrl).host;
    } catch {
      host = "";
    }
    if (!hostMatchesDomains(host, provider.officialDomains)) {
      return {
        ...base,
        status: "needs_manual_review",
        wrote: false,
        skipped: false,
        reason: `host final fuera de dominios oficiales: ${host || "desconocido"}`,
      };
    }
  }

  const format = detectFormat(res.contentType, res.body);

  // PDF / formato desconocido: guardamos el original como evidencia y paramos.
  if (format === "pdf" || format === "unknown") {
    base.contentHash = sha256(res.body);
    await fs.writeFile(fetchedAbsPath(baseId, extForFormat[format]), res.body);
    return {
      ...base,
      status: "unsupported_format",
      wrote: false,
      skipped: false,
      reason: format === "pdf" ? "PDF no soportado en el MVP" : "formato no reconocido",
    };
  }

  const extraction = extractText(format, res.body);
  if (browserMode && extraction.method === "html-to-text") extraction.method = "headless-render";
  base.extractedChars = extraction.validity.chars;

  // Hash sobre el TEXTO EXTRAÍDO (no sobre los bytes crudos): el HTML suele
  // traer tokens por request que cambian en cada descarga; el texto es estable.
  // Esto hace que reingerir el mismo documento el mismo día sea idempotente.
  const contentHash = sha256(extraction.text);
  base.contentHash = contentHash;

  // Puerta de validez de contenido: no parseamos un no-documento.
  if (!extraction.validity.ok) {
    // Guardamos lo descargado y lo extraído para inspección humana.
    await fs.writeFile(fetchedAbsPath(baseId, extForFormat[format]), res.body);
    await fs.writeFile(extractedAbsPath(baseId), extraction.text, "utf8");
    return {
      ...base,
      status: "unsupported_format",
      wrote: false,
      skipped: false,
      reason: extraction.validity.reason ?? "contenido no válido",
    };
  }

  // Colisión entre documentos distintos: misma página servida para dos URLs
  // (típicamente una página índice/landing, no el documento real). No se escribe
  // un análisis; queda para revisión manual para no fabricar equivalencias falsas.
  const colliding = await findCollidingId(contentHash, baseId);
  if (colliding) {
    return {
      ...base,
      status: "needs_manual_review",
      wrote: false,
      skipped: false,
      reason: `contenido idéntico a ${colliding} (la URL probablemente apunta a una página índice, no al documento); requiere revisión manual`,
    };
  }

  // Dedup por hash + variantes estables.
  const { id, skip } = await resolveVariantId(baseId, contentHash);
  base.id = id;
  if (skip) {
    return { ...base, status: "verified", wrote: false, skipped: true, reason: "hash sin cambios: no se duplica" };
  }

  const ext = extForFormat[format];
  await fs.writeFile(fetchedAbsPath(id, ext), res.body);
  await fs.writeFile(extractedAbsPath(id), extraction.text, "utf8");

  const retrievedAt = now.toISOString();
  const analysis = parseLicense({
    id,
    providerName: provider.providerName,
    productName: product.productName,
    productTier: "All",
    documentType: document.documentType,
    sourceUrl: document.sourceUrl,
    retrievedAt,
    rawTextPath: extractedRelPath(id),
    rawText: extraction.text,
    isMock: false,
    // Modalidad: autoridad del registro de fuentes.
    contractingMode: document.contractingMode,
    appliesToModes: document.appliesToModes,
    sourceScope: document.sourceScope,
    // Taxonomía de software: autoridad del registro (nivel producto).
    softwareCategory: product.softwareCategory,
    comparisonGroup: product.comparisonGroup,
    comparativeBaseline: product.comparativeBaseline,
    academicPurposeNotes: product.academicPurposeNotes,
  });

  const realAnalysis: LicenseAnalysis = {
    ...analysis,
    metadata: {
      ...analysis.metadata,
      isMock: false,
      reviewStatus: "unreviewed",
      retrievedAt,
      fetcherVersion: stealth
        ? `stealth-${STEALTH_FETCHER_VERSION}`
        : headless
          ? `headless-${HEADLESS_FETCHER_VERSION}`
          : FETCHER_VERSION,
      contentHash,
      sourceVerified: true,
      sourceStatus: "verified",
      extractionMethod: extraction.method,
      canonicalUrl: extraction.canonicalUrl,
      finalUrl: res.finalUrl,
      fetchedPath: fetchedRelPath(id, ext),
      extractedTextPath: extractedRelPath(id),
      extractedChars: extraction.validity.chars,
      providerId: provider.providerId,
      productId: product.productId,
      documentId: document.documentId,
    },
  };

  const validated = LicenseAnalysisSchema.parse(realAnalysis);
  await fs.writeFile(licenseJsonPath(id), JSON.stringify(validated, null, 2) + "\n", "utf8");

  return {
    ...base,
    status: "verified",
    wrote: true,
    skipped: false,
    reason: `ingerido (${extraction.validity.chars} chars, ${extraction.validity.markerCount} marcadores)`,
  };
}
