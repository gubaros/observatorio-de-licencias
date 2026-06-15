import { describe, it, expect } from "vitest";
import { LicenseAnalysisSchema, AnalysisInputSchema } from "../src/lib/schema";

const valid = {
  id: "x-y-free-terms-of-use-2026-06-14",
  providerName: "X",
  productName: "Y",
  productTier: "Free",
  documentType: "Terms of Use",
  sourceUrl: null,
  retrievedAt: "2026-06-14",
  rawTextPath: "data/raw/x.txt",
  overall: { legalSummary: "l", overallRiskLevel: "medium" },
  categories: {
    privacy: {
      status: "found",
      riskLevel: "medium",
      legalSummary: "l",
      evidence: [{ quote: "[MOCK CLAUSE] ...", locationHint: "x" }],
      notes: "n",
    },
  },
  metadata: { createdAt: "2026-06-14T00:00:00.000Z", parserVersion: "0.1.0", isMock: true, reviewStatus: "unreviewed" },
};

describe("LicenseAnalysisSchema", () => {
  it("acepta un análisis válido", () => {
    expect(() => LicenseAnalysisSchema.parse(valid)).not.toThrow();
  });

  it("rechaza un riskLevel inválido", () => {
    const bad = structuredClone(valid);
    // @ts-expect-error: valor inválido a propósito
    bad.overall.overallRiskLevel = "catastrophic";
    expect(() => LicenseAnalysisSchema.parse(bad)).toThrow();
  });

  it("rechaza si falta un campo obligatorio", () => {
    const bad = structuredClone(valid) as Record<string, unknown>;
    delete bad.providerName;
    expect(() => LicenseAnalysisSchema.parse(bad)).toThrow();
  });
});

describe("AnalysisInputSchema", () => {
  it("exige texto suficientemente largo", () => {
    const r = AnalysisInputSchema.safeParse({
      providerName: "A",
      productName: "B",
      productTier: "Free",
      documentType: "Terms of Use",
      retrievedAt: "2026-06-14",
      rawText: "corto",
    });
    expect(r.success).toBe(false);
  });

  it("acepta sourceUrl vacío", () => {
    const r = AnalysisInputSchema.safeParse({
      providerName: "A",
      productName: "B",
      productTier: "Free",
      documentType: "Terms of Use",
      sourceUrl: "",
      retrievedAt: "2026-06-14",
      rawText: "Este es un texto de licencia suficientemente largo para validar.",
    });
    expect(r.success).toBe(true);
  });
});
