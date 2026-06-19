"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LicenseAnalysis } from "@/lib/schema";
import { MODE_LABELS, type ContractingMode } from "@/lib/contractingModes";
import {
  octogonosFor,
  leyendasFor,
  nutritionLabel,
  availableModesFor,
  defaultModeFor,
} from "@/domain/seals";
import { SealBadge } from "./SealBadge";
import { PrecautionaryLegend } from "./PrecautionaryLegend";
import { NutritionLabel } from "./NutritionLabel";

/**
 * Etiqueta frontal de UN producto. La unidad es PRODUCTO × MODALIDAD: el
 * selector elige la modalidad y todo lo derivado (octógonos, leyendas, tabla)
 * se recalcula para ESA modalidad (las modalidades no se trasladan). Todo se
 * deriva del corpus con `src/domain/seals.ts`; nada se afirma sin evidencia.
 */
export function ProductLabelCard({
  providerId,
  productName,
  analyses,
}: {
  providerId: string;
  productName: string;
  analyses: LicenseAnalysis[];
}) {
  const modes = useMemo(() => orderModes(availableModesFor(analyses)), [analyses]);
  const [mode, setMode] = useState<ContractingMode>(() => defaultModeFor(analyses));

  const octagons = useMemo(() => octogonosFor(analyses, mode), [analyses, mode]);
  const legends = useMemo(() => leyendasFor(analyses, mode), [analyses, mode]);
  const label = useMemo(() => nutritionLabel(analyses, mode), [analyses, mode]);

  const selectId = `mode-${providerId}-${slug(productName)}`;

  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-slate-900">{productName}</h3>
        <Link href={`/providers/${providerId}`} className="text-xs text-sky-700 hover:underline">
          ver expediente →
        </Link>
      </header>

      {/* Selector de modalidad por tarjeta. */}
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="text-xs text-slate-500">Modalidad</label>
        <select
          id={selectId}
          value={mode}
          onChange={(e) => setMode(e.target.value as ContractingMode)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
        >
          {modes.map((m) => (
            <option key={m} value={m}>{MODE_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* Capa 1: octógonos de advertencia. */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Advertencias</h4>
        {octagons.length > 0 ? (
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {octagons.map((o) => (
              <SealBadge key={o.categoryKey} octagon={o} />
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            No se detectaron cláusulas de riesgo alto para esta modalidad en el corpus. No implica ausencia: puede faltar el documento aplicable.
          </p>
        )}
      </div>

      {/* Capa 2: leyendas precautorias. */}
      {legends.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cautelas</h4>
          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {legends.map((l) => (
              <PrecautionaryLegend key={l.key} legend={l} />
            ))}
          </div>
        </div>
      )}

      {/* Capa 3: tabla nutricional del clausulado. */}
      <NutritionLabel data={label} />
    </article>
  );
}

const MODE_ORDER: ContractingMode[] = [
  "free",
  "all",
  "paid_individual",
  "team",
  "business",
  "enterprise",
  "api",
  "education",
  "open_source",
  "unknown",
];

function orderModes(modes: ContractingMode[]): ContractingMode[] {
  return [...modes].sort((a, b) => MODE_ORDER.indexOf(a) - MODE_ORDER.indexOf(b));
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
