import {
  KMSClient,
  DecryptCommand,
} from '@aws-sdk/client-kms'
import { fromIni } from '@aws-sdk/credential-providers'

const kms = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: fromIni({ profile: process.env.AWS_PROFILE || 'intelliparse-dev-user' }),
})

export async function decryptKmsValue(base64Encrypted: string): Promise<string> {
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(base64Encrypted, 'base64'),
  })

  const response = await kms.send(command)

  if (!response.Plaintext) {
    throw new Error('Decryption failed — no plaintext returned.')
  }

  return Buffer.from(response.Plaintext).toString('utf-8')
}
