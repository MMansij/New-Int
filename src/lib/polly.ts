import {
  PollyClient,
  SynthesizeSpeechCommand,
} from '@aws-sdk/client-polly'
import { decryptKmsValue } from './kms'

export async function generateSpeech(text: string): Promise<Blob> {
  const accessKeyId = await decryptKmsValue(process.env.ENCRYPTED_ACCESS_KEY_ID!)
  const secretAccessKey = await decryptKmsValue(process.env.ENCRYPTED_SECRET_ACCESS_KEY!)

  const polly = new PollyClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const command = new SynthesizeSpeechCommand({
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: 'Joanna',
  })

  const response = await polly.send(command)
  const audioStream = await response.AudioStream?.transformToByteArray()
  return new Blob([audioStream!], { type: 'audio/mp3' })
}
