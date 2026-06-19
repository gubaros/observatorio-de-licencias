/**
 * Octógono de advertencia (riesgo alto). `size` fija el tamaño por VISTA (todos
 * iguales dentro de cada vista); solo la fuente se autoajusta, nunca la caja.
 * Marco blanco + línea negra perimetral + cuerpo negro; pie "E-Law" (reemplaza la
 * atribución estatal del sello oficial, Ley 27.642). `compact` (tira-índice del
 * expediente) oculta la línea perimetral y el pie.
 *
 * Presentación pura: el significado va en el texto y en `aria-label`; el color
 * (blanco/negro) no aporta semántica por sí solo.
 */
export function SealBadge({ lines, label, size = 112, foot = "E-Law", compact = false }: {
  lines: string[]; label: string; size?: number; foot?: string | null; compact?: boolean;
}) {
  const longest = Math.max(...lines.map((l) => l.length));
  const SAFE_W = 56, CHAR = 0.62;
  const fs = Math.max(8, Math.min(SAFE_W / (longest * CHAR), lines.length >= 3 ? 10.5 : 13));
  const gap = fs + 1.5;
  const showFoot = !compact && !!foot;
  const cy = showFoot ? 46 : 50;
  const startY = cy - ((lines.length - 1) * gap) / 2 + fs / 3;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" role="img" aria-label={`Advertencia: ${label}`}>
      <polygon points="29,1 71,1 99,29 99,71 71,99 29,99 1,71 1,29" fill="#fff" stroke="#000" strokeWidth="0.8" />
      {!compact && <polygon points="31.5,7 68.5,7 93,31.5 93,68.5 68.5,93 31.5,93 7,68.5 7,31.5" fill="none" stroke="#000" strokeWidth="1.4" />}
      <polygon points="33,12 67,12 88,33 88,67 67,88 33,88 12,67 12,33" fill="#000" />
      <text textAnchor="middle" fill="#fff" fontWeight={700} fontFamily="var(--font-sans, sans-serif)" fontSize={fs}>
        {lines.map((l, i) => <tspan key={i} x="50" y={startY + i * gap}>{l}</tspan>)}
      </text>
      {showFoot && <text x="50" y="78" textAnchor="middle" fill="#fff" fontSize="5.5" fontFamily="var(--font-sans, sans-serif)">{foot}</text>}
    </svg>
  );
}
