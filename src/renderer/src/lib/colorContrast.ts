/** Colores de grupo legibles sobre fondo bone (#FAFAF7). */

const BONE = '#fafaf7'
const INK = '#0b1020'
const MIN_CONTRAST = 4.5

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.replace(/^#/, '')
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16)
    ]
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  return null
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function mixHex(a: string, b: string, t: number): string {
  const ra = parseHex(a)
  const rb = parseHex(b)
  if (!ra || !rb) return INK
  const u = 1 - t
  return toHex(ra[0] * u + rb[0] * t, ra[1] * u + rb[1] * t, ra[2] * u + rb[2] * t)
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 0
  const [rs, gs, bs] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

/** Acento oscuro con buen contraste sobre bone (texto, bordes, puntos). */
export function colorOnLightBg(hex: string): string {
  let t = 0
  let out = hex
  while (t <= 1) {
    out = mixHex(hex, INK, t)
    if (contrastRatio(out, BONE) >= MIN_CONTRAST) return out
    t += 0.06
  }
  return INK
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex)
  if (!rgb) return `rgba(11, 16, 32, ${alpha})`
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

type ChipStyle = {
  color: string
  background: string
  borderColor: string
  fontWeight: number
}

export function groupBadgeStyle(hex: string): ChipStyle {
  const accent = colorOnLightBg(hex)
  return {
    color: accent,
    background: hexToRgba(accent, 0.14),
    borderColor: hexToRgba(accent, 0.5),
    fontWeight: 600
  }
}

/** Chip de filtro activo: fondo tintado + texto siempre oscuro. */
export function groupChipStyle(hex: string): ChipStyle {
  const accent = colorOnLightBg(hex)
  return {
    background: hexToRgba(accent, 0.16),
    color: INK,
    borderColor: hexToRgba(accent, 0.55),
    fontWeight: 600
  }
}
