"use client";

import { useState } from "react";
import { MODE_LABELS } from "@/lib/contractingModes";
import { EvidencePanel } from "./EvidencePanel";
import type { Octagon } from "@/domain/seals";

/**
 * SELLO de advertencia (capa 1, riesgo alto). El octógono es una EXCEPCIÓN
 * consciente a la reducción de chips del proyecto: se justifica por el DEBER DE
 * INFORMACIÓN (un usuario no abogado debe poder detectar de un vistazo las
 * cláusulas más gravosas).
 *
 * Señal visual PROPIA, deliberadamente distinta del octógono oficial argentino
 * (cuya forma y color negro normado tienen un sentido jurídico-regulatorio
 * específico que no corresponde apropiarse): usamos un octógono con borde y
 * relleno suaves, no el sello normado. El SIGNIFICADO va en el texto, el ícono y
 * el `aria-label`; el color (rojo) solo refuerza.
 */

/** Octógono propio (no normado). Decorativo: el significado está en el texto. */
function OctagonShape() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <polygon
        points="7.5,2 16.5,2 22,7.5 22,16.5 16.5,22 7.5,22 2,16.5 2,7.5"
        className="fill-red-100 stroke-red-600"
        strokeWidth="1.5"
      />
      <line x1="12" y1="7" x2="12" y2="13" className="stroke-red-700" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" className="fill-red-700" />
    </svg>
  );
}

export function SealBadge({ octagon }: { octagon: Octagon }) {
  const [open, setOpen] = useState(false);
  const modes = Array.from(new Set(octagon.sources.map((s) => MODE_LABELS[s.contractingMode]))).join(", ");

  return (
    <div className="rounded-md border border-red-200 bg-red-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Advertencia: ${octagon.label}. Riesgo alto. ${open ? "Ocultar" : "Ver"} evidencia.`}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-red-50"
      >
        <OctagonShape />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-red-900">{octagon.label}</span>
          <span className="block text-xs text-red-700/80">Advertencia · riesgo alto</span>
        </span>
        <span className="shrink-0 text-xs text-red-700">{open ? "ocultar" : "ver"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-red-200 px-3 py-3 text-sm">
          {octagon.sources.map((s, i) => (
            <div key={`${s.analysisId}-${i}`} className="space-y-1.5">
              <p className="text-xs text-slate-500">
                Documento: {s.documentType} · modalidad {MODE_LABELS[s.contractingMode]}
              </p>
              {s.legalSummary && <p className="text-slate-700">{s.legalSummary}</p>}
              <EvidencePanel evidence={s.evidence} />
            </div>
          ))}
          {octagon.sources.length === 0 && (
            <p className="text-slate-500">Sin datos suficientes.</p>
          )}
          <p className="text-xs text-slate-400">Procede de la modalidad: {modes}. No constituye conclusión jurídica.</p>
        </div>
      )}
    </div>
  );
}
