/**
 * Cautela rectangular (riesgo medio). Más sobria que el octógono: rectángulo
 * negro con texto blanco y pie "UP Law". Presentación pura; el significado va en
 * el texto y en `aria-label`. La expansión con evidencia la maneja el contenedor.
 */
export function PrecautionaryLegend({ text, foot = "UP Law" }: { text: string; foot?: string }) {
  return (
    <span role="img" aria-label={`Cautela: ${text}`}
      style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:1,
               background:"#000", border:"1.4px solid #fff", outline:"0.8px solid #000",
               borderRadius:4, padding:"7px 14px" }}>
      <span style={{ color:"#fff", fontWeight:700, fontSize:12, fontFamily:"var(--font-sans, sans-serif)" }}>{text}</span>
      <span style={{ color:"#fff", fontSize:8, fontFamily:"var(--font-sans, sans-serif)" }}>{foot}</span>
    </span>
  );
}
