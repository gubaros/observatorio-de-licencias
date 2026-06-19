import { describe, it, expect } from "vitest";
import { parseLicense, type ParseLicenseParams } from "../src/lib/parser";
import {
  octogonosFor,
  leyendasFor,
  nutritionLabel,
  docAppliesToMode,
  availableModesFor,
  defaultModeFor,
  OCTAGON_CATEGORIES,
  OCTAGON_LABELS,
} from "../src/domain/seals";
import { CATEGORIES, CATEGORY_KEYS } from "../src/lib/categories";
import type { LicenseAnalysis } from "../src/lib/schema";

const base: Omit<
  ParseLicenseParams,
  "rawText" | "documentType" | "contractingMode" | "sourceScope" | "providerName" | "productName" | "id"
> = {
  productTier: "All",
  sourceUrl: null,
  retrievedAt: "2026-06-14",
  rawTextPath: "data/extracted/x.txt",
};

function mk(over: Partial<ParseLicenseParams> & { rawText: string }): LicenseAnalysis {
  return parseLicense({
    id: over.id ?? "id-" + Math.random().toString(36).slice(2),
    providerName: over.providerName ?? "Prov",
    productName: over.productName ?? "Prod",
    documentType: over.documentType ?? "Terms of Service",
    contractingMode: over.contractingMode ?? "all",
    sourceScope: over.sourceScope ?? "general",
    ...base,
    ...over,
  });
}

// Textos crafteados con strong keywords del catálogo (categories.ts).
const TRAIN = "We may use your content to train our models for model improvement.";
const HIGHS =
  "Limitation of liability applies; in no event shall we be liable. Binding arbitration and a class action waiver apply. You will indemnify and hold us harmless. The service is provided as is without warranty of any kind. You grant us a worldwide license to use your content.";
const MEDS =
  "We may modify these terms at any time. These terms are governed by the laws of the State of California. We retain your data; our data retention period applies. The free plan and the enterprise plan have different terms.";
const PLAIN = "This document describes general informational use. Personal data is processed.";

describe("OCTAGON_CATEGORIES (single source of truth)", () => {
  it("son exactamente las categorías con riskWhenFound 'high' del catálogo", () => {
    const fromCatalog = CATEGORIES.filter((c) => c.riskWhenFound === "high").map((c) => c.key).sort();
    expect(OCTAGON_CATEGORIES.map((c) => c.key).sort()).toEqual(fromCatalog);
  });

  it("toda categoría octógono tiene una etiqueta clara declarada", () => {
    for (const c of OCTAGON_CATEGORIES) {
      expect(OCTAGON_LABELS[c.key]).toBeTruthy();
    }
  });
});

describe("docAppliesToMode (regla de modalidad)", () => {
  it("un documento general ('all') aplica a cualquier modalidad", () => {
    const a = mk({ contractingMode: "all", rawText: PLAIN });
    expect(docAppliesToMode(a, "free")).toBe(true);
    expect(docAppliesToMode(a, "enterprise")).toBe(true);
  });

  it("un documento enterprise NO aplica a free", () => {
    const a = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: PLAIN });
    expect(docAppliesToMode(a, "enterprise")).toBe(true);
    expect(docAppliesToMode(a, "free")).toBe(false);
  });

  it("la vista general ('all') no incluye documentos mode-specific", () => {
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: PLAIN });
    const gen = mk({ contractingMode: "all", rawText: PLAIN });
    expect(docAppliesToMode(ent, "all")).toBe(false);
    expect(docAppliesToMode(gen, "all")).toBe(true);
  });
});

describe("octogonosFor", () => {
  it("enciende un octógono solo cuando una categoría high está 'found'", () => {
    const a = mk({ contractingMode: "all", rawText: TRAIN });
    const seals = octogonosFor([a], "all");
    const keys = seals.map((s) => s.categoryKey);
    expect(keys).toContain("training_use");
  });

  it("nunca enciende para not_found/unclear", () => {
    const a = mk({ contractingMode: "all", rawText: PLAIN });
    const seals = octogonosFor([a], "all");
    // PLAIN no contiene cláusulas high.
    for (const s of seals) {
      // Si por alguna razón hay un sello, debe venir de un 'found' con evidencia.
      expect(s.evidence.length).toBeGreaterThan(0);
    }
    expect(seals.map((s) => s.categoryKey)).not.toContain("training_use");
  });

  it("nunca devuelve un sello sin evidencia (no inventa)", () => {
    const a = mk({ contractingMode: "all", rawText: HIGHS });
    const seals = octogonosFor([a], "all");
    expect(seals.length).toBeGreaterThan(0);
    for (const s of seals) expect(s.evidence.length).toBeGreaterThan(0);
  });

  it("un 'found' sin evidencia (inconsistente) NO produce sello", () => {
    const a = mk({ contractingMode: "all", rawText: TRAIN });
    // Forzamos la inconsistencia: found pero sin evidencia.
    a.categories.training_use.evidence = [];
    const seals = octogonosFor([a], "all");
    expect(seals.map((s) => s.categoryKey)).not.toContain("training_use");
  });

  it("modalidad: un documento enterprise NO traslada su advertencia al free", () => {
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: TRAIN });
    const free = mk({ contractingMode: "free", sourceScope: "mode_specific", rawText: PLAIN });
    expect(octogonosFor([ent, free], "free").map((s) => s.categoryKey)).not.toContain("training_use");
    expect(octogonosFor([ent, free], "enterprise").map((s) => s.categoryKey)).toContain("training_use");
  });

  it("cada sello anota el documento y la modalidad de origen", () => {
    const a = mk({ id: "doc-1", contractingMode: "all", documentType: "Terms of Service", rawText: TRAIN });
    const seal = octogonosFor([a], "all").find((s) => s.categoryKey === "training_use")!;
    expect(seal.sources.length).toBeGreaterThan(0);
    expect(seal.sources[0].analysisId).toBe("doc-1");
    expect(seal.sources[0].contractingMode).toBe("all");
  });
});

describe("leyendasFor (capa 2, riesgo medio)", () => {
  it("enciende 'Puede cambiar las reglas' cuando hay cambios unilaterales", () => {
    const a = mk({ contractingMode: "all", rawText: MEDS });
    const keys = leyendasFor([a], "all").map((l) => l.key);
    expect(keys).toContain("unilateral_changes");
  });

  it("cada leyenda trae evidencia", () => {
    const a = mk({ contractingMode: "all", rawText: MEDS });
    const legends = leyendasFor([a], "all");
    expect(legends.length).toBeGreaterThan(0);
    for (const l of legends) expect(l.evidence.length).toBeGreaterThan(0);
  });

  it("modalidad: leyenda de un doc enterprise no aparece en free", () => {
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: MEDS });
    const free = mk({ contractingMode: "free", sourceScope: "mode_specific", rawText: PLAIN });
    expect(leyendasFor([ent, free], "free").map((l) => l.key)).not.toContain("unilateral_changes");
    expect(leyendasFor([ent, free], "enterprise").map((l) => l.key)).toContain("unilateral_changes");
  });
});

describe("nutritionLabel", () => {
  it("solo contiene categorías del catálogo, una fila por categoría", () => {
    const a = mk({ contractingMode: "all", rawText: HIGHS });
    const label = nutritionLabel([a], "all");
    expect(label.rows.length).toBe(CATEGORIES.length);
    for (const row of label.rows) expect(CATEGORY_KEYS).toContain(row.categoryKey);
  });

  it("estados consistentes con el JSON (found visible, ausente no)", () => {
    const a = mk({ contractingMode: "all", rawText: TRAIN });
    const label = nutritionLabel([a], "all");
    const training = label.rows.find((r) => r.categoryKey === "training_use")!;
    expect(training.status).toBe("found");
    expect(training.evidence.length).toBeGreaterThan(0);
  });

  it("modalidad: una celda positiva del enterprise no puebla la del free", () => {
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: TRAIN });
    const free = mk({ contractingMode: "free", sourceScope: "mode_specific", rawText: PLAIN });
    const freeLabel = nutritionLabel([ent, free], "free");
    const trainingFree = freeLabel.rows.find((r) => r.categoryKey === "training_use")!;
    expect(trainingFree.status).not.toBe("found");

    const entLabel = nutritionLabel([ent, free], "enterprise");
    const trainingEnt = entLabel.rows.find((r) => r.categoryKey === "training_use")!;
    expect(trainingEnt.status).toBe("found");
  });

  it("incluye una lectura de riesgo (reusa riskRationale/topRiskCategories)", () => {
    const a = mk({ contractingMode: "all", rawText: HIGHS });
    const label = nutritionLabel([a], "all");
    expect(label.riskRead).not.toBeNull();
    expect(label.riskRead!.level).toBe(a.overall.overallRiskLevel);
    expect(label.riskRead!.rationale.length).toBeGreaterThan(0);
    // Los drivers son un subconjunto de categorías detectadas (no inventa).
    for (const d of label.riskRead!.drivers) {
      expect(CATEGORY_KEYS).toContain(d.key);
    }
  });

  it("la lectura de riesgo proviene del documento aplicable de mayor riesgo", () => {
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: HIGHS });
    const free = mk({ contractingMode: "free", sourceScope: "mode_specific", rawText: PLAIN });
    // En free, el documento HIGHS (enterprise) no aplica: la lectura no debe heredarlo.
    const freeRead = nutritionLabel([ent, free], "free").riskRead;
    expect(freeRead!.level).not.toBe("high");
  });

  it("la porción describe producto, modalidad y procedencia", () => {
    const a = mk({
      providerName: "Anthropic",
      productName: "Claude",
      contractingMode: "all",
      documentType: "Terms of Service",
      rawText: HIGHS,
    });
    const label = nutritionLabel([a], "all");
    expect(label.productName).toBe("Claude");
    expect(label.providerName).toBe("Anthropic");
    expect(label.mode).toBe("all");
    expect(label.documents.length).toBeGreaterThan(0);
  });
});

describe("availableModesFor / defaultModeFor", () => {
  it("lista las modalidades presentes en los documentos del producto", () => {
    const free = mk({ contractingMode: "free", rawText: PLAIN });
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: PLAIN });
    const modes = availableModesFor([free, ent]);
    expect(modes).toContain("free");
    expect(modes).toContain("enterprise");
  });

  it("defaultea a la modalidad más general/consumer (free o all)", () => {
    const free = mk({ contractingMode: "free", rawText: PLAIN });
    const ent = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: PLAIN });
    expect(defaultModeFor([ent, free])).toBe("free");

    const gen = mk({ contractingMode: "all", rawText: PLAIN });
    const ent2 = mk({ contractingMode: "enterprise", sourceScope: "mode_specific", rawText: PLAIN });
    expect(defaultModeFor([ent2, gen])).toBe("all");
  });
});
