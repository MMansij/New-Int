import { setAwsEnv } from '../../test/setupAwsEnv'

describe('awsClientOptions', () => {
  beforeEach(() => setAwsEnv())

  test('returns region from env or default', async () => {
    const mod = await import('../awsClientOptions')
    const getter =
      (mod as any).getAwsClientOptions ||
      (mod as any).awsClientOptions ||
      (mod as any).default

    expect(getter).toBeTruthy()
    const opts = typeof getter === 'function' ? getter() : getter
    expect(opts).toBeDefined()
    expect((opts.region ?? opts?.config?.region)).toBe('us-east-1')
  })
})
