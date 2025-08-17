// minimal smoke test so the suite always has a test
import * as route from './route'

test('POST handler exists (smoke)', () => {
  expect(typeof (route as any).POST).toBe('function')
})
