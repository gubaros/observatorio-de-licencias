import { describe, it, expect } from "vitest";
import { LicenseAnalysisSchema } from "../src/lib/schema";
import { loadRegistry } from "../src/lib/sources";
import { filterAnalyses, EMPTY_FILTERS } from "../src/lib/derive";
import { ACADEMIC_SCENARIOS, EVALUABLE_SCENARIOS } from "../src/domain/legalUseScenarios";

const baseAnalysis = {
  id: "x-y-free-terms-2026-06-14",
  providerName: "X",
  productName: "Y",
  productTier: "All",
  documentType: "Terms of Use",
  sourceUrl: null,
  retrievedAt: "2026-06-14",
  rawTextPath: "data/raw/x.txt",
  overall: { legalSummary: "l", overallRiskLevel: "medium" },
  categories: {},
  metadata: { createdAt: "2026-06-14T00:00:00.000Z", parserVersion: "t", isMock: false, reviewStatus: "unreviewed" },
};

describe("schema: taxonomía de software", () => {
  it("aplica defaults IA cuando faltan los campos", () => {
    const a = LicenseAnalysisSchema.parse(baseAnalysis);
    expect(a.softwareCategory).toBe("ai_provider");
    expect(a.comparisonGroup).toBe("ai");
    expect(a.comparativeBaseline).toBe(false);
  });

  it("acepta software tradicional con sus campos", () => {
    const a = LicenseAnalysisSchema.parse({
      ...baseAnalysis,
      softwareCategory: "email",
      comparisonGroup: "traditional_software",
      comparativeBaseline: true,
      academicPurposeNotes: "comparación",
    });
    expect(a.softwareCategory).toBe("email");
    expect(a.comparisonGroup).toBe("traditional_software");
    expect(a.comparativeBaseline).toBe(true);
  });

  it("rechaza una categoría inválida", () => {
    expect(() => LicenseAnalysisSchema.parse({ ...baseAnalysis, softwareCategory: "nope" })).toThrow();
  });
});

describe("registro: software tradicional de referencia", () => {
  it("incluye Gmail, MS365, LinkedIn, X, Android y Apple con su grupo correcto", async () => {
    const reg = await loadRegistry();
    const products = reg.providers.flatMap((p) => p.products.map((prod) => ({ provider: p.providerId, ...prod })));
    const find = (provider: string, productId: string) => products.find((p) => p.provider === provider && p.productId === productId);

    const gmail = find("google", "gmail");
    expect(gmail?.softwareCategory).toBe("email");
    expect(gmail?.comparisonGroup).toBe("traditional_software");
    expect(gmail?.comparativeBaseline).toBe(true);
    expect(gmail?.documents.map((d) => d.documentType)).toEqual(expect.arrayContaining(["Terms of Service", "Privacy Policy"]));

    expect(find("microsoft", "microsoft-365")?.comparisonGroup).toBe("traditional_software");
    expect(find("linkedin", "linkedin")?.comparisonGroup).toBe("social_platform");
    expect(find("x", "x")?.comparisonGroup).toBe("social_platform");
    expect(find("google", "android")?.comparisonGroup).toBe("mobile_ecosystem");
    expect(find("apple", "apple-ios")?.comparisonGroup).toBe("mobile_ecosystem");
  });

  it("las fuentes tradicionales tienen URL oficial y solo quedan 'verified' si la verificación fue ganada", async () => {
    const reg = await loadRegistry();
    const traditionalDocs = reg.providers
      .flatMap((p) => p.products)
      .filter((p) => p.comparisonGroup !== "ai")
      .flatMap((p) => p.documents);
    expect(traditionalDocs.length).toBeGreaterThan(0);
    for (const d of traditionalDocs) {
      expect(d.sourceUrl).toBeTruthy();
      // No se autoverifican: 'verified' exige un chequeo real (HTTP 200 + fecha).
      if (d.sourceStatus === "verified") {
        expect(d.httpStatus).toBe(200);
        expect(d.lastCheckedAt).toBeTruthy();
      }
    }
  });

  it("los proveedores de IA NO quedan marcados como software tradicional", async () => {
    const reg = await loadRegistry();
    const openai = reg.providers.find((p) => p.providerId === "openai");
    expect(openai?.products.every((p) => p.comparisonGroup === "ai")).toBe(true);
  });
});

describe("filtro por grupo comparativo", () => {
  it("filtra IA vs software tradicional", () => {
    const ai = LicenseAnalysisSchema.parse({ ...baseAnalysis, id: "a-1", comparisonGroup: "ai" });
    const trad = LicenseAnalysisSchema.parse({ ...baseAnalysis, id: "a-2", comparisonGroup: "traditional_software", softwareCategory: "email" });
    const onlyTrad = filterAnalyses([ai, trad], { ...EMPTY_FILTERS, comparisonGroup: "traditional_software" });
    expect(onlyTrad.map((a) => a.id)).toEqual(["a-2"]);
    const onlyAi = filterAnalyses([ai, trad], { ...EMPTY_FILTERS, comparisonGroup: "ai" });
    expect(onlyAi.map((a) => a.id)).toEqual(["a-1"]);
  });
});

describe("escenarios: jurídicos conservados + académicos agregados", () => {
  it("conserva los escenarios de uso jurídico principales", () => {
    const ids = EVALUABLE_SCENARIOS.map((s) => s.id);
    for (const id of ["public_information", "personal_data", "confidential_business_information", "client_confidential_information"]) {
      expect(ids).toContain(id);
    }
  });

  it("agrega los escenarios académicos y NO los hace evaluables", () => {
    const ids = ACADEMIC_SCENARIOS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(["compare_ai_with_traditional_software", "lawyer_daily_software_stack", "latin_america_legal_education"]),
    );
    // no se cruzan con los evaluables
    for (const s of ACADEMIC_SCENARIOS) {
      expect(EVALUABLE_SCENARIOS.find((e) => e.id === s.id)).toBeUndefined();
      expect(s.targetHref).toBeTruthy();
    }
  });
});
