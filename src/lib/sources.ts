/**
 * Registro de proveedores y fuentes oficiales.
 *
 * El registro vive en `data/sources/providers.json` (disco = fuente de verdad).
 * Este módulo define su schema Zod y utilidades de lectura/escritura y de
 * coincidencia de dominios. Es un módulo "plano" (sin `server-only`) para poder
 * usarse desde los scripts CLI.
 */

import { promises as fs } from "node:fs";
import { z } from "zod";
import { SourceStatusSchema, ContractingModeSchema, SourceScopeSchema, SoftwareCategorySchema, ComparisonGroupSchema } from "./schema";
import { PROVIDERS_JSON, SOURCES_DIR } from "./paths";

export const SourceDocumentSchema = z.object({
  documentId: z.string(),
  documentType: z.string(),
  // --- Modalidad de contratación (autoridad curada por humano) ---
  contractingMode: ContractingModeSchema.default("all"),
  appliesToModes: z.array(ContractingModeSchema).default([]),
  sourceScope: SourceScopeSchema.default("general"),
  sourceUrl: z.string().url().nullable(),
  sourceStatus: SourceStatusSchema,
  /** Última verificación (sources:verify). */
  lastCheckedAt: z.string().nullable().default(null),
  httpStatus: z.number().nullable().default(null),
  finalUrl: z.string().nullable().default(null),
  notes: z.string().default(""),
});

export const ProductSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  tiers: z.array(z.string()).default([]),
  // --- Taxonomía de software (autoridad del registro) ---
  softwareCategory: SoftwareCategorySchema.default("ai_provider"),
  comparisonGroup: ComparisonGroupSchema.default("ai"),
  comparativeBaseline: z.boolean().default(false),
  academicPurposeNotes: z.string().default(""),
  documents: z.array(SourceDocumentSchema).default([]),
});

export const ProviderSchema = z.object({
  providerId: z.string(),
  providerName: z.string(),
  /** Dominios oficiales aceptados como fuente primaria. */
  officialDomains: z.array(z.string()).default([]),
  products: z.array(ProductSchema).default([]),
  metadata: z
    .object({
      needsManualSourceReview: z.boolean().default(false),
      notes: z.string().default(""),
    })
    .default({ needsManualSourceReview: false, notes: "" }),
});

export const ProviderRegistrySchema = z.object({
  version: z.string(),
  providers: z.array(ProviderSchema),
});

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ProviderRegistry = z.infer<typeof ProviderRegistrySchema>;

/** Lee y valida el registro de proveedores. */
export async function loadRegistry(): Promise<ProviderRegistry> {
  const raw = await fs.readFile(PROVIDERS_JSON, "utf8");
  return ProviderRegistrySchema.parse(JSON.parse(raw));
}

/** Escribe el registro (indentado, estable). */
export async function saveRegistry(registry: ProviderRegistry): Promise<void> {
  await fs.mkdir(SOURCES_DIR, { recursive: true });
  const validated = ProviderRegistrySchema.parse(registry);
  await fs.writeFile(PROVIDERS_JSON, JSON.stringify(validated, null, 2) + "\n", "utf8");
}

/**
 * ¿El host pertenece a alguno de los dominios oficiales? Acepta el dominio
 * exacto o cualquier subdominio (p. ej. `policies.google.com` ∈ `google.com`).
 */
export function hostMatchesDomains(host: string, officialDomains: string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return officialDomains.some((d) => {
    const dd = d.toLowerCase();
    return h === dd || h.endsWith(`.${dd}`);
  });
}

export interface FlatDocument {
  provider: Provider;
  product: Product;
  document: SourceDocument;
}

/** Aplana todos los documentos del registro (opcionalmente filtrando por proveedor). */
export function flattenDocuments(registry: ProviderRegistry, providerId?: string): FlatDocument[] {
  const out: FlatDocument[] = [];
  for (const provider of registry.providers) {
    if (providerId && provider.providerId !== providerId) continue;
    for (const product of provider.products) {
      for (const document of product.documents) {
        out.push({ provider, product, document });
      }
    }
  }
  return out;
}
