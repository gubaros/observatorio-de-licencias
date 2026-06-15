"use client";

import { useState } from "react";
import type { CategoryFinding } from "@/lib/schema";
import type { RiskLevel } from "@/lib/types";
import { EvidencePanel } from "./EvidencePanel";
import { MODE_LABELS } from "@/lib/analysisMeta";

const STATUS_TEXT: Record<CategoryFinding["status"], string> = {
  found: "Cláusula detectada por parser",
  not_found: "No se detectó cláusula",
  unclear: "Redacción ambigua",
};
const STATUS_DOT: Record<CategoryFinding["status"], string> = {
  found: "text-sky-700",
  not_found: "text-slate-400",
  unclear: "text-amber-600",
};
const RISK_WORD: Record<RiskLevel, string> = { low: "bajo", medium: "medio", high: "alto", unknown: "desconocido" };
const RISK_DOT: Record<RiskLevel, string> = { low: "text-emerald-600", medium: "text-amber-600", high: "text-red-600", unknown: "text-slate-400" };

/**
 * Ficha de análisis jurídico de una categoría. Sobria y expandible, no una
 * tarjeta decorativa. Muestra el resumen jurídico, evidencia y modalidad.
 */
export function LegalCategorySection({ label, finding }: { label: string; finding: CategoryFinding }) {
  const [open, setOpen] = useState(false);
  const inconsistent = finding.status === "found" && finding.evidence.length === 0;

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 py-3 text-left hover:bg-slate-50/60"
      >
        <div className="min-w-0">
          <h3 className="font-medium text-slate-900">{label}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            <span className={STATUS_DOT[finding.status]}>●</span> {STATUS_TEXT[finding.status]}
            <span className="mx-1 text-slate-300">·</span>
            riesgo <span className={RISK_DOT[finding.riskLevel]}>●</span> {RISK_WORD[finding.riskLevel]}
            {finding.modeSpecificity === "mode_specific" && finding.appliesToModes.length > 0 && (
              <>
                <span className="mx-1 text-slate-300">·</span>
                específico: {finding.appliesToModes.map((m) => MODE_LABELS[m]).join(", ")}
              </>
            )}
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-400">{open ? "ocultar" : "ver ficha"}</span>
      </button>

      {open && (
        <div className="space-y-3 pb-4 pl-1 text-sm">
          {inconsistent && (
            <p className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-800">
              Inconsistencia: cláusula detectada sin evidencia textual. Requiere revisión.
            </p>
          )}
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">Resumen</span>
            <p className="text-slate-700">{finding.legalSummary}</p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-400">Evidencia textual disponible</span>
            <div className="mt-1">
              <EvidencePanel evidence={finding.evidence} />
            </div>
          </div>
          {finding.notes && <p className="text-xs italic text-slate-500">Notas: {finding.notes}</p>}
          <p className="text-xs text-slate-400">Sin revisión legal humana.</p>
        </div>
      )}
    </div>
  );
}
