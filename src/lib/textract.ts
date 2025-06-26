import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} from '@aws-sdk/client-textract'
import { decryptKmsValue } from './kms'

export async function runTextract(s3Url: string): Promise<string> {
  const accessKeyId = await decryptKmsValue(process.env.ENCRYPTED_ACCESS_KEY_ID!)
  const secretAccessKey = await decryptKmsValue(process.env.ENCRYPTED_SECRET_ACCESS_KEY!)

  const textract = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  const [bucket, ...keyParts] = s3Url.replace('s3://', '').split('/')
  const key = keyParts.join('/')

  const start = await textract.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: { Bucket: bucket, Name: key },
      },
    })
  )

  const jobId = start.JobId
  if (!jobId) throw new Error('Textract job did not start')

  // Poll for result
  let blocks: string[] = []
  let status = ''
  do {
    const res = await textract.send(
      new GetDocumentTextDetectionCommand({ JobId: jobId })
    )
    status = res.JobStatus!
    if (status === 'SUCCEEDED') {
      blocks = res.Blocks?.filter(b => b.BlockType === 'LINE')
                     .map(b => b.Text || '') ?? []
    } else if (status === 'FAILED') {
      throw new Error('Textract job failed')
    }
    await new Promise(r => setTimeout(r, 2000))
  } while (status === 'IN_PROGRESS')

  return blocks.join('\n')
}
