/**
 * Cautela rectangular (riesgo medio). Rectángulo negro con texto blanco y pie
 * "E-Law". Presentación pura; el significado va en el texto y en `aria-label`.
 * La expansión con evidencia la maneja el contenedor.
 */
export function PrecautionaryLegend({ text, foot = "E-Law" }: { text: string; foot?: string }) {
  return (
    <span role="img" aria-label={`Cautela: ${text}`}
      style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:1,
               background:"#000", border:"1.4px solid #fff", outline:"0.8px solid #000",
               borderRadius:4, padding:"6px 12px" }}>
      <span style={{ color:"#fff", fontWeight:700, fontSize:11, fontFamily:"var(--font-sans, sans-serif)" }}>{text}</span>
      <span style={{ color:"#fff", fontSize:8, fontFamily:"var(--font-sans, sans-serif)" }}>{foot}</span>
    </span>
  );
}
