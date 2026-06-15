/**
 * Escenarios de uso jurídico.
 *
 * Capa de DECISIÓN de UP-Law-AILO: en vez de arrancar por métricas, el usuario
 * elige "para qué" quiere usar una herramienta de IA y el motor determinístico
 * (ver `evaluateScenario`) ordena los documentos analizados según ese escenario.
 *
 * Cada escenario declara, en términos de los CAMPOS REALES de los análisis:
 *  - priorityCategories: claves de `src/lib/categories.ts`.
 *  - positive/negativeSignals: claves de `privacy.signals` (las que el parser realmente emite).
 *  - preferredModes: modalidades de `src/lib/contractingModes.ts`.
 *
 * Nada de esto es asesoramiento legal: son señales para priorizar revisión humana.
 */

import type { ContractingMode } from "@/lib/contractingModes";

export type Sensitivity = "low" | "medium" | "high" | "critical";

export interface LegalUseScenario {
  id: string;
  /**
   * "evaluable": pasa por el motor. "navigation": atajo a una vista existente.
   * "academic": comparación académica (no per-documento); linkea a una vista.
   */
  kind: "evaluable" | "navigation" | "academic";
  /** Frase nominal para el encabezado de la vista de escenario. */
  title: string;
  /** Etiqueta para la tarjeta de la home ("Usar IA con…"). */
  cardLabel: string;
  /** Descripción breve (una línea) para tarjetas livianas. */
  short: string;
  description: string;
  sensitivity: Sensitivity;
  /** Claves de categoría (src/lib/categories.ts) que pesan en este escenario. */
  priorityCategories: string[];
  preferredModes: ContractingMode[];
  /** Claves de privacy.signals que cuentan a favor. */
  positiveSignals: string[];
  /** Claves de privacy.signals que cuentan en contra. */
  negativeSignals: string[];
  warning: string;
  plainLanguageExplanation: string;
  legalExplanation: string;
  /** Si aparece como tarjeta principal en la home (las 4 curadas). */
  featuredOnHome: boolean;
  /** Solo para kind "navigation". */
  targetHref?: string;
}

export const LEGAL_USE_SCENARIOS: LegalUseScenario[] = [
  {
    id: "public_information",
    kind: "evaluable",
    title: "Información pública",
    cardLabel: "Usar IA con información pública",
    short: "Evalúa uso comercial, propiedad del output y restricciones de uso.",
    description:
      "Evalúa el uso de IA cuando no se ingresan datos personales ni información reservada: el foco está en uso comercial, propiedad del output, restricciones y responsabilidad.",
    sensitivity: "low",
    priorityCategories: ["commercial_use", "output_ip", "prohibited_content", "warranties", "liability_limitation"],
    preferredModes: ["free", "paid_individual", "api"],
    positiveSignals: [],
    negativeSignals: ["broad_license"],
    warning:
      "Aun con información pública, revisá la propiedad del output y las restricciones de uso comercial antes de explotar lo generado.",
    plainLanguageExplanation:
      "Si solo usás información pública, lo que más importa es si podés usar el resultado con fines comerciales y de quién es lo que genera la IA. La privacidad pesa menos.",
    legalExplanation:
      "Sin tratamiento de datos personales, el análisis prioriza habilitación de uso comercial, titularidad del output, licencias amplias sobre el contenido, disclaimers de garantía y limitación de responsabilidad.",
    featuredOnHome: true,
  },
  {
    id: "personal_data",
    kind: "evaluable",
    title: "Datos personales",
    cardLabel: "Usar IA con datos personales",
    short: "Evalúa privacidad, entrenamiento con datos, retención, eliminación y DPA.",
    description:
      "Evalúa proveedores y modalidades considerando privacidad, entrenamiento con datos, retención, eliminación, seguridad, DPA y jurisdicción.",
    sensitivity: "high",
    priorityCategories: ["privacy", "training_use", "data_retention", "data_deletion", "security", "jurisdiction"],
    preferredModes: ["enterprise", "business", "api", "paid_individual"],
    positiveSignals: ["no_training_commitment", "retention_controls", "deletion_control", "enterprise_dpa"],
    negativeSignals: ["broad_training_use", "unclear_deletion", "broad_license"],
    warning:
      "El tratamiento de datos personales puede exigir base legal, DPA y garantías de transferencia internacional. No trasladar condiciones enterprise a una modalidad gratuita o individual.",
    plainLanguageExplanation:
      "Si vas a ingresar datos personales, importa si el proveedor los usa para entrenar, cuánto los guarda, si los borra y qué seguridad ofrece.",
    legalExplanation:
      "Con datos personales el análisis prioriza tratamiento y finalidades, uso para entrenamiento, plazos de retención, mecanismos de supresión, medidas de seguridad, disponibilidad de DPA y ley/jurisdicción aplicable.",
    featuredOnHome: true,
  },
  {
    id: "confidential_business_information",
    kind: "evaluable",
    title: "Información confidencial",
    cardLabel: "Usar IA con información confidencial",
    short: "Evalúa confidencialidad, entrenamiento, retención, eliminación y modalidad contractual.",
    description:
      "Evalúa proveedores y modalidades considerando no-entrenamiento, confidencialidad, retención, eliminación, seguridad, licencias al proveedor y modalidad business/enterprise/API.",
    sensitivity: "high",
    priorityCategories: ["confidentiality", "training_use", "data_retention", "data_deletion", "security", "license_grant"],
    preferredModes: ["business", "enterprise", "api"],
    positiveSignals: ["confidentiality_commitment", "no_training_commitment", "retention_controls", "deletion_control", "enterprise_dpa"],
    negativeSignals: ["broad_training_use", "broad_license", "unclear_deletion"],
    warning:
      "La confidencialidad de información comercial suele requerir condiciones business/enterprise. Una cláusula presente en un documento general no garantiza su aplicación a una modalidad gratuita.",
    plainLanguageExplanation:
      "Para secretos comerciales conviene que el proveedor se comprometa a no entrenar con tus datos, a mantener confidencialidad y a darte controles de retención y borrado.",
    legalExplanation:
      "Para información comercial reservada el análisis prioriza obligaciones de confidencialidad, exclusión de entrenamiento, retención/eliminación, seguridad, alcance de la licencia conferida al proveedor y la modalidad contractual.",
    featuredOnHome: true,
  },
  {
    id: "client_confidential_information",
    kind: "evaluable",
    title: "Trabajo jurídico de clientes",
    cardLabel: "Usar IA para trabajo jurídico de clientes",
    short: "Evalúa confidencialidad, no-entrenamiento, DPA, retención y modalidad contractual.",
    description:
      "Evalúa el uso de IA cuando se procesan antecedentes, documentos o información entregada por clientes.",
    sensitivity: "high",
    priorityCategories: ["confidentiality", "training_use", "data_retention", "data_deletion", "security", "jurisdiction", "privacy"],
    preferredModes: ["enterprise", "business", "api"],
    positiveSignals: ["confidentiality_commitment", "no_training_commitment", "enterprise_dpa", "retention_controls", "deletion_control"],
    negativeSignals: ["broad_training_use", "broad_license", "unclear_deletion"],
    warning:
      "El trabajo con información de clientes compromete deberes profesionales. Preferir modalidades enterprise/business/API con evidencia de confidencialidad y no-entrenamiento; no trasladar esas condiciones a usuarios gratuitos.",
    plainLanguageExplanation:
      "Si subís información de un cliente, conviene una modalidad empresarial con compromiso de no entrenar, confidencialidad y DPA. Sin eso, requiere revisión contractual.",
    legalExplanation:
      "Con información de clientes el análisis prioriza confidencialidad, exclusión de entrenamiento, DPA, retención/eliminación, seguridad, jurisdicción y la existencia de una modalidad enterprise/business/API diferenciada.",
    featuredOnHome: true,
  },
  {
    id: "attorney_client_privilege",
    kind: "evaluable",
    title: "Secreto profesional / información privilegiada",
    cardLabel: "Usar IA bajo secreto profesional o información privilegiada",
    short: "Escenario restrictivo para información privilegiada o bajo secreto profesional.",
    description:
      "Escenario más restrictivo: información amparada por secreto profesional o privilegio abogado-cliente.",
    sensitivity: "critical",
    priorityCategories: ["confidentiality", "training_use", "security", "data_retention", "data_deletion", "jurisdiction"],
    preferredModes: ["enterprise", "business", "api"],
    positiveSignals: ["confidentiality_commitment", "no_training_commitment", "enterprise_dpa"],
    negativeSignals: ["broad_training_use", "broad_license", "unclear_deletion"],
    warning:
      "El secreto profesional exige máxima cautela. Sin una modalidad enterprise/business/API con compromisos claros de confidencialidad y no-entrenamiento, no se orienta su uso: requiere revisión contractual o información adicional.",
    plainLanguageExplanation:
      "Para información privilegiada, salvo una modalidad empresarial con compromisos claros, la orientación es no usarla sin revisión contractual previa.",
    legalExplanation:
      "Bajo secreto profesional el análisis es restrictivo: exige modalidad enterprise/business/API con confidencialidad y exclusión de entrenamiento explícitas, DPA y seguridad. En ausencia de evidencia diferenciada, no se emite orientación favorable.",
    featuredOnHome: false,
  },
  {
    id: "academic_research",
    kind: "evaluable",
    title: "Investigación académica",
    cardLabel: "Usar IA para investigación académica",
    short: "Evalúa uso permitido, propiedad del output y entrenamiento con datos.",
    description:
      "Evalúa uso permitido, propiedad intelectual, uso de datos para entrenamiento y restricciones de contenido (privacidad si hay datos personales).",
    sensitivity: "medium",
    priorityCategories: ["commercial_use", "output_ip", "input_ip", "training_use", "prohibited_content", "privacy"],
    preferredModes: ["free", "paid_individual", "api", "education"],
    positiveSignals: ["no_training_commitment"],
    negativeSignals: ["broad_training_use", "broad_license"],
    warning:
      "Revisá restricciones de uso y propiedad del output para publicación. Si la investigación involucra datos personales, aplican además las cautelas de ese escenario.",
    plainLanguageExplanation:
      "Para investigación importa si podés usar y publicar el resultado, de quién es, y si tus datos se usan para entrenar.",
    legalExplanation:
      "En investigación académica el análisis prioriza usos permitidos, titularidad de input/output, uso para entrenamiento y restricciones de contenido; la privacidad pesa solo si hay datos personales.",
    featuredOnHome: false,
  },
  {
    id: "internal_legal_ops",
    kind: "evaluable",
    title: "Operación legal interna",
    cardLabel: "Usar IA para operación legal interna",
    short: "Evalúa privacidad, seguridad, retención y confidencialidad en uso interno.",
    description:
      "Evalúa uso en flujos internos del área legal: privacidad, seguridad, retención, confidencialidad y responsabilidad, en modalidad team/business/enterprise.",
    sensitivity: "high",
    priorityCategories: ["privacy", "security", "data_retention", "confidentiality", "liability_limitation"],
    preferredModes: ["team", "business", "enterprise"],
    positiveSignals: ["confidentiality_commitment", "retention_controls", "deletion_control", "enterprise_dpa", "no_training_commitment"],
    negativeSignals: ["broad_training_use", "unclear_deletion"],
    warning:
      "Para uso interno organizacional, preferir modalidades team/business/enterprise con DPA y controles de retención. No asumir esas condiciones desde un documento general.",
    plainLanguageExplanation:
      "Para uso interno del equipo legal conviene una modalidad organizacional con seguridad, controles de retención y confidencialidad.",
    legalExplanation:
      "En operación legal interna el análisis prioriza privacidad, seguridad, retención, confidencialidad y limitación de responsabilidad, sobre modalidades team/business/enterprise.",
    featuredOnHome: false,
  },
  {
    id: "enterprise_api_use",
    kind: "evaluable",
    title: "Modalidad enterprise / API",
    cardLabel: "Usar IA en modalidad enterprise/API",
    short: "Evalúa términos de API/enterprise: DPA, seguridad, retención y no-entrenamiento.",
    description:
      "Evalúa términos de API/enterprise: DPA, seguridad, retención, no-entrenamiento, confidencialidad y limitación de responsabilidad.",
    sensitivity: "high",
    priorityCategories: ["api_references", "training_use", "data_retention", "security", "confidentiality", "liability_limitation"],
    preferredModes: ["api", "enterprise", "business"],
    positiveSignals: ["enterprise_dpa", "no_training_commitment", "retention_controls", "confidentiality_commitment"],
    negativeSignals: ["broad_training_use", "unclear_deletion"],
    warning:
      "Los términos de API/enterprise suelen estar en documentos específicos. Verificá que el documento analizado corresponda a esa modalidad y no a las condiciones generales.",
    plainLanguageExplanation:
      "Para uso por API o enterprise conviene revisar los términos específicos de esa modalidad: DPA, seguridad, retención y no-entrenamiento.",
    legalExplanation:
      "En uso enterprise/API el análisis prioriza términos de API, DPA, seguridad, retención, exclusión de entrenamiento, confidencialidad y limitación de responsabilidad, idealmente sobre documentos mode-specific.",
    featuredOnHome: false,
  },
  // --- Atajos de navegación (no pasan por el motor) ---
  {
    id: "provider_comparison",
    kind: "navigation",
    title: "Comparar proveedores y modalidades",
    cardLabel: "Comparar proveedores y modalidades",
    short: "Matriz de categorías jurídicas por proveedor y modalidad.",
    description: "Matriz de categorías jurídicas por proveedor y modalidad.",
    sensitivity: "low",
    priorityCategories: [],
    preferredModes: [],
    positiveSignals: [],
    negativeSignals: [],
    warning: "",
    plainLanguageExplanation: "",
    legalExplanation: "",
    featuredOnHome: false,
    targetHref: "/compare",
  },
  {
    id: "source_audit",
    kind: "navigation",
    title: "Auditar documentos fuente",
    cardLabel: "Auditar documentos fuente",
    short: "Registro documental: fuente, hash, texto y evidencia por análisis.",
    description: "Registro documental: fuente, hash, texto extraído, evidencia y parser por análisis.",
    sensitivity: "low",
    priorityCategories: [],
    preferredModes: [],
    positiveSignals: [],
    negativeSignals: [],
    warning: "",
    plainLanguageExplanation: "",
    legalExplanation: "",
    featuredOnHome: false,
    targetHref: "/analyses",
  },
  // --- Escenarios académicos / comparativos (no pasan por el motor) ---
  {
    id: "compare_ai_with_traditional_software",
    kind: "academic",
    title: "Comparar IA con software tradicional",
    cardLabel: "Comparar IA con software tradicional",
    short: "Diferencias y continuidades jurídicas entre IA, correo, productividad, redes y móvil.",
    description:
      "Muestra diferencias y continuidades jurídicas entre proveedores de IA y software tradicional (correo, productividad, redes sociales y sistemas móviles).",
    sensitivity: "low",
    priorityCategories: [],
    preferredModes: [],
    positiveSignals: [],
    negativeSignals: [],
    warning: "",
    plainLanguageExplanation: "",
    legalExplanation: "",
    featuredOnHome: false,
    targetHref: "/compare",
  },
  {
    id: "lawyer_daily_software_stack",
    kind: "academic",
    title: "Software cotidiano del abogado",
    cardLabel: "Software cotidiano del abogado",
    short: "Compara las herramientas de uso diario: correo, documentos, redes, móvil e IA.",
    description:
      "Compara herramientas que un abogado puede usar a diario: correo, documentos, redes sociales, ecosistemas móviles e IA.",
    sensitivity: "low",
    priorityCategories: [],
    preferredModes: [],
    positiveSignals: [],
    negativeSignals: [],
    warning: "",
    plainLanguageExplanation: "",
    legalExplanation: "",
    featuredOnHome: false,
    targetHref: "/providers",
  },
  {
    id: "latin_america_legal_education",
    kind: "academic",
    title: "Lectura jurídica de software en América Latina",
    cardLabel: "Lectura jurídica de software en América Latina",
    short: "Privacidad, jurisdicción, transferencia internacional y contratación por adhesión.",
    description:
      "Orienta el análisis hacia la formación jurídica: privacidad, jurisdicción, transferencia internacional de datos, contratación por adhesión y asimetrías entre proveedor global y usuario local.",
    sensitivity: "low",
    priorityCategories: [],
    preferredModes: [],
    positiveSignals: [],
    negativeSignals: [],
    warning: "",
    plainLanguageExplanation: "",
    legalExplanation: "",
    featuredOnHome: false,
    targetHref: "/acerca",
  },
];

export const SCENARIO_BY_ID: Record<string, LegalUseScenario> = Object.fromEntries(
  LEGAL_USE_SCENARIOS.map((s) => [s.id, s]),
);

/** Escenarios que pasan por el motor (tienen vista /escenarios/[id]). */
export const EVALUABLE_SCENARIOS = LEGAL_USE_SCENARIOS.filter((s) => s.kind === "evaluable");

/** Escenarios académicos / comparativos (linkean a una vista, no al motor). */
export const ACADEMIC_SCENARIOS = LEGAL_USE_SCENARIOS.filter((s) => s.kind === "academic");

/** Destino de un escenario: vista propia (evaluable) o atajo (navigation/academic). */
export function scenarioHref(s: LegalUseScenario): string {
  return s.kind === "evaluable" ? `/escenarios/${s.id}` : (s.targetHref ?? "/escenarios");
}

/** Tarjetas principales de la home (las 4 curadas). */
export const HOME_SCENARIO_CARDS = LEGAL_USE_SCENARIOS.filter((s) => s.featuredOnHome);

export const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  low: "Sensibilidad baja",
  medium: "Sensibilidad media",
  high: "Sensibilidad alta",
  critical: "Sensibilidad crítica",
};
