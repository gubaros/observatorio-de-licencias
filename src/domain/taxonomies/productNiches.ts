/**
 * Taxonomía central de NICHO funcional del producto.
 *
 * Fuente única de verdad: el array `PRODUCT_NICHE_VALUES`. Se mantiene pequeña a
 * propósito: solo los nichos efectivamente usados en el registro.
 */

import { z } from "zod";

export const PRODUCT_NICHE_VALUES = [
  "general_llm",
  "image_generation",
  "voice_generation",
  "video_generation",
  "code_assistant",
  "search_assistant",
  "ml_platform",
  "everyday_software",
  "unknown",
] as const;

export const ProductNicheSchema = z.enum(PRODUCT_NICHE_VALUES);
export type ProductNiche = z.infer<typeof ProductNicheSchema>;

export const PRODUCT_NICHE_LABEL: Record<ProductNiche, string> = {
  general_llm: "LLM general",
  image_generation: "Generación de imágenes",
  voice_generation: "Síntesis de voz",
  video_generation: "Generación de video",
  code_assistant: "Asistente de código",
  search_assistant: "Búsqueda y respuestas",
  ml_platform: "Plataforma de ML",
  everyday_software: "Software cotidiano",
  unknown: "Nicho sin determinar",
};

export function productNicheLabel(niche: string): string {
  return PRODUCT_NICHE_LABEL[niche as ProductNiche] ?? PRODUCT_NICHE_LABEL.unknown;
}
