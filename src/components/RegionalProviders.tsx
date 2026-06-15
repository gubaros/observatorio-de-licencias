import Link from "next/link";
import { PROVIDER_REGION_VALUES, providerRegionLabel, type ProviderRegion } from "@/domain/taxonomies/providerRegions";
import { providerTypeLabel, isNonCommercialProject } from "@/domain/taxonomies/providerTypes";
import { productNicheLabel } from "@/domain/taxonomies/productNiches";

export interface RegionalRow {
  providerId: string;
  providerName: string;
  region: string;
  type: string;
  niches: string[];
  /** Route id del expediente (solo si hay análisis; si no, null). */
  dossierId: string | null;
  /** Fuente oficial (doc con URL o dominio oficial). */
  officialUrl: string | null;
  needsReview: boolean;
}

// Orden de regiones: primero las menos representadas en el eje EEUU/China.
const REGION_ORDER: ProviderRegion[] = [...PROVIDER_REGION_VALUES].sort((a, b) => {
  const pref = ["latin_america", "africa", "europe", "asia", "north_america", "global", "unknown"];
  return pref.indexOf(a) - pref.indexOf(b);
}) as ProviderRegion[];

/**
 * Directorio de proveedores y proyectos por región. Muestra, para cada uno,
 * región · tipo de proveedor · nicho funcional, distinguiendo proveedor
 * comercial de proyecto académico/soberano.
 */
export function RegionalProviders({ rows }: { rows: RegionalRow[] }) {
  const byRegion = REGION_ORDER.map((region) => ({
    region,
    items: rows.filter((r) => r.region === region).sort((a, b) => a.providerName.localeCompare(b.providerName)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {byRegion.map(({ region, items }) => (
        <div key={region}>
          <h3 className="mb-1 text-sm font-medium text-slate-800">{providerRegionLabel(region)}</h3>
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            {items.map((r) => (
              <div
                key={r.providerId}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2.5 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-900">{r.providerName}</span>
                  <span className="text-slate-500">
                    {" · "}
                    {providerRegionLabel(r.region)}
                    {" · "}
                    <span className={isNonCommercialProject(r.type) ? "text-sky-700" : undefined}>{providerTypeLabel(r.type)}</span>
                    {r.niches.length > 0 && <> {" · "}{r.niches.map((n) => productNicheLabel(n)).join(", ")}</>}
                  </span>
                  {r.needsReview && (
                    <span className="ml-2 text-xs text-amber-700">· requiere revisión de fuente</span>
                  )}
                </div>
                <div className="shrink-0 text-xs">
                  {r.dossierId ? (
                    <Link href={`/providers/${r.dossierId}`} className="text-sky-700 hover:underline">
                      Ver expediente →
                    </Link>
                  ) : r.officialUrl ? (
                    <a href={r.officialUrl} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
                      Fuente oficial →
                    </a>
                  ) : (
                    <span className="text-slate-400">Sin fuente registrada</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
