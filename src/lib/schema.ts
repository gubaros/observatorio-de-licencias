/**
 * Schema Zod del análisis de licencia (la "fuente de verdad" en disco).
 *
 * Todo JSON guardado en data/licenses debe validar contra `LicenseAnalysisSchema`.
 * Los tipos TypeScript se infieren desde el schema para evitar divergencias.
 */

import { z } from "zod";

export const FindingStatusSchema = z.enum(["found", "not_found", "unclear"]);

export const RiskLevelSchema = z.enum(["low", "medium", "high", "unknown"]);

export const ReviewStatusSchema = z.enum([
  "unreviewed",
  "needs_legal_review",
  "reviewed",
  "rejected",
]);

/** Estado de la fuente de un documento (registro + verificación). */
export const SourceStatusSchema = z.enum([
  "verified",
  "needs_manual_review",
  "unavailable",
  "failed_fetch",
  "unsupported_format",
]);

/** Método con el que se extrajo el texto plano del documento descargado. */
export const ExtractionMethodSchema = z.enum([
  "html-to-text",
  "headless-render",
  "pdf-to-text",
  "plain-text",
  "manual",
  "none",
]);

// --- Modalidad de contratación ---
export const ContractingModeSchema = z.enum([
  "free",
  "paid_individual",
  "team",
  "business",
  "enterprise",
  "api",
  "education",
  "open_source",
  "unknown",
  "all",
]);

/** Alcance del documento respecto de las modalidades. */
export const SourceScopeSchema = z.enum(["general", "mode_specific", "mixed", "unclear"]);

export const ModeConfidenceSchema = z.enum(["high", "medium", "low", "unknown"]);

/** Especificidad por modalidad a nivel de una categoría jurídica. */
export const ModeSpecificitySchema = z.enum(["general", "mode_specific", "unclear"]);

/** Perfil preliminar de privacidad (preferido sobre una "nota" escolar). */
export const PrivacyPostureSchema = z.enum(["strong", "moderate", "weak", "unknown"]);

export const EvidenceSchema = z.object({
  /** Fragmento textual citado del documento fuente. */
  quote: z.string(),
  /** Pista de ubicación (sección, offset aproximado, etc.). */
  locationHint: z.string().nullable(),
});

export const CategoryFindingSchema = z.object({
  status: FindingStatusSchema,
  riskLevel: RiskLevelSchema,
  legalSummary: z.string(),
  evidence: z.array(EvidenceSchema),
  notes: z.string(),
  // --- Anotación por modalidad (default para compat con archivos previos) ---
  appliesToModes: z.array(ContractingModeSchema).default([]),
  modeSpecificity: ModeSpecificitySchema.default("general"),
  modeEvidence: z.array(EvidenceSchema).default([]),
});

/** Perfil preliminar de privacidad por modalidad (separado del riesgo general). */
export const PrivacyProfileSchema = z.object({
  posture: PrivacyPostureSchema.default("unknown"),
  rationale: z.string().default(""),
  signals: z.array(z.string()).default([]),
  evidence: z.array(EvidenceSchema).default([]),
});

export const LicenseAnalysisSchema = z.object({
  id: z.string().min(1),
  providerName: z.string().min(1),
  productName: z.string().min(1),
  productTier: z.string().min(1),
  documentType: z.string().min(1),
  // --- Modalidad de contratación (defaults para compat; el migrador las puebla) ---
  contractingMode: ContractingModeSchema.default("unknown"),
  appliesToModes: z.array(ContractingModeSchema).default([]),
  sourceScope: SourceScopeSchema.default("unclear"),
  modeConfidence: ModeConfidenceSchema.default("unknown"),
  modeRationale: z.string().default(""),
  sourceUrl: z.string().url().nullable(),
  retrievedAt: z.string(),
  rawTextPath: z.string(),
  overall: z.object({
    legalSummary: z.string(),
    overallRiskLevel: RiskLevelSchema,
  }),
  /** Perfil preliminar de privacidad por modalidad (separado del riesgo general). */
  privacy: PrivacyProfileSchema.default({ posture: "unknown", rationale: "", signals: [], evidence: [] }),
  /** Hallazgos por categoría jurídica, indexados por la clave de categoría. */
  categories: z.record(z.string(), CategoryFindingSchema),
  metadata: z.object({
    createdAt: z.string(),
    parserVersion: z.string(),
    isMock: z.boolean(),
    reviewStatus: ReviewStatusSchema,
    // --- Metadatos de ingesta real (opcionales: los mock no los tienen) ---
    retrievedAt: z.string().optional(),
    fetcherVersion: z.string().optional(),
    contentHash: z.string().optional(),
    sourceVerified: z.boolean().optional(),
    sourceStatus: SourceStatusSchema.optional(),
    extractionMethod: ExtractionMethodSchema.optional(),
    canonicalUrl: z.string().nullable().optional(),
    finalUrl: z.string().nullable().optional(),
    fetchedPath: z.string().nullable().optional(),
    extractedTextPath: z.string().nullable().optional(),
    extractedChars: z.number().optional(),
    // Claves del registro, para mapear el análisis al documento fuente exacto.
    providerId: z.string().optional(),
    productId: z.string().optional(),
    documentId: z.string().optional(),
  }),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type CategoryFinding = z.infer<typeof CategoryFindingSchema>;
export type LicenseAnalysis = z.infer<typeof LicenseAnalysisSchema>;
export type SourceStatus = z.infer<typeof SourceStatusSchema>;
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;
export type SourceScope = z.infer<typeof SourceScopeSchema>;
export type ModeConfidence = z.infer<typeof ModeConfidenceSchema>;
export type ModeSpecificity = z.infer<typeof ModeSpecificitySchema>;
export type PrivacyPosture = z.infer<typeof PrivacyPostureSchema>;
export type PrivacyProfile = z.infer<typeof PrivacyProfileSchema>;

/**
 * Schema de la entrada del formulario de carga. Lo que el usuario envía antes
 * de ejecutar el parser.
 */
export const AnalysisInputSchema = z.object({
  providerName: z.string().trim().min(1, "El nombre del proveedor es obligatorio."),
  productName: z.string().trim().min(1, "El nombre del producto es obligatorio."),
  productTier: z.string().trim().min(1, "El plan / tier es obligatorio."),
  documentType: z.string().trim().min(1, "El tipo de documento es obligatorio."),
  contractingMode: ContractingModeSchema.default("unknown"),
  sourceUrl: z
    .string()
    .trim()
    .url("La URL fuente no es válida.")
    .optional()
    .or(z.literal("")),
  retrievedAt: z.string().trim().min(1, "La fecha de obtención es obligatoria."),
  rawText: z.string().trim().min(20, "El texto del documento es demasiado corto."),
});

export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;
