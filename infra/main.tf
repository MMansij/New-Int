# KMS Key + Alias
resource "aws_kms_key" "intelliparse_kms" {
  description             = "KMS key for Intelliparse secret encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

# IAM User for Local Development
resource "aws_iam_user" "intelliparse_user" {
  name = "intelliparse-dev-user"
}

# IAM Policy for Bedrock, Textract, Polly, S3, and KMS
resource "aws_iam_policy" "intelliparse_policy" {
  name = "intelliparse-full-access"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:*",
          "textract:*",
          "polly:*",
          "bedrock:*",
          "kms:*",
          "logs:*"
        ],
        Resource = "*"
      }
    ]
  })
}

# Attach Policy to IAM User
resource "aws_iam_user_policy_attachment" "intelliparse_user_attach" {
  user       = aws_iam_user.intelliparse_user.name
  policy_arn = aws_iam_policy.intelliparse_policy.arn
}

# Access Keys
resource "aws_iam_access_key" "intelliparse_key" {
  user = aws_iam_user.intelliparse_user.name
}
