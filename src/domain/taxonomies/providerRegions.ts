/**
 * Taxonomía central de REGIÓN del proveedor/proyecto.
 *
 * Fuente única de verdad: el array `PROVIDER_REGION_VALUES`. De ahí se derivan el
 * tipo TypeScript, el schema Zod y las etiquetas para la UI. No usar strings
 * libres en datos ni en componentes: importar siempre desde aquí.
 */

import { z } from "zod";

export const PROVIDER_REGION_VALUES = [
  "latin_america",
  "africa",
  "europe",
  "north_america",
  "asia",
  "global",
  "unknown",
] as const;

export const ProviderRegionSchema = z.enum(PROVIDER_REGION_VALUES);
export type ProviderRegion = z.infer<typeof ProviderRegionSchema>;

export const PROVIDER_REGION_LABEL: Record<ProviderRegion, string> = {
  latin_america: "América Latina",
  africa: "África",
  europe: "Europa",
  north_america: "América del Norte",
  asia: "Asia",
  global: "Global",
  unknown: "Región sin determinar",
};

/** Etiqueta legible de una región (fallback seguro si llega un valor desconocido). */
export function providerRegionLabel(region: string): string {
  return PROVIDER_REGION_LABEL[region as ProviderRegion] ?? PROVIDER_REGION_LABEL.unknown;
}
