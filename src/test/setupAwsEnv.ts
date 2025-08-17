// setupAwsEnv.ts
export function setAwsEnv() {
process.env.AWS_ACCESS_KEY_ID = 'FAKE_AWS_KEY'
process.env.AWS_SECRET_ACCESS_KEY = 'FAKE_AWS_SECRET'
process.env.AWS_REGION = 'us-east-1'
process.env.BEDROCK_MODEL_ID = 'fake-model'
process.env.UPLOAD_BUCKET = 'fake-bucket'
}