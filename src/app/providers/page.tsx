import { loadAllLicenseAnalyses } from "@/lib/storage";
import { providerSummaries } from "@/lib/derive";
import { ProviderOverview } from "@/components/ProviderOverview";

export const metadata = { title: "Proveedores — UP-Law-AILO" };

export default async function ProvidersPage() {
  const analyses = await loadAllLicenseAnalyses();
  const summaries = providerSummaries(analyses);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900">Proveedores</h1>
        <p className="text-sm text-slate-600">
          Un proveedor por fila. Entrá a cada uno para ver su expediente organizado por modalidad de
          contratación, con documentos existentes y faltantes.
        </p>
      </header>

      {summaries.length === 0 ? (
        <p className="text-sm text-slate-500">No hay proveedores cargados.</p>
      ) : (
        <ProviderOverview summaries={summaries} />
      )}

    </div>
  );
}
