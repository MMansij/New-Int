// jest.setup.ts

import '@testing-library/jest-dom'

/**
 * matchMedia — used by various libs and CSS breakpoints
 */
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

/**
 * ResizeObserver — required by react-scroll-parallax and others
 */
class ResizeObserverMock {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}
;(window as any).ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

/**
 * IntersectionObserver — sometimes used by images/lazy components
 */
class IntersectionObserverMock {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
  takeRecords = jest.fn(() => [])
}
;(window as any).IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

/**
 * Web Speech API — mock both speechSynthesis and SpeechSynthesisUtterance
 * so components can call read/stop without JSDOM crashing.
 */
export const speechSynthesisSpeakMock = jest.fn()
export const speechSynthesisCancelMock = jest.fn()

Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: speechSynthesisSpeakMock,
    cancel: speechSynthesisCancelMock,
    speaking: false,
    // add any other methods if your code uses them
    getVoices: jest.fn(() => []),
    pause: jest.fn(),
    resume: jest.fn(),
    onvoiceschanged: null,
  },
})

class SpeechSynthesisUtteranceMock {
  text: string
  constructor(text: string) {
    this.text = text
  }
  // Properties/methods you might reference
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
  voice?: SpeechSynthesisVoice
  onend?: (e: unknown) => void
  onerror?: (e: unknown) => void
}
;(window as any).SpeechSynthesisUtterance =
  SpeechSynthesisUtteranceMock as unknown as typeof SpeechSynthesisUtterance

/**
 * URL.createObjectURL — useful when tests touch file inputs
 */
if (!(window.URL as any).createObjectURL) {
  ;(window.URL as any).createObjectURL = jest.fn(() => 'blob:jest-mock')
  ;(window.URL as any).revokeObjectURL = jest.fn()
}

/**
 * scrollTo — noop to prevent errors when components call it
 */
window.scrollTo = jest.fn()

/**
 * (Optional) Silence noisy Parallax warning in tests
 * Comment this block out if you prefer to see all warnings.
 */
const originalWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Failed to create the resize observer in the ParallaxContoller')
  ) {
    return // suppress this specific warning
  }
  // @ts-expect-error spread types are fine for console
  originalWarn(...args)
}
