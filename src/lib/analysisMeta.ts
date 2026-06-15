/**
 * Helpers de presentación sobre la procedencia de un análisis. Plano (sin
 * server-only) para usarse en client y server components.
 */

import type { LicenseAnalysis, PrivacyPosture, SourceScope, ModeConfidence } from "./schema";
export { MODE_LABELS, ALL_MODE_EXPLANATION } from "./contractingModes";

export type SourceKind = "verified" | "unverified";

/** Clasifica la procedencia de un análisis para distinguirlo en la UI. */
export function sourceKind(a: LicenseAnalysis): SourceKind {
  return a.metadata.sourceVerified ? "verified" : "unverified";
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  verified: "Fuente verificada",
  unverified: "Fuente sin verificar",
};

export const SOURCE_KIND_STYLE: Record<SourceKind, string> = {
  verified: "bg-emerald-100 text-emerald-900 border-emerald-300",
  unverified: "bg-orange-100 text-orange-900 border-orange-300",
};

export const REVIEW_LABELS: Record<string, string> = {
  unreviewed: "Sin revisar",
  needs_legal_review: "Requiere revisión legal",
  reviewed: "Revisado",
  rejected: "Rechazado",
};

export const SOURCE_STATUS_LABELS: Record<string, string> = {
  verified: "Verificada",
  needs_manual_review: "Requiere revisión manual",
  not_found_after_official_search: "No hallada tras búsqueda oficial",
  unavailable: "No disponible",
  failed_fetch: "Falló la descarga",
  unsupported_format: "Formato no soportado",
};

// --- Perfil preliminar de privacidad ---
export const PRIVACY_POSTURE_LABEL: Record<PrivacyPosture, string> = {
  strong: "Privacidad: Fuerte",
  moderate: "Privacidad: Moderada",
  weak: "Privacidad: Débil",
  unknown: "Privacidad: Sin datos",
};

export const PRIVACY_POSTURE_STYLE: Record<PrivacyPosture, string> = {
  strong: "bg-emerald-100 text-emerald-900 border-emerald-300",
  moderate: "bg-sky-100 text-sky-900 border-sky-300",
  weak: "bg-red-100 text-red-900 border-red-300",
  unknown: "bg-slate-100 text-slate-700 border-slate-300",
};

export const SOURCE_SCOPE_LABEL: Record<SourceScope, string> = {
  general: "General (aplica a todos)",
  mode_specific: "Específico de una modalidad",
  mixed: "Mixto (secciones por modalidad)",
  unclear: "No surge con claridad",
};

export const MODE_CONFIDENCE_LABEL: Record<ModeConfidence, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  unknown: "Desconocida",
};

// --- Taxonomía de software (IA vs software tradicional) ---
export const COMPARISON_GROUP_LABEL: Record<string, string> = {
  ai: "IA",
  traditional_software: "Software tradicional",
  social_platform: "Redes sociales",
  mobile_ecosystem: "Ecosistemas móviles",
};

export const SOFTWARE_CATEGORY_LABEL: Record<string, string> = {
  ai_provider: "Proveedor de IA",
  email: "Correo",
  productivity_suite: "Productividad",
  social_network: "Red social",
  mobile_operating_system: "Sistema operativo móvil",
  mobile_device_ecosystem: "Ecosistema de dispositivos",
  developer_platform: "Plataforma de desarrollo",
  cloud_platform: "Plataforma cloud",
  other: "Otro",
};

export const SIGNAL_LABEL: Record<string, string> = {
  no_training_commitment: "Compromiso de no entrenamiento",
  broad_training_use: "Uso amplio para entrenamiento/mejora",
  enterprise_dpa: "DPA / términos de procesamiento de datos",
  retention_controls: "Controles de retención",
  deletion_control: "Control de eliminación de datos",
  unclear_deletion: "Eliminación poco clara",
  confidentiality_commitment: "Compromiso de confidencialidad",
  broad_license: "Licencia amplia sobre el contenido",
};
