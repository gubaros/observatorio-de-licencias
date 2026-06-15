import { describe, it, expect } from "vitest";
import type { LicenseAnalysis } from "../src/lib/schema";
import {
  LEGAL_USE_SCENARIOS,
  EVALUABLE_SCENARIOS,
  SCENARIO_BY_ID,
} from "../src/domain/legalUseScenarios";
import { evaluateScenario } from "../src/domain/evaluateScenario";

// --- fixture mínimo de análisis (solo los campos que usa el motor) ---
function mk(over: {
  id?: string;
  provider?: string;
  product?: string;
  documentType?: string;
  contractingMode?: string;
  appliesToModes?: string[];
  sourceScope?: string;
  signals?: string[];
  posture?: string;
  risk?: string;
  review?: string;
  sourceVerified?: boolean;
  cats?: Record<string, "found" | "unclear" | "not_found">;
} = {}): LicenseAnalysis {
  const cats = over.cats ?? {};
  const categories = Object.fromEntries(
    Object.entries(cats).map(([k, status]) => [k, { status, riskLevel: "medium", legalSummary: "", evidence: [], notes: "", appliesToModes: [], modeSpecificity: "general", modeEvidence: [] }]),
  );
  return {
    id: over.id ?? "x-y-doc-2026-06-14",
    providerName: over.provider ?? "Prov",
    productName: over.product ?? "Prod",
    productTier: "All",
    documentType: over.documentType ?? "Terms of Use",
    contractingMode: (over.contractingMode ?? "all") as never,
    appliesToModes: (over.appliesToModes ?? ["free", "paid_individual"]) as never,
    sourceScope: (over.sourceScope ?? "general") as never,
    modeConfidence: "unknown" as never,
    modeRationale: "",
    sourceUrl: null,
    retrievedAt: "2026-06-14",
    rawTextPath: "data/raw/x.txt",
    overall: { legalSummary: "", overallRiskLevel: (over.risk ?? "medium") as never },
    privacy: { posture: (over.posture ?? "unknown") as never, rationale: "", signals: over.signals ?? [], evidence: [] },
    categories: categories as never,
    metadata: {
      createdAt: "2026-06-14T00:00:00.000Z",
      parserVersion: "test",
      isMock: false,
      reviewStatus: (over.review ?? "unreviewed") as never,
      sourceVerified: over.sourceVerified ?? true,
    },
  } as LicenseAnalysis;
}

describe("legalUseScenarios", () => {
  it("incluye los 10 escenarios mínimos", () => {
    const ids = LEGAL_USE_SCENARIOS.map((s) => s.id);
    for (const id of [
      "public_information",
      "personal_data",
      "confidential_business_information",
      "client_confidential_information",
      "attorney_client_privilege",
      "academic_research",
      "internal_legal_ops",
      "enterprise_api_use",
      "provider_comparison",
      "source_audit",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("cada escenario evaluable tiene categorías prioritarias", () => {
    for (const s of EVALUABLE_SCENARIOS) {
      expect(s.priorityCategories.length).toBeGreaterThan(0);
    }
  });

  it("los escenarios de navegación tienen targetHref y no son evaluables", () => {
    for (const s of LEGAL_USE_SCENARIOS.filter((x) => x.kind === "navigation")) {
      expect(s.targetHref).toBeTruthy();
    }
    expect(EVALUABLE_SCENARIOS.find((s) => s.id === "provider_comparison")).toBeUndefined();
  });
});

describe("evaluateScenario", () => {
  it("escenario de navegación o inexistente devuelve []", () => {
    expect(evaluateScenario("provider_comparison", [mk()])).toEqual([]);
    expect(evaluateScenario("no_existe", [mk()])).toEqual([]);
  });

  it("sin evidencia (posture unknown, sin categorías, sin señales) → insufficient_information", () => {
    const r = evaluateScenario("personal_data", [mk({ posture: "unknown", signals: [], cats: {} })]);
    expect(r).toHaveLength(1);
    expect(r[0].recommendation).toBe("insufficient_information");
    expect(r[0].confidence).toBe("low");
  });

  it("privacidad débil en doc general para escenario sensible → no es preferente", () => {
    const r = evaluateScenario("personal_data", [
      mk({ posture: "weak", signals: ["broad_training_use"], cats: { privacy: "found" }, contractingMode: "all", sourceScope: "general" }),
    ]);
    expect(["requires_contract_review", "not_recommended_without_enterprise"]).toContain(r[0].recommendation);
    expect(r[0].recommendation).not.toBe("preferred_with_conditions");
  });

  it("secreto profesional sin documento enterprise → no recomendado sin enterprise", () => {
    const r = evaluateScenario("attorney_client_privilege", [
      mk({ contractingMode: "all", sourceScope: "general", signals: ["confidentiality_commitment"], cats: { confidentiality: "found" } }),
    ]);
    expect(r[0].recommendation).toBe("not_recommended_without_enterprise");
  });

  it("escenario enterprise/API sobre documento mode-specific produce orientación con motivos", () => {
    const r = evaluateScenario("enterprise_api_use", [
      mk({
        sourceScope: "mode_specific",
        contractingMode: "business",
        signals: ["enterprise_dpa", "no_training_commitment", "confidentiality_commitment", "retention_controls"],
        cats: { api_references: "found", confidentiality: "found", security: "found", data_retention: "found" },
        posture: "moderate",
        risk: "medium",
      }),
    ]);
    expect(r[0].reasons.length).toBeGreaterThan(0);
    expect(["preferred_with_conditions", "usable_with_caution"]).toContain(r[0].recommendation);
  });

  it("cada resultado tiene motivos, cautelas y sourceAnalysisIds reales", () => {
    const a = mk({ id: "prov-prod-terms-2026-06-14", signals: ["retention_controls"], cats: { privacy: "found" }, posture: "moderate" });
    for (const s of EVALUABLE_SCENARIOS) {
      const r = evaluateScenario(s.id, [a]);
      expect(r).toHaveLength(1);
      expect(Array.isArray(r[0].reasons)).toBe(true);
      expect(Array.isArray(r[0].cautions)).toBe(true);
      expect(r[0].reasons.length).toBeGreaterThan(0);
      expect(r[0].sourceAnalysisIds).toEqual(["prov-prod-terms-2026-06-14"]);
    }
  });

  it("nunca devuelve recomendación fuerte sin evidencia", () => {
    for (const s of EVALUABLE_SCENARIOS) {
      const r = evaluateScenario(s.id, [mk({ posture: "unknown", signals: [], cats: {} })]);
      expect(r[0].recommendation).not.toBe("preferred_with_conditions");
    }
  });

  it("anti-fuga: un documento enterprise no mejora a un documento general del mismo proveedor", () => {
    const general = mk({
      id: "anthropic-claude-consumer-2026-06-14",
      provider: "Anthropic",
      documentType: "Consumer Terms",
      contractingMode: "all",
      sourceScope: "general",
      signals: ["broad_training_use"],
      cats: { privacy: "found", training_use: "found" },
      posture: "weak",
    });
    const enterprise = mk({
      id: "anthropic-claude-commercial-2026-06-14",
      provider: "Anthropic",
      documentType: "Commercial Terms",
      contractingMode: "business",
      sourceScope: "mode_specific",
      signals: ["enterprise_dpa", "confidentiality_commitment", "no_training_commitment"],
      cats: { confidentiality: "found" },
      posture: "moderate",
    });
    const r = evaluateScenario("client_confidential_information", [general, enterprise]);
    const generalResult = r.find((x) => x.analysisId === "anthropic-claude-consumer-2026-06-14")!;
    // El doc general NO debe quedar como preferente por la evidencia del comercial.
    expect(["requires_contract_review", "not_recommended_without_enterprise", "insufficient_information"]).toContain(generalResult.recommendation);
    expect(generalResult.recommendation).not.toBe("preferred_with_conditions");
  });
});

describe("SCENARIO_BY_ID", () => {
  it("resuelve por id", () => {
    expect(SCENARIO_BY_ID["personal_data"].sensitivity).toBe("high");
  });
});
