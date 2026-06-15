/**
 * Taxonomía central de TIPO de proveedor/proyecto.
 *
 * Distingue un servicio comercial de un proyecto académico, soberano u open
 * source. La distinción es jurídicamente relevante: no todos se ofrecen bajo la
 * misma lógica contractual (ToS/Privacy/EULA vs. licencia de modelo o sin
 * documentos de servicio).
 *
 * Fuente única de verdad: el array `PROVIDER_TYPE_VALUES`.
 */

import { z } from "zod";

export const PROVIDER_TYPE_VALUES = [
  "commercial_provider",
  "academic_project",
  "sovereign_ai_project",
  "open_source_project",
  "research_lab",
  "unknown",
] as const;

export const ProviderTypeSchema = z.enum(PROVIDER_TYPE_VALUES);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  commercial_provider: "Proveedor comercial",
  academic_project: "Proyecto académico",
  sovereign_ai_project: "Proyecto soberano/académico",
  open_source_project: "Proyecto open source",
  research_lab: "Laboratorio de investigación",
  unknown: "Tipo sin determinar",
};

/** True si el tipo NO es un proveedor comercial (proyecto académico/soberano/abierto). */
export function isNonCommercialProject(type: string): boolean {
  return type === "academic_project" || type === "sovereign_ai_project" || type === "open_source_project";
}

export function providerTypeLabel(type: string): string {
  return PROVIDER_TYPE_LABEL[type as ProviderType] ?? PROVIDER_TYPE_LABEL.unknown;
}
