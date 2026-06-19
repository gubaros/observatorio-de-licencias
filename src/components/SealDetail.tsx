import { MODE_LABELS } from "@/lib/contractingModes";
import { EvidencePanel } from "./EvidencePanel";
import type { SealSource } from "@/domain/seals";

/**
 * Panel de detalle de un sello (octógono o cautela): por cada documento de
 * origen, su resumen jurídico y la evidencia textual. Compartido por la góndola
 * y la consola para no duplicar la expansión.
 */
export function SealDetail({ title, sources }: { title: string; sources: SealSource[] }) {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {sources.map((s, i) => (
        <div key={`${s.analysisId}-${i}`} className="space-y-1.5">
          <p className="text-xs text-slate-500">
            Documento: {s.documentType} · modalidad {MODE_LABELS[s.contractingMode]}
          </p>
          {s.legalSummary && <p className="text-slate-700">{s.legalSummary}</p>}
          <EvidencePanel evidence={s.evidence} />
        </div>
      ))}
      <p className="text-xs text-slate-400">Procede del/de los documento(s) citado(s). No constituye conclusión jurídica.</p>
    </div>
  );
}
