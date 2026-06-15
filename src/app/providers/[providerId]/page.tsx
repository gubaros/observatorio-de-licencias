import { notFound } from "next/navigation";
import { loadAllLicenseAnalyses } from "@/lib/storage";
import { loadRegistry, flattenDocuments } from "@/lib/sources";
import { providerKey } from "@/lib/derive";
import { getProviderContext } from "@/domain/providerContext";
import { PageContainer } from "@/components/PageContainer";
import { ProviderDossier, type PendingDoc } from "@/components/ProviderDossier";

// Pre-genera una página por cada proveedor con análisis (export estático).
export async function generateStaticParams() {
  const all = await loadAllLicenseAnalyses();
  const ids = Array.from(new Set(all.map((a) => providerKey(a))));
  return ids.map((providerId) => ({ providerId }));
}

export default async function ProviderPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;
  const all = await loadAllLicenseAnalyses();
  const analyses = all.filter((a) => providerKey(a) === providerId);
  if (analyses.length === 0) notFound();

  // Documentos pendientes / no disponibles del registro para este proveedor.
  let pending: PendingDoc[] = [];
  try {
    const reg = await loadRegistry();
    pending = flattenDocuments(reg, providerId)
      .filter((d) => d.document.sourceStatus !== "verified")
      .map((d) => ({
        documentType: d.document.documentType,
        sourceStatus: d.document.sourceStatus,
        sourceUrl: d.document.sourceUrl,
      }));
  } catch {
    pending = [];
  }

  return (
    <PageContainer>
      <ProviderDossier analyses={analyses} pending={pending} context={getProviderContext(providerId)} />
    </PageContainer>
  );
}
