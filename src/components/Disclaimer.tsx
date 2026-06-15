/** Descargo general: el MVP no es asesoramiento legal. */
export function LegalDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 ${className}`}>
      UP-Law-AILO ofrece orientación preliminar basada en documentos públicos y evidencia textual.
      No constituye asesoramiento legal.
    </p>
  );
}
