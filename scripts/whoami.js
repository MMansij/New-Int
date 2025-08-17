// scripts/whoami.js
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const { fromIni } = require('@aws-sdk/credential-providers');

(async () => {
  try {
    const c = new STSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromIni({ profile: process.env.AWS_PROFILE || 'intelliparse-dev-user' }),
    });
    const r = await c.send(new GetCallerIdentityCommand({}));
    console.log('OK:', r.Arn);
  } catch (e) { console.error('FAIL:', e); }
})();
