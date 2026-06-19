/**
 * Octógono de advertencia (riesgo alto). TAMAÑO FIJO e idéntico para todos
 * (112×112); solo la fuente se autoajusta, nunca la caja. Marco blanco + línea
 * negra perimetral + cuerpo negro. Octágono PROPIO, deliberadamente distinto del
 * sello oficial (Ley 27.642): el pie "UP Law" reemplaza la atribución estatal.
 *
 * Es presentación pura: el significado va en el texto y en `aria-label`; el
 * color (blanco/negro) no aporta semántica por sí solo. La expansión con
 * `legalSummary` + evidencia la maneja el contenedor (ProductLabelCard).
 */
export function SealBadge({ lines, label, foot = "UP Law" }: {
  lines: string[]; label: string; foot?: string;
}) {
  const longest = Math.max(...lines.map((l) => l.length));
  const SAFE_W = 56, CHAR = 0.62;
  const fs = Math.max(8, Math.min(SAFE_W / (longest * CHAR), lines.length >= 3 ? 10.5 : 13));
  const gap = fs + 1.5;
  const startY = 46 - ((lines.length - 1) * gap) / 2 + fs / 3;
  return (
    <svg viewBox="0 0 100 100" width={112} height={112} className="shrink-0"
         role="img" aria-label={`Advertencia: ${label}`}>
      <polygon points="29,1 71,1 99,29 99,71 71,99 29,99 1,71 1,29" fill="#fff" stroke="#000" strokeWidth="0.8" />
      <polygon points="31.5,7 68.5,7 93,31.5 93,68.5 68.5,93 31.5,93 7,68.5 7,31.5" fill="none" stroke="#000" strokeWidth="1.4" />
      <polygon points="33,12 67,12 88,33 88,67 67,88 33,88 12,67 12,33" fill="#000" />
      <text textAnchor="middle" fill="#fff" fontWeight={700} fontFamily="var(--font-sans, sans-serif)" fontSize={fs}>
        {lines.map((l, i) => <tspan key={i} x="50" y={startY + i * gap}>{l}</tspan>)}
      </text>
      <text x="50" y="78" textAnchor="middle" fill="#fff" fontSize="5.5" fontFamily="var(--font-sans, sans-serif)">{foot}</text>
    </svg>
  );
}
