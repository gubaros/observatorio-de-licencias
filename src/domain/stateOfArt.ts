/**
 * Lectura determinística del "Estado del arte" del corpus.
 *
 * `buildStateOfArtOpinion` agrega los análisis por PRODUCTO (proveedor+producto)
 * y deriva, SOLO a partir de los JSON disponibles, tres scores transparentes:
 *   - restrictivenessScore        (cuán restrictivo es el clausulado)
 *   - legalPracticeExposureScore  (cuánto expone la práctica legal del usuario)
 *   - professionalUseReadinessScore (posición documental para uso profesional)
 *
 * Reglas:
 *   - No se hardcodean proveedores ni productos.
 *   - No se fabrican conclusiones: cada señal apunta a un documento (id de
 *     dossier), una categoría y, cuando existe, evidencia textual.
 *   - El lenguaje es académico y condicional ("según el corpus actual…").
 *
 * Las conclusiones identifican un producto "más restrictivo" o "más expuesto"
 * SEGÚN EL CORPUS ANALIZADO; no son verdad universal ni ranking de calidad.
 */

import type { LicenseAnalysis, CategoryFinding, Evidence } from "@/lib/schema";
import { providerKey } from "@/lib/derive";
import { computeCorpusSignature, type CorpusSignature } from "@/domain/corpusSignature";

// --- Tipos públicos --------------------------------------------------------

export interface ScoreSignal {
  key: string;
  label: string;
  weight: number;
  /** id del análisis (link a /analysis/[id]) que sostiene la señal. */
  documentId: string | null;
  documentType: string | null;
  evidence: Evidence | null;
}

export interface ProductScore {
  value: number;
  signals: ScoreSignal[];
  sourceDocuments: string[];
  rationale: string;
}

export interface ProductReading {
  productKey: string;
  providerId: string;
  providerName: string;
  productName: string;
  /** ids de análisis del producto, para enlazar dossiers. */
  documents: { id: string; documentType: string }[];
  restrictiveness: ProductScore;
  exposure: ProductScore;
  readiness: ProductScore;
}

export interface CautionZone {
  categoryKey: string;
  label: string;
  count: number;
  total: number;
  exampleDocumentId: string | null;
}

export interface StateOfArtOpinion {
  signature: CorpusSignature;
  corpus: {
    documents: number;
    products: number;
    providers: number;
    aiProducts: number;
    baselineProducts: number;
  };
  generalReading: string;
  mostRestrictive: ProductReading | null;
  mostExposed: ProductReading | null;
  bestForProfessional: ProductReading[];
  cautionZones: CautionZone[];
  appreciations: string[];
  limits: string[];
  insufficientEvidence: boolean;
}

// --- Helpers de agregación -------------------------------------------------

const POSTURE_RANK: Record<string, number> = { strong: 3, moderate: 2, weak: 1, unknown: 0 };

interface ProductAgg {
  productKey: string;
  providerId: string;
  providerName: string;
  productName: string;
  isBaseline: boolean;
  analyses: LicenseAnalysis[];
}

function aggregateByProduct(analyses: LicenseAnalysis[]): ProductAgg[] {
  const map = new Map<string, ProductAgg>();
  for (const a of analyses) {
    const key = `${a.providerName}__${a.productName}`;
    const agg = map.get(key) ?? {
      productKey: key,
      providerId: providerKey(a),
      providerName: a.providerName,
      productName: a.productName,
      isBaseline: a.comparativeBaseline === true,
      analyses: [],
    };
    agg.analyses.push(a);
    map.set(key, agg);
  }
  return [...map.values()];
}

/** Primer análisis donde la categoría está "found" (con su evidencia). */
function firstFound(agg: ProductAgg, key: string): { a: LicenseAnalysis; f: CategoryFinding } | null {
  for (const a of agg.analyses) {
    const f = a.categories[key];
    if (f?.status === "found") return { a, f };
  }
  return null;
}

function anyClauseFunction(agg: ProductAgg, key: string, fn: string): { a: LicenseAnalysis; f: CategoryFinding } | null {
  for (const a of agg.analyses) {
    const f = a.categories[key];
    if (f?.status === "found" && f.clauseFunction === fn) return { a, f };
  }
  return null;
}

function categoryUnclearOrAbsent(agg: ProductAgg, key: string): boolean {
  return agg.analyses.every((a) => a.categories[key]?.status !== "found");
}

function hasPrivacySignal(agg: ProductAgg, signal: string): boolean {
  return agg.analyses.some((a) => a.privacy.signals.includes(signal));
}

function weakestPosture(agg: ProductAgg): string {
  return agg.analyses
    .map((a) => a.privacy.posture)
    .reduce((acc, p) => ((POSTURE_RANK[p] ?? 0) < (POSTURE_RANK[acc] ?? 0) ? p : acc), agg.analyses[0]?.privacy.posture ?? "unknown");
}

function isDifferentiated(agg: ProductAgg): boolean {
  return agg.analyses.some((a) => a.sourceScope === "mode_specific" || a.sourceScope === "mixed");
}

function mkSignal(key: string, label: string, weight: number, hit: { a: LicenseAnalysis; f: CategoryFinding } | null): ScoreSignal {
  return {
    key,
    label,
    weight,
    documentId: hit?.a.id ?? null,
    documentType: hit?.a.documentType ?? null,
    evidence: hit?.f.evidence[0] ?? null,
  };
}

function finalize(signals: ScoreSignal[], rationale: string): ProductScore {
  const value = signals.reduce((n, s) => n + s.weight, 0);
  const sourceDocuments = Array.from(new Set(signals.map((s) => s.documentId).filter((d): d is string => !!d)));
  return { value, signals, sourceDocuments, rationale };
}

// --- Scores ----------------------------------------------------------------

function scoreRestrictiveness(agg: ProductAgg): ProductScore {
  const s: ScoreSignal[] = [];
  const restr = firstFound(agg, "prohibited_content");
  if (restr) s.push(mkSignal("use_restrictions", "Restricciones de uso explícitas", 1, restr));
  const prohibited = anyClauseFunction(agg, "prohibited_content", "prohibited_use");
  if (prohibited) s.push(mkSignal("model_use_ban", "Prohibición de scraping, destilación o entrenamiento de modelos por el usuario", 1, prohibited));
  const lic = firstFound(agg, "license_grant");
  if (lic && lic.f.riskLevel === "high") s.push(mkSignal("broad_license", "Licencia amplia sobre el contenido del usuario", 1, lic));
  const out = firstFound(agg, "output_ip");
  if (out && (out.f.riskLevel === "high" || out.f.riskLevel === "medium")) s.push(mkSignal("output_limits", "Límites sobre los outputs", 1, out));
  const warr = firstFound(agg, "warranties");
  if (warr) s.push(mkSignal("disclaimers", "Disclaimers de garantías fuertes", 1, warr));
  const liab = firstFound(agg, "liability_limitation");
  if (liab) s.push(mkSignal("liability", "Limitación de responsabilidad", 1, liab));
  const ind = firstFound(agg, "indemnity");
  if (ind) s.push(mkSignal("indemnity", "Indemnidad a cargo del usuario", 1, ind));
  const arb = firstFound(agg, "arbitration");
  if (arb) s.push(mkSignal("arbitration", "Arbitraje o renuncia a acciones colectivas", 1, arb));
  const chg = firstFound(agg, "unilateral_changes");
  if (chg) s.push(mkSignal("unilateral_changes", "Modificación unilateral de términos", 1, chg));
  return finalize(
    s,
    "Suma de cláusulas restrictivas detectadas (restricciones de uso, prohibiciones sobre modelos, licencia amplia, disclaimers, limitación de responsabilidad, indemnidad, arbitraje y cambios unilaterales).",
  );
}

function scoreExposure(agg: ProductAgg): ProductScore {
  const s: ScoreSignal[] = [];
  const training = firstFound(agg, "training_use");
  if (training || hasPrivacySignal(agg, "broad_training_use")) {
    s.push(mkSignal("training_use", "Posible uso de datos para entrenamiento o mejora de modelos", 1, training));
  }
  if (!hasPrivacySignal(agg, "no_training_commitment")) {
    s.push(mkSignal("no_no_training", "Sin compromiso claro de no entrenamiento", 1, null));
  }
  const posture = weakestPosture(agg);
  if (posture === "weak") s.push(mkSignal("privacy_weak", "Perfil preliminar de privacidad débil", 2, firstFound(agg, "privacy")));
  else if (posture === "moderate") s.push(mkSignal("privacy_moderate", "Perfil preliminar de privacidad intermedio", 1, firstFound(agg, "privacy")));
  if (categoryUnclearOrAbsent(agg, "data_retention")) s.push(mkSignal("retention_unclear", "Retención de datos poco clara", 1, null));
  if (categoryUnclearOrAbsent(agg, "data_deletion") || hasPrivacySignal(agg, "unclear_deletion")) s.push(mkSignal("deletion_unclear", "Eliminación de datos poco clara", 1, null));
  if (categoryUnclearOrAbsent(agg, "confidentiality")) s.push(mkSignal("confidentiality_absent", "Confidencialidad ausente o ambigua", 1, null));
  if (!hasPrivacySignal(agg, "enterprise_dpa")) s.push(mkSignal("no_dpa", "Sin DPA ni términos enterprise/business claros", 1, null));
  const lic = firstFound(agg, "license_grant");
  if (lic && lic.f.riskLevel === "high") s.push(mkSignal("broad_license", "Licencia amplia sobre el contenido", 1, lic));
  if (!isDifferentiated(agg)) s.push(mkSignal("general_scope", "Modalidad general no diferenciada", 1, null));
  const forum = firstFound(agg, "jurisdiction") ?? firstFound(agg, "governing_law");
  if (forum && firstFound(agg, "arbitration")) {
    s.push(mkSignal("foreign_forum", "Foro y remedios fuera de la jurisdicción del usuario (relevante para usuarios latinoamericanos)", 1, forum));
  }
  return finalize(
    s,
    "Suma de señales que aumentan la exposición de la práctica legal del usuario (uso de datos para entrenamiento, ausencia de no-entrenamiento, privacidad débil, retención/eliminación/confidencialidad poco claras, ausencia de DPA, licencia amplia, modalidad no diferenciada y foro/remedios foráneos).",
  );
}

function scoreReadiness(agg: ProductAgg): ProductScore {
  const s: ScoreSignal[] = [];
  if (hasPrivacySignal(agg, "enterprise_dpa")) s.push(mkSignal("dpa", "Acuerdo de tratamiento de datos (DPA) disponible", 2, null));
  if (hasPrivacySignal(agg, "no_training_commitment")) s.push(mkSignal("no_training", "Compromiso de no entrenamiento con datos del usuario", 2, null));
  const conf = firstFound(agg, "confidentiality");
  if (conf) s.push(mkSignal("confidentiality", "Obligación de confidencialidad", 1, conf));
  if (isDifferentiated(agg)) s.push(mkSignal("differentiated", "Documentos diferenciados por modalidad de contratación", 1, null));
  if (firstFound(agg, "data_retention") && firstFound(agg, "data_deletion")) s.push(mkSignal("data_controls", "Controles de retención y eliminación de datos", 1, firstFound(agg, "data_retention")));
  const posture = weakestPosture(agg);
  if (posture === "strong") s.push(mkSignal("privacy_strong", "Perfil preliminar de privacidad fuerte", 2, firstFound(agg, "privacy")));
  else if (posture === "moderate") s.push(mkSignal("privacy_moderate", "Perfil preliminar de privacidad intermedio", 1, firstFound(agg, "privacy")));
  return finalize(
    s,
    "Suma de señales que mejoran la posición documental para uso profesional (DPA, compromiso de no entrenamiento, confidencialidad, documentos diferenciados por modalidad y controles de datos).",
  );
}

// --- Selección y prosa -----------------------------------------------------

function toReading(agg: ProductAgg): ProductReading {
  return {
    productKey: agg.productKey,
    providerId: agg.providerId,
    providerName: agg.providerName,
    productName: agg.productName,
    documents: agg.analyses.map((a) => ({ id: a.id, documentType: a.documentType })),
    restrictiveness: scoreRestrictiveness(agg),
    exposure: scoreExposure(agg),
    readiness: scoreReadiness(agg),
  };
}

/** Desempata por mayor score; luego más documentos; luego nombre estable. */
function pickMax(readings: ProductReading[], score: (r: ProductReading) => number): ProductReading | null {
  let best: ProductReading | null = null;
  for (const r of readings) {
    if (score(r) <= 0) continue;
    if (
      best === null ||
      score(r) > score(best) ||
      (score(r) === score(best) && r.documents.length > best.documents.length) ||
      (score(r) === score(best) && r.documents.length === best.documents.length && r.productKey.localeCompare(best.productKey) < 0)
    ) {
      best = r;
    }
  }
  return best;
}

const CAUTION_CATEGORIES: { key: string; label: string }[] = [
  { key: "liability_limitation", label: "Limitación de responsabilidad" },
  { key: "arbitration", label: "Arbitraje o renuncia a acciones colectivas" },
  { key: "training_use", label: "Uso de datos para entrenamiento por el proveedor" },
  { key: "license_grant", label: "Licencia amplia sobre el contenido del usuario" },
  { key: "unilateral_changes", label: "Modificación unilateral de términos" },
  { key: "indemnity", label: "Indemnidad a cargo del usuario" },
];

function buildCautionZones(aiAnalyses: LicenseAnalysis[]): CautionZone[] {
  const total = aiAnalyses.length;
  const zones: CautionZone[] = [];
  for (const { key, label } of CAUTION_CATEGORIES) {
    let count = 0;
    let exampleDocumentId: string | null = null;
    for (const a of aiAnalyses) {
      if (a.categories[key]?.status === "found") {
        count++;
        if (!exampleDocumentId) exampleDocumentId = a.id;
      }
    }
    if (count > 0) zones.push({ categoryKey: key, label, count, total, exampleDocumentId });
  }
  return zones.sort((a, b) => b.count - a.count);
}

export function buildStateOfArtOpinion(analyses: LicenseAnalysis[]): StateOfArtOpinion {
  const signature = computeCorpusSignature(analyses);
  const products = aggregateByProduct(analyses);
  const aiProducts = products.filter((p) => !p.isBaseline);
  const baselineProducts = products.filter((p) => p.isBaseline);
  const aiAnalyses = aiProducts.flatMap((p) => p.analyses);

  const readings = aiProducts.map(toReading);
  const mostRestrictive = pickMax(readings, (r) => r.restrictiveness.value);
  const mostExposed = pickMax(readings, (r) => r.exposure.value);
  const bestForProfessional = [...readings]
    .filter((r) => r.readiness.value > 0)
    .sort((a, b) => b.readiness.value - a.readiness.value || a.productKey.localeCompare(b.productKey))
    .slice(0, 3);

  const cautionZones = buildCautionZones(aiAnalyses);
  const insufficientEvidence = aiProducts.length === 0 || (!mostRestrictive && !mostExposed);

  const providers = new Set(analyses.map((a) => a.providerName)).size;
  const corpus = {
    documents: analyses.length,
    products: products.length,
    providers,
    aiProducts: aiProducts.length,
    baselineProducts: baselineProducts.length,
  };

  const modeSpecific = aiAnalyses.filter((a) => a.sourceScope === "mode_specific" || a.sourceScope === "mixed").length;
  const general = aiAnalyses.filter((a) => a.sourceScope === "general").length;

  const generalReading =
    `Según el corpus actual —${corpus.documents} documentos de ${corpus.products} productos (${corpus.aiProducts} de IA y ` +
    `${corpus.baselineProducts} de software cotidiano incorporados como referencia)— la evidencia disponible sugiere que ` +
    `las cláusulas con mayor peso jurídico se concentran en ${cautionZones.slice(0, 3).map((z) => z.label.toLowerCase()).join(", ") || "categorías diversas"}. ` +
    `Esta lectura es preliminar: se apoya en coincidencias léxicas con análisis de dirección jurídica, no en interpretación jurídica, y se circunscribe a los productos de IA del corpus.`;

  const appreciations = [
    `El corpus distingue ${corpus.aiProducts} productos de IA de ${corpus.baselineProducts} de software cotidiano incorporados como referencia: varios riesgos (analytics, licencias amplias, foros foráneos) preceden a la IA y no son exclusivos de ella.`,
    `La modalidad de contratación cambia el régimen aplicable: ${modeSpecific} documentos del corpus de IA son específicos o mixtos por modalidad y ${general} son de aplicación general. Las condiciones de una modalidad no se trasladan automáticamente a otra.`,
    `Documentos generales y documentos específicos no son intercambiables: un mismo producto puede tener un ToS de consumo y términos comerciales distintos; conviene leer el que aplica a cómo se contrata.`,
    `Trasladar condiciones enterprise (DPA, compromiso de no entrenamiento, confidencialidad reforzada) a una cuenta gratuita o individual es un error frecuente: esos compromisos suelen vivir en los documentos comerciales, no en el consumo.`,
    `Privacy Policy, Terms of Service, DPA, product terms y usage policies regulan aspectos distintos; leer uno solo puede inducir a error sobre el régimen completo.`,
    `El parser distingue la dirección jurídica de la cláusula: cuando una cláusula impone obligaciones al usuario (p. ej. "no entrenarás modelos con los outputs") y no al proveedor, se reclasifica como uso prohibido y deja de contar como uso de datos por el proveedor.`,
  ];

  const limits = [
    `Esta lectura depende de los documentos disponibles al momento de la firma del corpus (sha256:${signature.shortHash}, ${signature.documentCount} documentos, actualizado ${signature.lastUpdated}) y cambia si cambia el corpus.`,
    "La detección es léxica y preliminar; no reemplaza la lectura del texto fuente ni la revisión legal humana.",
    "La mayoría de los documentos no fue validada por una persona abogada; las fuentes son públicas y se modifican con frecuencia.",
    'Identificar un producto "más restrictivo" o "más expuesto" lo es según el corpus analizado, no como verdad universal ni como ranking de calidad o recomendación comercial.',
  ];

  return {
    signature,
    corpus,
    generalReading,
    mostRestrictive,
    mostExposed,
    bestForProfessional,
    cautionZones,
    appreciations,
    limits,
    insufficientEvidence,
  };
}

/** Top-N señales por peso (para mostrar "3 razones principales"). */
export function topSignals(score: ProductScore, n: number): ScoreSignal[] {
  return [...score.signals].sort((a, b) => b.weight - a.weight).slice(0, n);
}
