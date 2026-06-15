import { describe, it, expect } from "vitest";
import { loadAllLicenseAnalyses } from "../src/lib/storage";
import { providerKey } from "../src/lib/derive";
import { getProviderContext, PROVIDER_CONTEXT } from "../src/domain/providerContext";

describe("providerContext", () => {
  it("todo proveedor del corpus tiene una nota de contexto", async () => {
    const analyses = await loadAllLicenseAnalyses();
    const ids = Array.from(new Set(analyses.map((a) => providerKey(a))));
    const faltantes = ids.filter((id) => getProviderContext(id) === null);
    expect(faltantes).toEqual([]);
  });

  it("las notas son no triviales (orientan, no rellenan)", () => {
    for (const [id, texto] of Object.entries(PROVIDER_CONTEXT)) {
      expect(texto.trim().length, `contexto vacío o muy corto para ${id}`).toBeGreaterThan(80);
    }
  });

  it("devuelve null para un proveedor desconocido", () => {
    expect(getProviderContext("no-existe")).toBeNull();
  });
});
