import Link from "next/link";
import { notFound } from "next/navigation";
import { loadLicenseAnalysis, loadAllLicenseAnalyses } from "@/lib/storage";
import { CATEGORIES } from "@/lib/categories";
import { LegalDossierHeader } from "@/components/LegalDossierHeader";
import { ModeIndicator, PrivacyIndicator, RiskIndicator, SourceIndicator, ReviewIndicator } from "@/components/indicators";
import { LegalCategorySection } from "@/components/LegalCategorySection";

// Pre-genera una página por cada análisis en data/licenses (export estático).
export async function generateStaticParams() {
  const all = await loadAllLicenseAnalyses();
  return all.map((a) => ({ id: a.id }));
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await loadLicenseAnalysis(id);
  if (!analysis) notFound();

  const ordered = CATEGORIES.filter((cat) => analysis.categories[cat.key]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/analyses" className="text-sm text-sky-700 hover:underline">← Tabla de análisis</Link>

      <LegalDossierHeader analysis={analysis} />

      <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
        <ModeIndicator analysis={analysis} />
        <PrivacyIndicator analysis={analysis} />
        <RiskIndicator analysis={analysis} />
        <ReviewIndicator analysis={analysis} />
        <div className="md:col-span-2">
          <SourceIndicator analysis={analysis} />
          <div className="mt-2">
            <Link
              href={`/analysis/${analysis.id}/source`}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Ver texto fuente extraído
            </Link>
          </div>
        </div>
      </div>

      <section className="border-t-2 border-slate-200 pt-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Resumen general</h2>
        <p className="text-sm text-slate-700">{analysis.overall.legalSummary}</p>
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Categorías jurídicas ({ordered.length})
        </h2>
        <div className="rounded border border-slate-200 bg-white px-4">
          {ordered.map((cat) => (
            <div key={cat.key} id={`cat-${cat.key}`} className="scroll-mt-24">
              <LegalCategorySection label={cat.label} finding={analysis.categories[cat.key]} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
