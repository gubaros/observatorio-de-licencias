import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ProviderRegistrySchema,
  hostMatchesDomains,
  flattenDocuments,
} from "../src/lib/sources";

// Nota: estos tests corren sobre el registro REAL, que `sources:verify` puede
// haber mutado. Por eso no se asume un estado inicial fijo, sino invariantes
// que deben cumplirse siempre (p. ej. "verified" solo si fue chequeado).

async function loadRealRegistry() {
  const raw = await fs.readFile(
    path.join(process.cwd(), "data", "sources", "providers.json"),
    "utf8",
  );
  return ProviderRegistrySchema.parse(JSON.parse(raw));
}

describe("hostMatchesDomains", () => {
  it("acepta dominio exacto y subdominios", () => {
    expect(hostMatchesDomains("openai.com", ["openai.com"])).toBe(true);
    expect(hostMatchesDomains("www.openai.com", ["openai.com"])).toBe(true);
    expect(hostMatchesDomains("policies.google.com", ["google.com"])).toBe(true);
  });
  it("rechaza dominios ajenos", () => {
    expect(hostMatchesDomains("evil.com", ["openai.com"])).toBe(false);
    expect(hostMatchesDomains("notopenai.com", ["openai.com"])).toBe(false);
  });
});

describe("registro de proveedores (data/sources/providers.json)", () => {
  it("valida contra el schema e incluye proveedores de IA y software tradicional de referencia", async () => {
    const reg = await loadRealRegistry();
    // 23 base + proveedores/proyectos regionales (Maritaca, Latam-GPT, Lelapa, Aleph Alpha, LightOn, BSC/AINA).
    expect(reg.providers.length).toBe(29);
  });

  it("todo proveedor tiene región y tipo; los regionales nuevos están registrados", async () => {
    const reg = await loadRealRegistry();
    for (const p of reg.providers) {
      expect(p.providerRegion, `${p.providerId} sin región`).toBeTruthy();
      expect(p.providerType, `${p.providerId} sin tipo`).toBeTruthy();
    }
    const ids = new Set(reg.providers.map((p) => p.providerId));
    for (const id of ["maritaca", "latam-gpt", "lelapa", "aleph-alpha", "lighton", "bsc-aina"]) {
      expect(ids.has(id), `falta ${id}`).toBe(true);
    }
    const latam = reg.providers.find((p) => p.providerId === "latam-gpt")!;
    expect(latam.providerRegion).toBe("latin_america");
    expect(latam.providerType).toBe("sovereign_ai_project");
  });

  it("ninguna fuente está 'verified' sin haberse chequeado (verificación ganada, no auto-asignada)", async () => {
    const reg = await loadRealRegistry();
    for (const { provider, document } of flattenDocuments(reg)) {
      if (document.sourceStatus !== "verified") continue;
      // Una fuente verificada DEBE: tener URL, haber sido chequeada (HTTP 2xx)
      // y haber resuelto a un host dentro de los dominios oficiales.
      expect(document.sourceUrl, "verified sin URL").toBeTruthy();
      expect(document.lastCheckedAt, "verified sin lastCheckedAt").toBeTruthy();
      expect(document.httpStatus && document.httpStatus >= 200 && document.httpStatus < 400).toBe(true);
      const host = new URL(document.finalUrl ?? document.sourceUrl!).host;
      expect(hostMatchesDomains(host, provider.officialDomains), `host ${host} fuera de dominios`).toBe(true);
    }
  });

  it("cada proveedor declara al menos un dominio oficial", async () => {
    const reg = await loadRealRegistry();
    for (const p of reg.providers) {
      expect(p.officialDomains.length).toBeGreaterThan(0);
    }
  });

  it("las URLs no nulas son del esquema https", async () => {
    const reg = await loadRealRegistry();
    for (const { document } of flattenDocuments(reg)) {
      if (document.sourceUrl) expect(document.sourceUrl.startsWith("https://")).toBe(true);
    }
  });
});
