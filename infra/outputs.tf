output "access_key_id" {
  value = aws_iam_access_key.intelliparse_key.id
}

output "secret_access_key" {
  value     = aws_iam_access_key.intelliparse_key.secret
  sensitive = true
}

output "kms_key_id" {
  value = aws_kms_key.intelliparse_kms.key_id
}

output "iam_user_name" {
  value = aws_iam_user.intelliparse_user.name
}
