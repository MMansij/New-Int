// jest.setup.ts
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// ---------- Polyfills available in Node + jsdom ----------
;(globalThis as any).TextEncoder ||= TextEncoder
;(globalThis as any).TextDecoder ||= TextDecoder

// Exported mocks (used by some tests)
export const speechSynthesisSpeakMock = jest.fn()
export const speechSynthesisCancelMock = jest.fn()

// Detect environment
const isJsdom =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  !!(window as any).document?.createElement

if (isJsdom) {
  // -------- Browser-only (jsdom) mocks --------

  // matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // ResizeObserver
  class ResizeObserverMock {
    observe = jest.fn()
    unobserve = jest.fn()
    disconnect = jest.fn()
    takeRecords = jest.fn(() => [])
  }
  Object.defineProperty(window as any, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock as any,
  })

  // IntersectionObserver
  class IntersectionObserverMock {
    observe = jest.fn()
    unobserve = jest.fn()
    disconnect = jest.fn()
    takeRecords = jest.fn(() => [])
  }
  Object.defineProperty(window as any, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverMock as any,
  })

  // Web Speech API
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: speechSynthesisSpeakMock,
      cancel: speechSynthesisCancelMock,
      speaking: false,
      getVoices: jest.fn(() => []),
      pause: jest.fn(),
      resume: jest.fn(),
      onvoiceschanged: null,
    },
  })

  class SpeechSynthesisUtteranceMock {
    text: string
    constructor(text: string) { this.text = text }
    lang?: string
    rate?: number
    pitch?: number
    volume?: number
    voice?: any
    onend?: (e: unknown) => void
    onerror?: (e: unknown) => void
  }
  Object.defineProperty(window as any, 'SpeechSynthesisUtterance', {
    writable: true,
    value: SpeechSynthesisUtteranceMock as any,
  })

  // URL.createObjectURL / revokeObjectURL
  if (!(window.URL as any).createObjectURL) {
    ;(window.URL as any).createObjectURL = jest.fn(() => 'blob:jest-mock')
    ;(window.URL as any).revokeObjectURL = jest.fn()
  }

  // scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  })
} else {
  // -------- Node-only (server tests) polyfills --------

  // Minimal Blob polyfill (Node 18 has Blob, but keep fallback)
  ;(globalThis as any).Blob ||= class Blob {
    private _buf: Uint8Array
    type?: string
    constructor(bits?: any[], opts?: any) {
      const chunks = (bits || []).map((b) =>
        typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
      )
      const size = chunks.reduce((s, c) => s + c.length, 0)
      this._buf = new Uint8Array(size)
      let off = 0
      for (const c of chunks) { this._buf.set(c, off); off += c.length }
      this.type = opts?.type
    }
    async arrayBuffer() { return this._buf.buffer }
  }

  // File polyfill (Node <20)
  ;(globalThis as any).File ||= class File extends (globalThis as any).Blob {
    name: string; lastModified: number
    constructor(bits: any[], name: string, opts: any = {}) {
      super(bits, opts)
      this.name = name
      this.lastModified = opts.lastModified || Date.now()
    }
  }
}

// ---------- (Optional) Silence noisy Parallax warning in tests ----------
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Failed to create the resize observer in the ParallaxContoller')
  ) {
    return
  }
  originalWarn(...args)
}
