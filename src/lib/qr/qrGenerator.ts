/**
 * Générateur de QR code pur TypeScript — zéro dépendance
 * Implémente QR Code version 2-10, correction d'erreur niveau M
 * Génère un SVG string et un Canvas DataURL
 */

// ── Encodage Reed-Solomon simplifié (Level M — 15% correction) ──

const GF_EXP = new Uint8Array(256)
const GF_LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x = x << 1
    if (x & 0x100) x ^= 0x11d
  }
  GF_EXP[255] = GF_EXP[0]
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255]
}

function rsPoly(nTerms: number): number[] {
  let g = [1]
  for (let i = 0; i < nTerms; i++) {
    g = polyMul(g, [1, GF_EXP[i]])
  }
  return g
}

function polyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0)
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++)
      r[i + j] ^= gfMul(p[i], q[j])
  return r
}

function rsEncode(data: number[], nEC: number): number[] {
  const gen = rsPoly(nEC)
  const msg = [...data, ...new Array(nEC).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const c = msg[i]
    if (c !== 0)
      for (let j = 0; j < gen.length; j++)
        msg[i + j] ^= gfMul(gen[j], c)
  }
  return msg.slice(data.length)
}

// ── Encodage des données (Byte mode) ─────────────────────────────

function encodeData(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (c > 0x7F) {
      // UTF-8 encoding
      if (c < 0x800) {
        bytes.push((c >> 6) | 0xC0, (c & 0x3F) | 0x80)
      } else {
        bytes.push((c >> 12) | 0xE0, ((c >> 6) & 0x3F) | 0x80, (c & 0x3F) | 0x80)
      }
    } else {
      bytes.push(c)
    }
  }
  return bytes
}

// ── Version et capacité ──────────────────────────────────────────

const VERSIONS: { size: number; dataBytes: number; ecBytes: number }[] = [
  { size: 0, dataBytes: 0, ecBytes: 0 },     // placeholder
  { size: 21, dataBytes: 16, ecBytes: 10 },   // v1
  { size: 25, dataBytes: 28, ecBytes: 16 },   // v2
  { size: 29, dataBytes: 44, ecBytes: 26 },   // v3
  { size: 33, dataBytes: 64, ecBytes: 36 },   // v4
  { size: 37, dataBytes: 86, ecBytes: 48 },   // v5
  { size: 41, dataBytes: 108, ecBytes: 64 },  // v6
  { size: 45, dataBytes: 124, ecBytes: 72 },  // v7
  { size: 49, dataBytes: 154, ecBytes: 88 },  // v8
  { size: 53, dataBytes: 182, ecBytes: 110 }, // v9
  { size: 57, dataBytes: 216, ecBytes: 130 }, // v10
]

function selectVersion(dataLen: number): number {
  for (let v = 1; v < VERSIONS.length; v++) {
    if (VERSIONS[v].dataBytes >= dataLen + 3) return v
  }
  return 10
}

// ── Placement des modules ────────────────────────────────────────

type Matrix = Uint8Array[]

function makeMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => new Uint8Array(size).fill(2))
}

function setPattern(matrix: Matrix, row: number, col: number, pattern: number[][]): void {
  for (let r = 0; r < pattern.length; r++)
    for (let c = 0; c < pattern[r].length; c++)
      if (row + r >= 0 && row + r < matrix.length && col + c >= 0 && col + c < matrix[0].length)
        matrix[row + r][col + c] = pattern[r][c]
}

const FINDER = [
  [1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1],
]

const SEPARATOR_H = [[0,0,0,0,0,0,0,0]]
const SEPARATOR_V = [[0],[0],[0],[0],[0],[0],[0]]

function placeFinders(matrix: Matrix, size: number): void {
  // TL
  setPattern(matrix, 0, 0, FINDER)
  setPattern(matrix, 7, 0, SEPARATOR_H)
  setPattern(matrix, 0, 7, [[0],[0],[0],[0],[0],[0],[0],[0]])
  // TR
  setPattern(matrix, 0, size - 7, FINDER)
  setPattern(matrix, 7, size - 8, SEPARATOR_H)
  setPattern(matrix, 0, size - 8, [[0],[0],[0],[0],[0],[0],[0],[0]])
  // BL
  setPattern(matrix, size - 7, 0, FINDER)
  setPattern(matrix, size - 8, 0, SEPARATOR_H)
  setPattern(matrix, size - 7, 7, [[0],[0],[0],[0],[0],[0],[0],[0]])
}

function placeTiming(matrix: Matrix, size: number): void {
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0
    if (matrix[6][i] === 2) matrix[6][i] = v
    if (matrix[i][6] === 2) matrix[i][6] = v
  }
}

function placeAlignment(matrix: Matrix, version: number): void {
  if (version < 2) return
  const alignPos: number[][] = [
    [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  ]
  const positions = alignPos[version] ?? []
  for (const r of positions) {
    for (const c of positions) {
      if (matrix[r][c] !== 2) continue
      const pattern = [
        [1,1,1,1,1],
        [1,0,0,0,1],
        [1,0,1,0,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ]
      setPattern(matrix, r - 2, c - 2, pattern)
    }
  }
}

function placeFormatInfo(matrix: Matrix, mask: number): void {
  // Format string for ECC level M + mask pattern
  const FORMAT_STRINGS: Record<number, number[]> = {
    0: [1,1,0,1,0,0,0,0,1,0,0,1,1,1,0],
    1: [1,1,0,0,1,1,1,0,0,1,1,0,1,0,0],
    2: [1,1,1,1,1,0,0,1,0,1,0,0,0,0,1],
    3: [1,1,1,0,0,1,1,1,1,0,0,1,0,1,1],
    4: [1,0,0,1,0,1,0,1,0,1,1,1,1,1,0],
    5: [1,0,0,0,1,0,1,1,1,0,1,0,1,0,0],
    6: [1,0,1,0,1,1,0,0,1,0,0,0,0,0,1],
    7: [1,0,1,1,0,0,1,0,0,1,0,1,0,1,1],
  }
  const fmt = FORMAT_STRINGS[mask] ?? FORMAT_STRINGS[0]
  const size = matrix.length
  const pos = [0,1,2,3,4,5,7,8,8,8,8,8,8,8,8]
  const pos2 = [8,8,8,8,8,8,8,8,7,5,4,3,2,1,0]
  for (let i = 0; i < 15; i++) {
    matrix[pos[i]][8] = fmt[i]
    matrix[8][pos2[i]] = fmt[i]
  }
  // Dark module
  matrix[size - 8][8] = 1
}

function isReserved(matrix: Matrix, r: number, c: number): boolean {
  return matrix[r][c] !== 2
}

function applyMask(matrix: Matrix, mask: number): Matrix {
  const size = matrix.length
  const m: Matrix = matrix.map(r => new Uint8Array(r))
  const conditions = [
    (r: number, c: number) => (r + c) % 2 === 0,
    (r: number) => r % 2 === 0,
    (_: number, c: number) => c % 3 === 0,
    (r: number, c: number) => (r + c) % 3 === 0,
    (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: number, c: number) => (r * c) % 2 + (r * c) % 3 === 0,
    (r: number, c: number) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r: number, c: number) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ]
  const cond = conditions[mask]
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!isReserved(matrix, r, c) || matrix[r][c] === 2)
        if (cond(r, c)) m[r][c] = m[r][c] === 1 ? 0 : 1
  return m
}

// ── Placement des bits de données ────────────────────────────────

function placeData(matrix: Matrix, bits: number[]): void {
  const size = matrix.length
  let bitIdx = 0
  let goingUp = true
  let col = size - 1
  while (col >= 0) {
    if (col === 6) col--
    for (let rowOffset = 0; rowOffset < size; rowOffset++) {
      const row = goingUp ? size - 1 - rowOffset : rowOffset
      for (const dc of [0, 1]) {
        const c = col - dc
        if (matrix[row][c] === 2) {
          matrix[row][c] = bitIdx < bits.length ? bits[bitIdx++] : 0
        }
      }
    }
    goingUp = !goingUp
    col -= 2
  }
}

// ── Pipeline principal ────────────────────────────────────────────

export interface QROptions {
  size?: number
  foreground?: string
  background?: string
  margin?: number
}

export function generateQR(text: string, options: QROptions = {}): string {
  const {
    foreground = '#1a1a2e',
    background = '#ffffff',
    margin = 4,
  } = options

  const dataBytes = encodeData(text)
  const version = selectVersion(dataBytes.length)
  const vInfo = VERSIONS[version]
  const size = vInfo.size

  // Build bit stream
  const bits: number[] = []
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1)
  }

  push(0b0100, 4)                    // Byte mode
  push(dataBytes.length, 8)          // Character count
  dataBytes.forEach(b => push(b, 8)) // Data

  // Terminator + padding
  push(0, 4)
  while (bits.length % 8 !== 0) bits.push(0)
  const byteStream = []
  for (let i = 0; i < bits.length; i += 8) {
    byteStream.push(bits.slice(i, i + 8).reduce((acc, b, j) => acc | (b << (7 - j)), 0))
  }
  while (byteStream.length < vInfo.dataBytes) {
    byteStream.push(byteStream.length % 2 === 0 ? 0xEC : 0x11)
  }

  // Error correction
  const ecBytes = rsEncode(byteStream, vInfo.ecBytes)
  const allBytes = [...byteStream, ...ecBytes]
  const allBits: number[] = []
  allBytes.forEach(b => { for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1) })

  // Build matrix
  const matrix = makeMatrix(size)
  placeFinders(matrix, size)
  placeTiming(matrix, size)
  placeAlignment(matrix, version)
  placeFormatInfo(matrix, 0) // Reserve format info
  placeData(matrix, allBits)
  const masked = applyMask(matrix, 0)
  placeFormatInfo(masked, 0)

  // Generate SVG
  const cellSize = 10
  const totalSize = (size + margin * 2) * cellSize
  const rects: string[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (masked[r][c] === 1) {
        const x = (c + margin) * cellSize
        const y = (r + margin) * cellSize
        rects.push(`<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${foreground}"/>`)
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">
  <rect width="${totalSize}" height="${totalSize}" fill="${background}"/>
  ${rects.join('\n  ')}
</svg>`
}

export function qrToDataURL(svgString: string): string {
  const encoded = encodeURIComponent(svgString)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}
