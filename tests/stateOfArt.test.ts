import { describe, it, expect } from "vitest";
import { loadAllLicenseAnalyses } from "../src/lib/storage";
import { buildStateOfArtOpinion, topSignals } from "../src/domain/stateOfArt";

describe("buildStateOfArtOpinion (corpus real)", () => {
  it("identifica producto más restrictivo y más expuesto, con fundamento", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const o = buildStateOfArtOpinion(analyses);

    expect(o.insufficientEvidence).toBe(false);
    expect(o.mostRestrictive).not.toBeNull();
    expect(o.mostExposed).not.toBeNull();

    // Fundamento: score > 0 y señales con documento de respaldo.
    expect(o.mostRestrictive!.restrictiveness.value).toBeGreaterThan(0);
    expect(o.mostRestrictive!.restrictiveness.sourceDocuments.length).toBeGreaterThan(0);
    expect(o.mostExposed!.exposure.value).toBeGreaterThan(0);

    // Cada razón principal apunta a una señal etiquetada.
    expect(topSignals(o.mostRestrictive!.restrictiveness, 3).length).toBeGreaterThan(0);
  });

  it("usa la firma del corpus y reporta composición", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const o = buildStateOfArtOpinion(analyses);
    expect(o.signature.shortHash).toHaveLength(12);
    expect(o.corpus.documents).toBe(analyses.length);
    expect(o.corpus.aiProducts + o.corpus.baselineProducts).toBe(o.corpus.products);
  });

  it("las zonas de cautela cuentan documentos reales del corpus de IA", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const o = buildStateOfArtOpinion(analyses);
    for (const z of o.cautionZones) {
      expect(z.count).toBeGreaterThan(0);
      expect(z.count).toBeLessThanOrEqual(z.total);
    }
  });

  it("no contiene conclusiones categóricas ni ranking comercial en los textos", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const o = buildStateOfArtOpinion(analyses);
    const blob = [o.generalReading, ...o.appreciations, ...o.limits].join(" ").toLowerCase();
    expect(blob).not.toMatch(/\bes ilegal\b|\bes seguro\b|\bgarantiza\b|\bmejor herramienta\b|\bcumple\b/);
    expect(blob).toContain("según el corpus");
  });

  it("corpus vacío => insufficientEvidence y sin picks", () => {
    const o = buildStateOfArtOpinion([]);
    expect(o.insufficientEvidence).toBe(true);
    expect(o.mostRestrictive).toBeNull();
    expect(o.mostExposed).toBeNull();
  });
});
