import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { computeMetrics } from "@/lib/derive";
import { HOME_SCENARIO_CARDS, type LegalUseScenario } from "@/domain/legalUseScenarios";

const ACCESOS: { href: string; title: string; desc: string }[] = [
  { href: "/analyses", title: "Evidencia documental", desc: "Registro probatorio: una fila por documento, filtrable y trazable." },
  { href: "/providers", title: "Proveedores", desc: "Índice de expedientes por proveedor y modalidad." },
  { href: "/compare", title: "Matriz comparativa", desc: "Categorías jurídicas por proveedor / modalidad." },
  { href: "/differences", title: "Diferencias por modalidad", desc: "Qué cambia entre free, pago, team, enterprise y API." },
  { href: "/criteria", title: "Criterio de riesgo", desc: "Cómo se calculan riesgo y privacidad, y sus límites." },
];

const ORIENTACION_RAPIDA: string[] = [
  "Información pública: revisá uso comercial y propiedad del output; la privacidad pesa menos.",
  "Datos personales: priorizá privacidad, retención, eliminación y DPA.",
  "Información de clientes: preferí modalidades enterprise/business con evidencia de confidencialidad y no-entrenamiento.",
  "Uso por API/enterprise: revisá términos específicos de API y procesamiento de datos, no las condiciones generales.",
];

function scenarioHref(s: LegalUseScenario): string {
  return s.kind === "navigation" && s.targetHref ? s.targetHref : `/escenarios/${s.id}`;
}

export default async function HomePage() {
  const analyses = await loadAllLicenseAnalyses();
  const m = computeMetrics(analyses);

  const cobertura: { label: string; value: number }[] = [
    { label: "Proveedores", value: m.providers },
    { label: "Documentos analizados", value: m.total },
    { label: "Modalidades", value: m.modesDetected },
    { label: "Fuentes verificadas", value: m.verifiedSources },
    { label: "Sin revisión legal", value: m.unreviewed },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <header className="max-w-3xl">
        <h1 className="font-serif text-3xl font-bold text-slate-900">UP-Law-AILO</h1>
        <p className="mt-1 text-base leading-relaxed text-slate-600">
          Observatorio jurídico para decidir qué herramientas de IA usar según riesgo contractual,
          privacidad y modalidad de contratación.
        </p>
      </header>

      {/* Pregunta principal + escenarios */}
      <section>
        <h2 className="font-serif text-xl font-bold text-slate-900">¿Qué necesitás decidir?</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Elegí un escenario de uso jurídico y UP-Law-AILO mostrará una orientación preliminar basada en
          términos, privacidad, modalidad de contratación y evidencia documental.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {HOME_SCENARIO_CARDS.map((s) => (
            <Link
              key={s.id}
              href={scenarioHref(s)}
              className="group flex flex-col justify-between rounded-md border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div>
                <h3 className="font-medium text-slate-900">{s.cardLabel}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.description}</p>
              </div>
              <span className="mt-3 text-sm font-medium text-sky-700">
                {s.kind === "navigation" ? "Abrir" : "Ver orientación preliminar"}{" "}
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Orientación rápida */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Orientación rápida</h2>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ORIENTACION_RAPIDA.map((t, i) => (
            <li key={i} className="rounded border border-l-2 border-slate-200 border-l-gold-500 bg-white px-3 py-2 text-sm text-slate-700">
              {t}
            </li>
          ))}
        </ul>
      </section>

      {/* Advertencia metodológica */}
      <section className="rounded-md border border-l-4 border-slate-200 border-l-gold-500 bg-white p-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-600">Advertencia metodológica</h2>
        <p className="text-sm leading-relaxed text-slate-700">
          UP-Law-AILO realiza análisis preliminar mediante un parser determinístico y evidencia textual. Las
          orientaciones, niveles de riesgo y perfiles de privacidad son señales para priorizar revisión legal
          humana. No constituyen asesoramiento legal.
        </p>
      </section>

      {/* Cobertura actual (secundario) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cobertura actual</h2>
        <dl className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-5">
          {cobertura.map((c) => (
            <div key={c.label} className="bg-white px-4 py-2.5">
              <dd className="font-serif text-2xl font-semibold leading-none text-slate-900">{c.value}</dd>
              <dt className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{c.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Accesos técnicos (secundario) */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vistas de análisis y evidencia</h2>
        <div className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-white">
          {ACCESOS.map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50">
              <div>
                <div className="font-medium text-slate-900">{a.title}</div>
                <div className="text-sm text-slate-500">{a.desc}</div>
              </div>
              <span className="text-sky-700">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
