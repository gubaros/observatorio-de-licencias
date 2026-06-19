import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { loadRegistry } from "@/lib/sources";
import { PageContainer } from "@/components/PageContainer";
import { buildStateOfArt, type RegistryRegionSummary } from "@/domain/stateOfArt";
import { providerRegionLabel } from "@/domain/taxonomies/providerRegions";
import { isNonCommercialProject } from "@/domain/taxonomies/providerTypes";
import { StateOfArtReading } from "@/components/StateOfArtReading";
import { EscenariosGate } from "@/components/featureGates";
import { providerSummaries } from "@/lib/derive";
import { ModeToggle } from "@/components/ModeProvider";
import { ProductLabelCard } from "@/components/ProductLabelCard";
import { LegalDisclaimer } from "@/components/Disclaimer";

// El Estado del arte es la pieza central de la home. Estos accesos son soporte
// de lectura, no el eje: escenarios (recorridos), corpus, proveedores, criterio.
const ACCESS_LINKS: { href: string; label: string; desc: string; gated?: boolean }[] = [
  { href: "/escenarios", label: "Escenarios", desc: "Recorridos de lectura por tipo de uso", gated: true },
  { href: "/analyses", label: "Corpus documental", desc: "Todos los documentos analizados" },
  { href: "/providers", label: "Proveedores", desc: "Expedientes por proveedor y modalidad" },
  { href: "/criteria", label: "Criterio de lectura", desc: "Cómo se interpreta cada señal" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();

  // Resumen regional del registro para la nota del Estado del arte (no depende
  // del parser ni de los análisis; describe la composición del registro).
  let registrySummary: RegistryRegionSummary | undefined;
  try {
    const reg = await loadRegistry();
    const nonUsChina = reg.providers.filter((p) => !["north_america", "asia"].includes(p.providerRegion));
    registrySummary = {
      totalProviders: reg.providers.length,
      nonUsChinaProviders: nonUsChina.length,
      nonCommercialProjects: reg.providers.filter((p) => isNonCommercialProject(p.providerType)).length,
      regionsNonUsChina: Array.from(new Set(nonUsChina.map((p) => providerRegionLabel(p.providerRegion)))).sort(),
    };
  } catch {
    registrySummary = undefined;
  }

  const state = buildStateOfArt(analyses, registrySummary);

  // Galería proveedor → producto (sección principal). Orden de proveedores y
  // agrupación por producto vienen de la derivación pura (derive.ts).
  const providers = providerSummaries(analyses);

  return (
    <PageContainer className="space-y-10">
      {/* 1 · Título del proyecto · 2 · Bajada académica breve */}
      <header className="max-w-3xl space-y-2">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico-académico que lee y audita, con criterio jurídico y trazabilidad textual, las condiciones
          legales de herramientas de IA y de software cotidiano.
        </p>
      </header>

      {/* SECCIÓN PRINCIPAL · Etiquetado frontal por proveedor y producto */}
      <section id="etiquetado" aria-labelledby="etiquetado-title" className="space-y-5 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl space-y-1">
            <h2 id="etiquetado-title" className="font-serif text-2xl font-semibold text-slate-900">
              Etiquetado frontal del corpus
            </h2>
            <p className="text-sm text-slate-500">
              Cada producto, por modalidad de contratación, con sus advertencias (octógonos), cautelas y la tabla
              nutricional del clausulado. Todo deriva del corpus y remite a evidencia textual; no es un ranking.
            </p>
          </div>
          <ModeToggle />
        </div>

        <p className="max-w-3xl text-xs leading-snug text-slate-400">
          Lectura sobre el corpus firmado <code className="text-slate-500">sha256:{state.shortHash}</code> ({state.documentCount}{" "}
          documentos, {state.providerCount} proveedores). Si el corpus cambia, el etiquetado se recalcula.
        </p>
        <LegalDisclaimer />

        <div className="space-y-10">
          {providers.map((p) => (
            <div key={p.providerId} className="space-y-4">
              <h3 className="border-b border-slate-200 pb-1 font-serif text-xl font-semibold text-slate-800">
                {p.providerName}
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {p.products.map((productName) => (
                  <ProductLabelCard
                    key={productName}
                    providerId={p.providerId}
                    productName={productName}
                    analyses={p.analyses.filter((a) => a.productName === productName)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECUNDARIO · Estado del arte (lectura jurídica preliminar) */}
      <section id="estado-del-arte" className="border-t border-slate-200 pt-8 scroll-mt-24">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Estado del arte</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">Lectura jurídica preliminar del corpus.</p>
        <div className="mt-5">
          <StateOfArtReading state={state} />
        </div>
      </section>

      {/* SECUNDARIO · Accesos: soporte de lectura */}
      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Soporte de lectura</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACCESS_LINKS.map((l) => {
            const item = (
              <Link
                href={l.href}
                className="flex h-full items-baseline justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
              >
                <span>
                  <span className="font-medium text-slate-900">{l.label}</span>
                  <span className="block text-sm text-slate-500">{l.desc}</span>
                </span>
                <span className="text-sky-700">→</span>
              </Link>
            );
            return l.gated ? (
              <EscenariosGate key={l.href}>{item}</EscenariosGate>
            ) : (
              <div key={l.href}>{item}</div>
            );
          })}
        </div>
      </section>
    </PageContainer>
  );
}
