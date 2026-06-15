import Link from "next/link";
import { notFound } from "next/navigation";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { CATEGORY_BY_KEY } from "@/lib/categories";
import { MODE_LABELS } from "@/lib/contractingModes";
import {
  EVALUABLE_SCENARIOS,
  SCENARIO_BY_ID,
  SENSITIVITY_LABEL,
} from "@/domain/legalUseScenarios";
import {
  evaluateScenario,
  RECOMMENDATION_LABEL,
  type Recommendation,
  type ScenarioResult,
} from "@/domain/evaluateScenario";

export async function generateStaticParams() {
  return EVALUABLE_SCENARIOS.map((s) => ({ scenarioId: s.id }));
}

const REC_ORDER: Recommendation[] = [
  "preferred_with_conditions",
  "usable_with_caution",
  "requires_contract_review",
  "not_recommended_without_enterprise",
  "insufficient_information",
];

const REC_DOT: Record<Recommendation, string> = {
  preferred_with_conditions: "text-emerald-600",
  usable_with_caution: "text-sky-700",
  requires_contract_review: "text-amber-600",
  not_recommended_without_enterprise: "text-red-600",
  insufficient_information: "text-slate-400",
};

const CONFIDENCE_LABEL = { high: "alta", medium: "media", low: "baja" } as const;

export default async function ScenarioPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  const scenario = SCENARIO_BY_ID[scenarioId];
  if (!scenario || scenario.kind !== "evaluable") notFound();

  const analyses = await loadAllLicenseAnalyses();
  const results = evaluateScenario(scenarioId, analyses);
  const groups = REC_ORDER.map((rec) => ({ rec, items: results.filter((r) => r.recommendation === rec) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/" className="text-sm text-sky-700 hover:underline">← Escenarios de uso</Link>

      <header className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Escenario · {SENSITIVITY_LABEL[scenario.sensitivity]}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{scenario.title}</h1>
        <p className="text-sm leading-relaxed text-slate-600">{scenario.description}</p>
      </header>

      <section className="rounded-md border border-l-4 border-slate-200 border-l-gold-500 bg-white p-4 text-sm text-slate-700">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-600">Orientación preliminar</h2>
        <p>
          Esta orientación prioriza las categorías del escenario y se basa en evidencia textual del parser
          determinístico. No constituye asesoramiento legal: es una señal para priorizar revisión legal humana.
          Las condiciones de una modalidad no se trasladan a otra.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Explain title="En lenguaje claro" text={scenario.plainLanguageExplanation} />
        <Explain title="En lenguaje jurídico" text={scenario.legalExplanation} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Categorías priorizadas</h2>
        <div className="flex flex-wrap gap-1.5">
          {scenario.priorityCategories.map((k) => (
            <span key={k} className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
              {CATEGORY_BY_KEY[k]?.label ?? k}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Orientación por documento ({results.length})
          </h2>
          <Link href="/compare" className="text-sm text-sky-700 hover:underline">Comparar categorías →</Link>
        </div>

        {groups.map((g) => (
          <div key={g.rec} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">
              <span className={REC_DOT[g.rec]} aria-hidden>●</span> {RECOMMENDATION_LABEL[g.rec]}{" "}
              <span className="font-normal text-slate-400">({g.items.length})</span>
            </h3>
            <div className="space-y-2">
              {g.items.map((r) => (
                <ResultCard key={r.analysisId} r={r} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="text-xs leading-relaxed text-slate-500">
        Orientación preliminar y trazable. No constituye asesoramiento legal. Toda recomendación queda sujeta a
        revisión legal humana. <Link href="/criteria" className="text-sky-700 underline">Ver criterio de riesgo</Link>.
      </p>
    </div>
  );
}

function Explain({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

function ResultCard({ r }: { r: ScenarioResult }) {
  const modes = r.appliesToModes.length > 0 ? r.appliesToModes.map((m) => MODE_LABELS[m]).join(", ") : MODE_LABELS[r.contractingMode];
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium text-slate-900">{r.providerName}</span>
          <span className="text-slate-500"> · {r.productName} · {r.documentType}</span>
        </div>
        <span className="text-xs text-slate-400">Confianza {CONFIDENCE_LABEL[r.confidence]}</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">Modalidad: {modes}</div>

      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Mini title="Motivos" items={r.reasons.slice(0, 4)} />
        <Mini title="Cautelas" items={r.cautions.slice(0, 3)} tone="amber" />
      </div>
      {r.missingEvidence.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          <span className="font-medium">Evidencia faltante:</span> {r.missingEvidence.slice(0, 3).join(" ")}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        <Link href={`/analysis/${r.analysisId}`} className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-100">Ver dossier</Link>
        <Link href={`/analysis/${r.analysisId}/source`} className="text-sky-700 hover:underline">Ver evidencia</Link>
        <Link href="/compare" className="text-sky-700 hover:underline">Comparar modalidad</Link>
      </div>
    </article>
  );
}

function Mini({ title, items, tone = "slate" }: { title: string; items: string[]; tone?: "slate" | "amber" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className={`text-xs uppercase tracking-wide ${tone === "amber" ? "text-amber-700" : "text-slate-400"}`}>{title}</div>
      <ul className="mt-0.5 space-y-0.5 text-xs text-slate-600">
        {items.map((t, i) => (
          <li key={i}>· {t}</li>
        ))}
      </ul>
    </div>
  );
}
