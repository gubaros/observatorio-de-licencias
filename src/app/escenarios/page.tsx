import Link from "next/link";
import { LEGAL_USE_SCENARIOS, type LegalUseScenario } from "@/domain/legalUseScenarios";

export const metadata = { title: "Escenarios de uso — UP-Law-AILO" };

function href(s: LegalUseScenario): string {
  return s.kind === "navigation" && s.targetHref ? s.targetHref : `/escenarios/${s.id}`;
}

export default function ScenariosIndexPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-sky-700 hover:underline">← Inicio</Link>
        <h1 className="font-serif text-2xl font-bold text-slate-900">Escenarios de uso</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Elegí un escenario para ver una orientación preliminar por documento, o abrí las vistas de
          comparación y evidencia.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LEGAL_USE_SCENARIOS.map((s) => (
          <Link
            key={s.id}
            href={href(s)}
            className="group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <h2 className="font-medium text-slate-900">{s.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.short}</p>
            <span className="mt-3 inline-block text-sm font-medium text-sky-700">
              {s.kind === "navigation" ? "Abrir" : "Evaluar escenario"}{" "}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="text-sm leading-relaxed text-slate-500">
        UP-Law-AILO ofrece orientación preliminar basada en documentos públicos y evidencia textual. No
        constituye asesoramiento legal.
      </p>
    </div>
  );
}
