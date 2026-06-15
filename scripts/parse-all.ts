/**
 * parse:all — reparsea los textos ya extraídos SIN volver a descargar.
 *
 * También actúa como MIGRADOR de modalidad: para cada análisis busca su
 * documento en el registro (por coincidencia EXACTA del "stem" del id, sin la
 * fecha) y le inyecta `contractingMode` / `appliesToModes` / `sourceScope`. Si
 * no hay match en el registro (p. ej. carga manual), preserva la modalidad ya
 * presente en el análisis (no la pisa con defaults).
 *
 * Uso:  npm run parse:all
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { LICENSES_DIR } from "../src/lib/paths";
import { LicenseAnalysisSchema } from "../src/lib/schema";
import { parseLicense } from "../src/lib/parser";
import { loadRegistry, flattenDocuments } from "../src/lib/sources";
import { slugify } from "../src/lib/id";

/** Stem estable de un documento del registro. */
function registryStem(providerId: string, productId: string, documentId: string): string {
  return `${slugify(providerId)}-${slugify(productId)}-${slugify(documentId)}`;
}

/** Stem de un id de análisis: id sin el sufijo de fecha (y variante). */
function analysisStem(id: string): string {
  return id.replace(/-\d{4}-\d{2}-\d{2}(-v\d+)?$/, "");
}

async function main() {
  const registry = await loadRegistry();
  const byStem = new Map<string, ReturnType<typeof flattenDocuments>[number]>();
  for (const flat of flattenDocuments(registry)) {
    byStem.set(registryStem(flat.provider.providerId, flat.product.productId, flat.document.documentId), flat);
  }

  let files: string[] = [];
  try {
    files = (await fs.readdir(LICENSES_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    console.log("No existe data/licenses todavía.");
    return;
  }

  let reparsed = 0;
  let skipped = 0;
  let fromRegistry = 0;

  for (const file of files) {
    const full = path.join(LICENSES_DIR, file);
    const existing = LicenseAnalysisSchema.parse(JSON.parse(await fs.readFile(full, "utf8")));

    const textPath = path.join(process.cwd(), existing.rawTextPath);
    let rawText: string;
    try {
      rawText = await fs.readFile(textPath, "utf8");
    } catch {
      console.warn(`  ! ${file}: no se encontró el texto (${existing.rawTextPath}); se omite`);
      skipped++;
      continue;
    }

    // Modalidad: del registro si hay match exacto; si no, preservar la existente.
    const match = byStem.get(analysisStem(existing.id));
    const mode = match
      ? {
          contractingMode: match.document.contractingMode,
          appliesToModes: match.document.appliesToModes,
          sourceScope: match.document.sourceScope,
        }
      : {
          contractingMode: existing.contractingMode,
          appliesToModes: existing.appliesToModes,
          sourceScope: existing.sourceScope,
        };
    if (match) fromRegistry++;

    // Taxonomía de software: del registro si hay match; si no, preservar la existente.
    const taxonomy = match
      ? {
          softwareCategory: match.product.softwareCategory,
          comparisonGroup: match.product.comparisonGroup,
          comparativeBaseline: match.product.comparativeBaseline,
          academicPurposeNotes: match.product.academicPurposeNotes,
        }
      : {
          softwareCategory: existing.softwareCategory,
          comparisonGroup: existing.comparisonGroup,
          comparativeBaseline: existing.comparativeBaseline,
          academicPurposeNotes: existing.academicPurposeNotes,
        };

    const fresh = parseLicense({
      id: existing.id,
      providerName: existing.providerName,
      productName: existing.productName,
      productTier: existing.productTier,
      documentType: existing.documentType,
      sourceUrl: existing.sourceUrl,
      retrievedAt: existing.retrievedAt,
      rawTextPath: existing.rawTextPath,
      rawText,
      isMock: existing.metadata.isMock,
      ...mode,
      ...taxonomy,
    });

    // Preserva metadatos de ingesta/revisión; actualiza lo que produce el parser.
    const merged = {
      ...fresh,
      metadata: {
        ...existing.metadata,
        parserVersion: fresh.metadata.parserVersion,
        createdAt: existing.metadata.createdAt,
      },
    };

    const validated = LicenseAnalysisSchema.parse(merged);
    await fs.writeFile(full, JSON.stringify(validated, null, 2) + "\n", "utf8");
    reparsed++;
  }

  console.log(`Reparseados: ${reparsed} (${fromRegistry} con modalidad del registro). Omitidos: ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
