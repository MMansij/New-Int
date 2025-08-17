jest.mock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  AnalyzeDocumentCommand: jest.fn().mockImplementation((input) => ({ input })),
}))
import { TextractClient } from '@aws-sdk/client-textract'
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('textract', () => {
  beforeEach(() => setAwsEnv())

  test('extract function exists and calls client', async () => {
    const fakeSend = jest.fn().mockResolvedValue({ Blocks: [] })
    ;(TextractClient as unknown as jest.Mock).mockImplementation(() => ({ send: fakeSend }))

    const mod = await import('../textract')
    const extract =
      (mod as any).extractKeyValues ||
      (mod as any).extract ||
      (mod as any).default

    expect(extract).toBeTruthy()

    // Use a real File so arrayBuffer exists
    const file = new File([new Blob(['pdf-bytes'])], 'doc.pdf', { type: 'application/pdf' })
    const out = await (typeof extract === 'function' ? extract(file) : extract(file))
    expect(fakeSend).toHaveBeenCalled()
    expect(out).toBeDefined()
  })
})
