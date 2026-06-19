"use client";

import { useState } from "react";
import { MODE_LABELS } from "@/lib/contractingModes";
import { EvidencePanel } from "./EvidencePanel";
import type { Legend } from "@/domain/seals";

/**
 * LEYENDA precautoria (capa 2, riesgo medio). A diferencia del octógono, no es
 * una advertencia grave: es una cautela. Señal sobria (un punto ámbar de
 * refuerzo); el significado vive en el texto y el `aria-label`. Expandible para
 * mostrar la evidencia textual que la respalda.
 */
export function PrecautionaryLegend({ legend }: { legend: Legend }) {
  const [open, setOpen] = useState(false);
  const modes = Array.from(new Set(legend.sources.map((s) => MODE_LABELS[s.contractingMode]))).join(", ");

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Cautela: ${legend.label}. Riesgo medio. ${open ? "Ocultar" : "Ver"} evidencia.`}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-amber-50"
      >
        <span className="text-amber-600" aria-hidden>▲</span>
        <span className="min-w-0 flex-1 text-sm text-amber-900">{legend.label}</span>
        <span className="shrink-0 text-xs text-amber-700">{open ? "ocultar" : "ver"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-amber-200 px-3 py-3 text-sm">
          {legend.sources.map((s, i) => (
            <div key={`${s.analysisId}-${i}`} className="space-y-1.5">
              <p className="text-xs text-slate-500">
                Documento: {s.documentType} · modalidad {MODE_LABELS[s.contractingMode]}
              </p>
              {s.legalSummary && <p className="text-slate-700">{s.legalSummary}</p>}
              <EvidencePanel evidence={s.evidence} />
            </div>
          ))}
          <p className="text-xs text-slate-400">Procede de la modalidad: {modes}. Cautela preliminar, no conclusión jurídica.</p>
        </div>
      )}
    </div>
  );
}
