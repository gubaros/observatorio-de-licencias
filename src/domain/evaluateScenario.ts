/**
 * Motor de orientación preliminar por escenario de uso jurídico.
 *
 * DETERMINÍSTICO, sin LLM, sin red. Evalúa CADA documento analizado por separado
 * y NO agrega señales entre documentos de un mismo proveedor: un compromiso de
 * confidencialidad o un DPA que aparece en un documento comercial NO mejora el
 * perfil de un documento general/gratuito (regla anti-fuga). Cada resultado cita
 * los campos reales que lo motivaron y referencia el id del análisis fuente.
 *
 * Nunca afirma legalidad/seguridad: produce señales prudentes para priorizar
 * revisión legal humana.
 */

import type { LicenseAnalysis, PrivacyPosture } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import type { ContractingMode } from "@/lib/contractingModes";
import { MODE_LABELS } from "@/lib/contractingModes";
import { CATEGORY_BY_KEY } from "@/lib/categories";
import { SIGNAL_LABEL } from "@/lib/analysisMeta";
import { SCENARIO_BY_ID, type LegalUseScenario } from "./legalUseScenarios";

export type Recommendation =
  | "preferred_with_conditions"
  | "usable_with_caution"
  | "requires_contract_review"
  | "not_recommended_without_enterprise"
  | "insufficient_information";

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  preferred_with_conditions: "Uso preferente con condiciones",
  usable_with_caution: "Usable con cautela",
  requires_contract_review: "Requiere revisión contractual",
  not_recommended_without_enterprise: "No recomendado sin modalidad enterprise/DPA",
  insufficient_information: "Información insuficiente",
};

const RECOMMENDATION_RANK: Record<Recommendation, number> = {
  preferred_with_conditions: 0,
  usable_with_caution: 1,
  requires_contract_review: 2,
  not_recommended_without_enterprise: 3,
  insufficient_information: 4,
};

export type Confidence = "low" | "medium" | "high";
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

export interface ScenarioResult {
  scenarioId: string;
  analysisId: string;
  providerName: string;
  productName: string;
  documentType: string;
  contractingMode: ContractingMode;
  appliesToModes: ContractingMode[];
  sourceScope: string;
  recommendation: Recommendation;
  confidence: Confidence;
  reasons: string[];
  cautions: string[];
  missingEvidence: string[];
  sourceAnalysisIds: string[];
  privacyPosture: PrivacyPosture;
  overallRiskLevel: RiskLevel;
  reviewStatus: string;
}

const RISK_WORD: Record<string, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "desconocido" };
const ENTERPRISE_MODES: ContractingMode[] = ["business", "enterprise", "api"];

const catLabel = (k: string) => CATEGORY_BY_KEY[k]?.label ?? k;
const sigLabel = (s: string) => SIGNAL_LABEL[s] ?? s;

/**
 * Evalúa un escenario contra los análisis. Devuelve un resultado por documento,
 * ordenado de la orientación más favorable a la menos favorable.
 */
export function evaluateScenario(scenarioId: string, analyses: LicenseAnalysis[]): ScenarioResult[] {
  const scenario = SCENARIO_BY_ID[scenarioId];
  if (!scenario || scenario.kind !== "evaluable") return [];

  return analyses
    .map((a) => evaluateOne(scenario, a))
    .sort(
      (x, y) =>
        RECOMMENDATION_RANK[x.recommendation] - RECOMMENDATION_RANK[y.recommendation] ||
        CONFIDENCE_RANK[y.confidence] - CONFIDENCE_RANK[x.confidence] ||
        x.providerName.localeCompare(y.providerName),
    );
}

function evaluateOne(s: LegalUseScenario, a: LicenseAnalysis): ScenarioResult {
  const sigs = new Set(a.privacy.signals);
  const has = (sig: string) => sigs.has(sig);
  const posPresent = s.positiveSignals.filter(has);
  const negPresent = s.negativeSignals.filter(has);

  const catFound = (k: string) => a.categories[k]?.status === "found";
  const catPresent = (k: string) => {
    const st = a.categories[k]?.status;
    return st === "found" || st === "unclear";
  };
  const prioFound = s.priorityCategories.filter(catFound);
  const prioMissing = s.priorityCategories.filter((k) => !catPresent(k));

  const posture = a.privacy.posture;
  const risk = a.overall.overallRiskLevel;
  const review = a.metadata.reviewStatus;

  // Evidencia enterprise REAL del propio documento (no inferida de appliesToModes
  // ni heredada de otro documento del proveedor).
  const isEnterpriseDoc = a.sourceScope === "mode_specific" || ENTERPRISE_MODES.includes(a.contractingMode);
  const dpaInGeneralDoc = !isEnterpriseDoc && has("enterprise_dpa");

  const recommendation = decide(s, {
    posture,
    posPresent,
    negPresent,
    prioFound,
    prioTotal: s.priorityCategories.length,
    risk,
    isEnterpriseDoc,
    hasConfidentiality: has("confidentiality_commitment"),
    hasNoTraining: has("no_training_commitment"),
    hasBroadTraining: has("broad_training_use"),
  });

  const coverage = s.priorityCategories.length ? prioFound.length / s.priorityCategories.length : 0;
  const confidence: Confidence =
    recommendation === "insufficient_information" || posture === "unknown"
      ? "low"
      : a.metadata.sourceVerified && coverage >= 0.5
        ? "high"
        : "medium";

  // --- Motivos (cada uno nombra el campo real que lo disparó) ---
  const reasons: string[] = [];
  for (const k of prioFound) reasons.push(`Se detectaron cláusulas vinculadas a ${catLabel(k)}.`);
  for (const sig of posPresent) reasons.push(`Señal a favor: ${sigLabel(sig)}.`);
  if (isEnterpriseDoc) {
    reasons.push(`Documento de modalidad específica (${MODE_LABELS[a.contractingMode] ?? "diferenciada"}).`);
  } else if (a.appliesToModes.length > 0) {
    reasons.push(`El documento aplica a: ${a.appliesToModes.map((m) => MODE_LABELS[m]).join(", ")}.`);
  }
  if (reasons.length === 0) reasons.push("No se hallaron señales relevantes para este escenario en el documento.");

  // --- Cautelas ---
  const cautions: string[] = [];
  for (const sig of negPresent) cautions.push(`Señal de riesgo: ${sigLabel(sig)}.`);
  if (risk === "high" || risk === "medium") {
    cautions.push(`Riesgo contractual ${RISK_WORD[risk]}: revisar limitación de responsabilidad, indemnidad y arbitraje.`);
  }
  if (dpaInGeneralDoc) {
    cautions.push("El documento menciona condiciones enterprise/DPA; no se puede asumir que apliquen a una modalidad gratuita o individual.");
  }
  if (review === "unreviewed" || review === "needs_legal_review") {
    cautions.push("Análisis sin revisión legal humana.");
  }
  if (s.warning) cautions.push(s.warning);

  // --- Evidencia faltante ---
  const missingEvidence: string[] = prioMissing.map((k) => `No se encontró evidencia de ${catLabel(k)}.`);
  if ((s.sensitivity === "high" || s.sensitivity === "critical") && !isEnterpriseDoc) {
    missingEvidence.push("No surge una modalidad enterprise/business/API diferenciada con compromisos claros.");
  }

  return {
    scenarioId: s.id,
    analysisId: a.id,
    providerName: a.providerName,
    productName: a.productName,
    documentType: a.documentType,
    contractingMode: a.contractingMode,
    appliesToModes: a.appliesToModes,
    sourceScope: a.sourceScope,
    recommendation,
    confidence,
    reasons,
    cautions,
    missingEvidence,
    sourceAnalysisIds: [a.id],
    privacyPosture: posture,
    overallRiskLevel: risk,
    reviewStatus: review,
  };
}

interface DecideInput {
  posture: PrivacyPosture;
  posPresent: string[];
  negPresent: string[];
  prioFound: string[];
  prioTotal: number;
  risk: RiskLevel;
  isEnterpriseDoc: boolean;
  hasConfidentiality: boolean;
  hasNoTraining: boolean;
  hasBroadTraining: boolean;
}

/** Regla determinística de recomendación. Prudente y anti-fuga. */
function decide(s: LegalUseScenario, d: DecideInput): Recommendation {
  // 1) Sin evidencia → información insuficiente.
  if (d.posture === "unknown" && d.prioFound.length === 0 && d.posPresent.length === 0) {
    return "insufficient_information";
  }

  // 2) Crítico (secreto profesional): solo orientación favorable con doc específico
  //    enterprise + compromisos claros; si no, no se recomienda sin enterprise.
  if (s.sensitivity === "critical") {
    if (!d.isEnterpriseDoc) return "not_recommended_without_enterprise";
    if (d.hasConfidentiality && d.hasNoTraining && !d.hasBroadTraining) return "usable_with_caution";
    return "requires_contract_review";
  }

  // 3) Alto: la evidencia enterprise debe ser del propio documento (no heredada).
  if (s.sensitivity === "high") {
    if (!d.isEnterpriseDoc) {
      return d.hasBroadTraining ? "not_recommended_without_enterprise" : "requires_contract_review";
    }
    if (d.hasConfidentiality && !d.hasBroadTraining) {
      return d.posPresent.length >= 2 ? "preferred_with_conditions" : "usable_with_caution";
    }
    return "requires_contract_review";
  }

  // 4) Bajo / medio: puntaje transparente.
  const postureAdj: Record<string, number> = { strong: 2, moderate: 1, weak: -1, unknown: 0 };
  const riskAdj: Record<string, number> = { high: -2, medium: -1, low: 0, unknown: 0 };
  const score =
    d.posPresent.length * 2 +
    d.prioFound.length -
    d.negPresent.length * 2 +
    (postureAdj[d.posture] ?? 0) +
    (riskAdj[d.risk] ?? 0);

  // "Preferente" exige evidencia real (señal a favor o cobertura sustantiva de categorías).
  const strongEvidence = d.posPresent.length >= 1 || d.prioFound.length >= Math.max(3, Math.ceil(d.prioTotal * 0.6));
  if (score >= 4 && strongEvidence) return "preferred_with_conditions";
  if (score >= 2) return "usable_with_caution";
  if (score >= 0) return "requires_contract_review";
  return "not_recommended_without_enterprise";
}
