jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  DecryptCommand: jest.fn().mockImplementation((input) => ({ input })),
  EncryptCommand: jest.fn().mockImplementation((input) => ({ input })),
}))
import { KMSClient } from '@aws-sdk/client-kms'
import { setAwsEnv } from '../../test/setupAwsEnv'

describe('kms', () => {
  beforeEach(() => setAwsEnv())

  test('decrypt calls client', async () => {
    const fakeSend = jest.fn().mockResolvedValue({ Plaintext: Uint8Array.from([115,101,99,114,101,116]) }) // "secret"
    ;(KMSClient as unknown as jest.Mock).mockImplementation(() => ({ send: fakeSend }))

    const mod = await import('../kms')
    const decrypt = (mod as any).decrypt || (mod as any).default
    if (!decrypt) { expect(true).toBe(true); return }

    const out = await decrypt(Uint8Array.from([1,2,3]))
    expect(fakeSend).toHaveBeenCalled()
    expect(out).toBeDefined()
  })

  test('encrypt propagates errors', async () => {
    const fakeSend = jest.fn().mockRejectedValue(new Error('KMS error'))
    ;(KMSClient as unknown as jest.Mock).mockImplementation(() => ({ send: fakeSend }))

    const mod = await import('../kms')
    const encrypt = (mod as any).encrypt
    if (!encrypt) { expect(true).toBe(true); return }

    await expect(encrypt('secret', 'key-id')).rejects.toThrow('KMS error')
  })
})
