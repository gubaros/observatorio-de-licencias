import Link from "next/link";
import {
  type StateOfArtOpinion,
  type ProductReading,
  type ScoreSignal,
  topSignals,
} from "@/domain/stateOfArt";

/**
 * Lectura académica del "Estado del arte", derivada de `buildStateOfArtOpinion`.
 * No es un dashboard ni un ranking: presenta, en prosa condicional y con enlaces
 * a los dossiers, qué dice el corpus actual y con qué fundamento.
 */
export function StateOfArtReading({ opinion }: { opinion: StateOfArtOpinion }) {
  const { mostRestrictive, mostExposed, bestForProfessional, cautionZones, insufficientEvidence } = opinion;

  return (
    <div className="space-y-8">
      {/* Lectura general del corpus */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lectura general del corpus</h3>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">{opinion.generalReading}</p>
      </section>

      {insufficientEvidence ? (
        <p className="max-w-3xl rounded border border-slate-200 bg-white p-4 text-base leading-relaxed text-slate-600">
          El corpus actual no contiene evidencia suficiente para identificar, con fundamento, un producto más restrictivo
          o más expuesto. La lectura se ampliará a medida que se incorporen documentos.
        </p>
      ) : (
        <>
          {/* Producto más restrictivo */}
          {mostRestrictive && (
            <ReadingBlock
              heading="Producto más restrictivo"
              lead={
                <>
                  Según el corpus actual, el producto que aparece como más restrictivo es{" "}
                  <ProductLink reading={mostRestrictive} />.
                </>
              }
              reasonsIntro="El producto aparece como más restrictivo por:"
              reasons={topSignals(mostRestrictive.restrictiveness, 3)}
              scoreValue={mostRestrictive.restrictiveness.value}
              documents={mostRestrictive.documents}
              disclaimer="Más restrictivo según el corpus analizado, no una verdad universal ni una recomendación."
            />
          )}

          {/* Producto donde la práctica legal queda más expuesta */}
          {mostExposed && (
            <ReadingBlock
              heading="Producto donde la práctica legal queda más expuesta"
              lead={
                <>
                  La práctica legal queda más expuesta, según la evidencia disponible, al usar{" "}
                  <ProductLink reading={mostExposed} />.
                </>
              }
              reasonsIntro="La práctica legal queda más expuesta cuando:"
              reasons={topSignals(mostExposed.exposure, 3)}
              scoreValue={mostExposed.exposure.value}
              documents={mostExposed.documents}
              extra={<ExposureGuidance reading={mostExposed} />}
              disclaimer="Exposición según el corpus analizado; depende de la modalidad efectivamente contratada."
            />
          )}

          {/* Productos con mejor posición documental para uso profesional */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Productos con mejor posición documental para uso profesional
            </h3>
            {bestForProfessional.length === 0 ? (
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600">
                Según el corpus actual, ningún producto reúne señales documentales suficientes (DPA, compromiso de no
                entrenamiento, confidencialidad, documentos diferenciados por modalidad) para destacarse en esta lectura.
              </p>
            ) : (
              <>
                <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
                  La evidencia disponible sugiere que, para uso profesional, presentan mejor posición documental los
                  siguientes productos. No implica que sean seguros ni que cumplan: solo que el corpus muestra compromisos
                  explícitos más claros.
                </p>
                <ul className="mt-3 space-y-2">
                  {bestForProfessional.map((r) => (
                    <li key={r.productKey} className="max-w-3xl rounded border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700">
                      <ProductLink reading={r} />{" "}
                      <span className="text-slate-400">· índice {r.readiness.value}</span>
                      <span className="mt-1 block text-slate-600">
                        {topSignals(r.readiness, 3).map((s) => s.label).join("; ")}.
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* Principales zonas de cautela */}
          {cautionZones.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Principales zonas de cautela</h3>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-700">
                Según el corpus actual, las cláusulas que conviene revisar con más cuidado, por frecuencia en los documentos
                de IA analizados, son:
              </p>
              <ul className="mt-3 max-w-3xl space-y-1 text-sm text-slate-700">
                {cautionZones.map((z) => (
                  <li key={z.categoryKey} className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-slate-900">{z.label}</span>
                    <span className="text-slate-500">presente en {z.count} de {z.total} documentos</span>
                    {z.exampleDocumentId && (
                      <Link href={`/analysis/${z.exampleDocumentId}`} className="text-xs text-sky-700 hover:underline">
                        ver ejemplo →
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Apreciaciones relevantes */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Apreciaciones relevantes</h3>
        <ul className="mt-2 max-w-3xl list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-700">
          {opinion.appreciations.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>

      {/* Límites de esta lectura */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Límites de esta lectura</h3>
        <ul className="mt-2 max-w-3xl list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-500">
          {opinion.limits.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProductLink({ reading }: { reading: ProductReading }) {
  return (
    <Link href={`/providers/${reading.providerId}`} className="font-medium text-sky-700 hover:underline">
      {reading.providerName} · {reading.productName}
    </Link>
  );
}

function ReadingBlock({
  heading,
  lead,
  reasonsIntro,
  reasons,
  scoreValue,
  documents,
  extra,
  disclaimer,
}: {
  heading: string;
  lead: React.ReactNode;
  reasonsIntro: string;
  reasons: ScoreSignal[];
  scoreValue: number;
  documents: { id: string; documentType: string }[];
  extra?: React.ReactNode;
  disclaimer: string;
}) {
  return (
    <section className="max-w-3xl rounded border border-l-4 border-slate-200 border-l-gold-500 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</h3>
      <p className="mt-2 text-base leading-relaxed text-slate-800">{lead}</p>

      <p className="mt-3 text-sm font-medium text-slate-700">
        {reasonsIntro} <span className="font-normal text-slate-400">(índice {scoreValue}, suma de señales del corpus)</span>
      </p>
      <ol className="mt-1 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        {reasons.map((s) => (
          <li key={s.key}>
            {s.label}
            {s.evidence && (
              <span className="mt-1 block border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                “{s.evidence.quote}”
                {s.documentId && (
                  <>
                    {" "}
                    <Link href={`/analysis/${s.documentId}`} className="not-italic text-sky-700 hover:underline">
                      {s.documentType} →
                    </Link>
                  </>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>

      {extra}

      <div className="mt-3 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Documentos que sostienen la conclusión: </span>
        {documents.map((d, i) => (
          <span key={d.id}>
            {i > 0 && " · "}
            <Link href={`/analysis/${d.id}`} className="text-sky-700 hover:underline">
              {d.documentType}
            </Link>
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs italic text-slate-400">{disclaimer}</p>
    </section>
  );
}

/** Para el producto más expuesto: de qué modalidad depende y qué leer primero. */
function ExposureGuidance({ reading }: { reading: ProductReading }) {
  const dependsOnGeneral = reading.exposure.signals.some((s) => s.key === "general_scope");
  const noDpa = reading.exposure.signals.some((s) => s.key === "no_dpa");
  const trainingDocs = reading.documents.filter((d) => /privacy|terms|use/i.test(d.documentType));
  return (
    <div className="mt-3 space-y-1 text-sm leading-relaxed text-slate-700">
      <p>
        <span className="font-medium text-slate-700">¿De qué depende? </span>
        {dependsOnGeneral
          ? "La exposición es mayor en la modalidad general no diferenciada (típicamente cuenta gratuita o individual); "
          : "La exposición varía según la modalidad contratada; "}
        {noDpa
          ? "el corpus no registra un DPA ni términos enterprise/business claros que la acoten."
          : "conviene verificar si la modalidad business/enterprise acota estas condiciones."}
      </p>
      <p>
        <span className="font-medium text-slate-700">¿Qué leer primero? </span>
        La política de privacidad y las cláusulas de uso de datos para entrenamiento y de licencia sobre el contenido
        {trainingDocs.length > 0 && (
          <>
            {" "}(
            {trainingDocs.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link href={`/analysis/${d.id}`} className="text-sky-700 hover:underline">
                  {d.documentType}
                </Link>
              </span>
            ))}
            )
          </>
        )}
        .
      </p>
    </div>
  );
}
