import { normaliseBarcode } from '@/services/ebay'

/** Retail barcode formats that map to a GTIN eBay can search. */
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

interface DetectedBarcode {
  rawValue: string
  format: string
}

interface Detector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}

type DetectorConstructor = new (options: { formats: string[] }) => Detector

let detectorPromise: Promise<Detector> | null = null

/**
 * Returns a barcode reader. Uses the browser's built-in BarcodeDetector where it supports retail
 * barcodes (Chrome on Android, recent macOS), otherwise lazy-loads a WebAssembly reader (ZXing) that
 * is served from this site, so iPhones and desktop browsers can scan too. The WASM chunk only
 * downloads the first time someone opens Barcode mode.
 */
export function getBarcodeDetector(): Promise<Detector> {
  detectorPromise ??= (async () => {
    const Native = (globalThis as { BarcodeDetector?: DetectorConstructor & { getSupportedFormats?: () => Promise<string[]> } })
      .BarcodeDetector
    if (Native?.getSupportedFormats) {
      const supported = await Native.getSupportedFormats().catch(() => [] as string[])
      if (supported.includes('ean_13') && supported.includes('upc_a')) {
        return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) })
      }
    }
    const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ])
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
      },
    })
    return new BarcodeDetector({ formats: [...FORMATS] }) as unknown as Detector
  })().catch((error) => {
    detectorPromise = null
    throw error
  })
  return detectorPromise
}

/** Expands an 8-digit UPC-E code to its 12-digit UPC-A equivalent (the GTIN eBay stores). */
export function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null
  const [ns, d1, d2, d3, d4, d5, d6, check] = code.split('')
  let body: string
  if ('012'.includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`
  return normaliseBarcode(`${ns}${body}${check}`)
}

/** Turns a detector result into a GTIN eBay accepts, or null if it isn't a valid retail barcode. */
export function gtinFromDetection(barcode: DetectedBarcode): string | null {
  const value = barcode.rawValue.trim()
  // Some detectors (e.g. Apple Vision) already report UPC-E expanded to 12/13 digits.
  if (barcode.format === 'upc_e') return expandUpcE(value) ?? normaliseBarcode(value)
  return normaliseBarcode(value)
}
