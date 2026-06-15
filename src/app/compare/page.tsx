import Link from "next/link";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { ComparisonMatrix } from "@/components/ComparisonMatrix";

export const metadata = { title: "Comparar — UP-Law-AILO" };

export default async function ComparePage() {
  const analyses = await loadAllLicenseAnalyses();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Matriz comparativa</h1>
        <p className="text-slate-600">
          Categorías jurídicas (filas) frente a proveedor / producto / plan (columnas).
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No hay análisis para comparar.</p>
          <Link href="/upload" className="mt-2 inline-block text-sky-700 underline">
            Cargá una licencia
          </Link>
        </div>
      ) : (
        <ComparisonMatrix analyses={analyses} />
      )}

    </div>
  );
}
