import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { HOME_SCENARIO_CARDS } from "@/domain/legalUseScenarios";

const SECONDARY_LINKS: { href: string; label: string }[] = [
  { href: "/analyses", label: "Evidencia documental" },
  { href: "/providers", label: "Proveedores" },
  { href: "/compare", label: "Matriz comparativa" },
  { href: "/differences", label: "Diferencias por modalidad" },
  { href: "/criteria", label: "Criterio" },
];

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);

  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4">
      {/* A. Hero */}
      <header className="space-y-3">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Observatorio jurídico para comparar condiciones de uso, privacidad y riesgos contractuales de
          herramientas de IA.
        </p>
        <h2 className="pt-2 font-serif text-xl font-semibold text-slate-900">¿Qué uso querés evaluar?</h2>
      </header>

      {/* B. Escenarios principales */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOME_SCENARIO_CARDS.map((s) => (
            <Link
              key={s.id}
              href={`/escenarios/${s.id}`}
              className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <h3 className="font-medium text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
              <span className="mt-3 inline-block text-sm font-medium text-sky-700">
                Evaluar escenario <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-3">
          <Link href="/escenarios" className="text-sm text-sky-700 hover:underline">
            Ver otros escenarios →
          </Link>
        </div>
      </section>

      {/* C. Accesos secundarios */}
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
        {SECONDARY_LINKS.map((l, i) => (
          <span key={l.href} className="flex items-center gap-4">
            {i > 0 && <span className="text-slate-300">·</span>}
            <Link href={l.href} className="hover:text-slate-800 hover:underline">{l.label}</Link>
          </span>
        ))}
      </nav>

      {/* D. Cobertura actual (una línea). El disclaimer general único vive en el footer del layout. */}
      <p className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Cobertura actual: {m.providers} proveedores · {m.total} documentos · {m.modesDetected} modalidades ·{" "}
        {m.verifiedSources} fuentes verificadas
      </p>
    </div>
  );
}
