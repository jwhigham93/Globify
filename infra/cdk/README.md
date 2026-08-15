# Supply Chain API — AWS CDK Infrastructure

Infrastructure as Code (IaC) for deploying the Supply Chain API to AWS using CDK (Go).

> Part of the [Globify](../../README.md) monorepo. For the reasoning behind
> each profile — why `ultra-lite` uses Lambda + DynamoDB + Neon instead of a
> scaled-down `full` — see [`ENGINEERING_NOTES.md`](../../ENGINEERING_NOTES.md).

## Deployment Profiles

Three profiles target different cost/capability tradeoffs:

| | **Full** (`-c profile=full`) | **Lite** (`-c profile=lite`) | **Ultra-lite** (`-c profile=ultra-lite`) |
|---|---|---|---|
| **Compute** | EKS (2-6 pods, ALB) | App Runner (0.25 vCPU) | Lambda + API Gateway HTTP API |
| **Database** | RDS PostgreSQL 16 | RDS PostgreSQL 16 | External (Neon free tier) |
| **Network** | VPC + NAT Gateway | VPC + NAT instance | No VPC |
| **WAF** | CloudFront only* | CloudFront only* | None (Lambda throttling) |
| **Web Hosting** | S3 + CloudFront | S3 + CloudFront | S3 + CloudFront |
| **Auth** | Cognito | Cognito | Cognito |
| **Budget Alert** | $250/mo | $50/mo | $10/mo |
| **Monthly Cost** | ~$196 | ~$25 | ~$1-3 |
| **Best For** | Production | Staging / demo | Side project / dev |

\* `SecurityStack` also provisions a REGIONAL Web ACL intended for the
ALB/App Runner path, but it isn't associated with either in the current
code — only the CloudFront ACL is actually attached. See
`ENGINEERING_NOTES.md` → "Known Limitations" for details.

Default profile is **ultra-lite** (set in `cdk.json`). Override with:

```sh
cdk deploy --all -c profile=full        # production
cdk deploy --all -c profile=lite        # staging
cdk deploy --all -c profile=ultra-lite  # side project (default)
```

## Architecture

### Full Profile

```text
┌─────────────────────────────────────────────────────────────┐
│                         VPC (2 AZs)                        │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Public Subnets   │         │    Private Subnets        │ │
│  │  ┌──────────────┐ │         │  ┌────────────────────┐  │ │
│  │  │ NAT Gateway  │ │         │  │  EKS Cluster       │  │ │
│  │  └──────────────┘ │         │  │  ┌──────────────┐  │  │ │
│  │  ┌──────────────┐ │         │  │  │ API Pods (2-6)│  │  │ │
│  │  │  ALB         │◄├─ inet ─►│  │  └──────────────┘  │  │ │
│  │  └──────────────┘ │         │  └────────────────────┘  │ │
│  │                    │         │  ┌────────────────────┐  │ │
│  │                    │         │  │  RDS PostgreSQL 16 │  │ │
│  │                    │         │  └────────────────────┘  │ │
│  └──────────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
  + S3/CloudFront (web + WAF) · ECR · Cognito · Secrets Manager
```

### Lite Profile

```text
┌─────────────────────────────────────────────────────────────┐
│                         VPC (2 AZs)                        │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Public Subnets   │         │    Private Subnets        │ │
│  │  ┌──────────────┐ │         │  ┌────────────────────┐  │ │
│  │  │ NAT Instance │ │         │  │  App Runner        │  │ │
│  │  │ (t4g.nano)   │ │         │  │  (0.25 vCPU/0.5GB) │  │ │
│  │  └──────────────┘ │         │  └────────────────────┘  │ │
│  │                    │         │  ┌────────────────────┐  │ │
│  │                    │         │  │  RDS PostgreSQL 16 │  │ │
│  │                    │         │  └────────────────────┘  │ │
│  └──────────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
  + S3/CloudFront (web + WAF) · ECR · Cognito · Secrets Manager
```

### Ultra-lite Profile

No VPC — Lambda has no persistent process, so it can't hold WebSocket
connections in memory the way the other two profiles do. Connection state
moves to DynamoDB instead; see `ENGINEERING_NOTES.md` for the full request
sequence.

```text
┌────────────────────────┐      ┌──────────────────────────┐
│  API Gateway HTTP API  │      │  API Gateway WebSocket API │
│  (REST, HTTPS)         │      │  ($connect/$disconnect/    │
│                        │      │   $default)                │
└───────────┬────────────┘      └─────────────┬─────────────┘
            │                                  │
            └────────────────┬─────────────────┘
                              ▼
              ┌─────────────────────────────┐
              │  Lambda (x86_64, 256 MB)    │
              │  Lambda Web Adapter          │
              │  → Go HTTP server            │
              └───────────────┬───────────────┘
                    │                    │
                    ▼                    ▼ (internet, TLS)
        ┌─────────────────────┐  ┌───────────────────┐
        │  DynamoDB            │  │  Neon Free Tier   │
        │  ws-connections      │  │  PostgreSQL 17    │
        │  (connectionId, TTL) │  │  (0.5 GB, ext.)   │
        └─────────────────────┘  └───────────────────┘
                    ▲
                    │ every 2 min
        ┌─────────────────────┐
        │  EventBridge         │
        │  (GPS simulator tick)│
        └─────────────────────┘

  + S3/CloudFront (web) · ECR · Cognito
```

- **DynamoDB** (`ws-connections` table) holds nothing but ephemeral
  `connectionId → expiresAt` rows — pay-per-request billing, TTL
  auto-expires stale connections. It exists only because Lambda can't keep
  connections in memory; it is not a database for app data.
- **Neon** is still the system of record — suppliers, routes, risk data,
  and one-time WebSocket auth tickets. See "Why Neon instead of RDS" and
  "Why DynamoDB too" in `ENGINEERING_NOTES.md` for the full reasoning.

## CDK Stacks

| Stack | Profiles | Resources | Key Outputs |
|-------|----------|-----------|-------------|
| **SupplyChainAuth** | All | Cognito User Pool (admin-only), App Client | Pool ID, Client ID |
| **SupplyChainContainer** | All | ECR repository, lifecycle policy | Repository URI |
| **SupplyChainNetwork** | Full, Lite | VPC, 2 AZ, subnets, NAT (gateway or instance) | VPC ID |
| **SupplyChainDatabase** | Full, Lite | RDS PostgreSQL 16, Secrets Manager | Endpoint, Secret ARN |
| **SupplyChainSecurity** | Full, Lite | WAF Web ACLs — CLOUDFRONT (attached), REGIONAL (provisioned, not yet associated) | ACL ARNs |
| **SupplyChainCluster** | Full | EKS, node group, ALB Controller, IRSA | Cluster endpoint |
| **SupplyChainAppRunner** | Lite | App Runner, VPC connector, auto-deploy | Service URL |
| **SupplyChainLambdaApi** | Ultra-lite | Lambda (zip asset), API Gateway HTTP API, API Gateway WebSocket API, DynamoDB (`ws-connections`), EventBridge rule (GPS sim, every 2 min) | HTTP API endpoint, WebSocket URL |
| **GlobifyWebHosting** | All | S3 bucket, CloudFront, OAI | CloudFront URL |
| **SupplyChainBudget** | All | Budget alarms (80%, 100%, forecast) | — |

## Prerequisites

| Tool | Version | Install | Profiles |
|------|---------|---------|----------|
| AWS CLI | v2 | [aws.amazon.com/cli](https://aws.amazon.com/cli/) | All |
| AWS CDK CLI | v2 | `npm install -g aws-cdk` | All |
| Go | 1.22+ | [go.dev/dl](https://go.dev/dl/) | All |
| Docker | 24+ | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) | All |
| kubectl | 1.29+ | [kubernetes.io/docs/tasks/tools](https://kubernetes.io/docs/tasks/tools/) | Full only |
| Helm | 3+ | [helm.sh/docs/intro/install](https://helm.sh/docs/intro/install/) | Full only |

You also need an AWS account with appropriate IAM permissions. For ultra-lite, you additionally need a [Neon](https://neon.tech) account (free tier).

### Before any local `cdk` command on the ultra-lite profile

`main.go` constructs every stack belonging to the selected profile on each
synth, whichever single stack you name on the command line. **Ultra-lite is the
default** (`cdk.json`), and it is the only profile that builds `LambdaApiStack`
— so with no `-c profile=…` flag, the requirements below always apply:

- **`dist/lambda.zip` must exist.** `LambdaApiStack` calls `Code_FromAsset` on a
  zip that only CI builds, so `cdk synth`, `cdk diff`, and even
  `cdk deploy SomeUnrelatedStack` panic with
  `Cannot find asset at services/supply-chain-api/dist/lambda.zip`.
- **`GPS_SIM_TOKEN` must be non-empty** — an empty token makes the simulator's
  check pass for any caller, so the stack refuses to synth without it.
- **Cognito context values are required** unless you pass
  `-c allowInsecureAuth=true`; empty values would deploy with auth disabled.

None of the three apply to `-c profile=full` or `-c profile=lite`, which build
`ClusterStack` / `AppRunnerStack` instead and never touch the Lambda asset.

```sh
# 1. Build the Lambda asset (from the repo root)
cd services/supply-chain-api
mkdir -p dist/pkg && cp -r migrations dist/pkg/
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -ldflags="-s -w" -o dist/pkg/bootstrap ./cmd/server
python3 -c "
import zipfile, os
with zipfile.ZipFile('dist/lambda.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write('dist/pkg/bootstrap', 'bootstrap')
    for root, _, files in os.walk('dist/pkg/migrations'):
        for f in files:
            p = os.path.join(root, f)
            zf.write(p, p.replace('dist/pkg/', '', 1))
"

# 2. Synth or deploy, with the required env var and context
cd ../../infra/cdk
# A throwaway token is fine for synth/diff. For a local *deploy*, use the same
# value as the GPS_SIM_TOKEN GitHub secret so CI doesn't flip it back next run.
export GPS_SIM_TOKEN="$(openssl rand -hex 32)"
npx aws-cdk@2.1129.0 synth \
  -c profile=ultra-lite \
  -c cognitoUserPoolId=us-east-1_FzLm2rd4F \
  -c cognitoClientId=8oqh7olvq83qc6miu6osnmfs6
```

Pin the CDK CLI to the version in `.github/workflows/deploy.yml` so your laptop
and CI synth identically. Routine deploys happen through that workflow on merge
to `main` — running `cdk deploy` by hand is for bootstrap and debugging only.

> **Security note:** The deployment commands below use `Read-Host` or variable interpolation to keep passwords and connection strings out of shell history. Never paste secrets directly as CLI arguments — they end up in `~\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` (PowerShell) or `~/.bash_history` (Bash) and are visible to any process inspecting running commands.

---

## Deployment — Full Profile

### 1. Bootstrap CDK (first time only)

```sh
cd infra/cdk
cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

### 2. Deploy all stacks

```sh
cdk deploy --all -c profile=full
```

### 3. Build and push Docker image

```sh
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

cd services/supply-chain-api
docker build -t supply-chain-api .
docker tag supply-chain-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:v1
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:v1
```

### 4. Configure kubectl & deploy Kubernetes resources

```sh
aws eks update-kubeconfig --name supply-chain --region us-east-1

cd services/supply-chain-api/k8s

kubectl apply -f namespace.yaml

# Retrieve password from Secrets Manager and create K8s secret in one step
# (avoids the password appearing as a CLI argument in shell history)
$rdsSecret = aws secretsmanager get-secret-value --secret-id <RdsSecretArn> `
  --query SecretString --output text | ConvertFrom-Json
$dbUrl = "postgres://supplychain:$($rdsSecret.password)@<RDS_ENDPOINT>:5432/supplychain?sslmode=require"
kubectl create secret generic supply-chain-db-secret `
  --namespace supply-chain `
  --from-literal=DATABASE_URL=$dbUrl
Remove-Variable rdsSecret, dbUrl

# Update configmap.yaml with Cognito values from CDK outputs, then:
kubectl apply -f configmap.yaml
kubectl apply -f migration-job.yaml
kubectl wait --for=condition=complete --timeout=120s job/supply-chain-migrate -n supply-chain
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Verify
kubectl get pods -n supply-chain
kubectl get ingress -n supply-chain  # ALB URL in ADDRESS column
```

### 5. Deploy web app & configure Globify

```sh
npx nx build Globify --platform web
aws s3 sync apps/Globify/dist s3://globify-web-app --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths '/*'
```

Update `apps/Globify/app.json` with CDK outputs before building:
```json
{
  "expo": {
    "extra": {
      "API_BASE_URL": "http://<ALB_URL>",
      "COGNITO_USER_POOL_ID": "<from CDK output>",
      "COGNITO_CLIENT_ID": "<from CDK output>",
      "COGNITO_REGION": "us-east-1"
    }
  }
}
```

---

## Deployment — Lite Profile

### 1. Bootstrap & deploy

```sh
cd infra/cdk
cdk bootstrap aws://ACCOUNT_ID/us-east-1   # first time only
cdk deploy --all -c profile=lite            # or just: cdk deploy --all (lite is default)
```

### 2. Build and push Docker image

```sh
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

cd services/supply-chain-api
docker build -t supply-chain-api .
docker tag supply-chain-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:latest
```

App Runner auto-deploys when a new `:latest` tag is pushed.

### 3. Configure environment variables

After the first deploy, set the DATABASE_URL and Cognito variables:

```powershell
# Retrieve RDS password from Secrets Manager
$rdsSecret = aws secretsmanager get-secret-value --secret-id <RdsSecretArn> `
  --query SecretString --output text | ConvertFrom-Json
$dbUrl = "postgres://supplychain:$($rdsSecret.password)@<RDS_ENDPOINT>:5432/supplychain?sslmode=require"

# Build the config JSON with the secret interpolated (not pasted as a literal)
$config = @"
{
  "ImageRepository": {
    "ImageConfiguration": {
      "RuntimeEnvironmentVariables": {
        "DATABASE_URL": "$dbUrl",
        "COGNITO_USER_POOL_ID": "<from CDK output>",
        "COGNITO_CLIENT_ID": "<from CDK output>"
      }
    }
  }
}
"@

aws apprunner update-service --service-arn <SERVICE_ARN> `
  --source-configuration $config

Remove-Variable rdsSecret, dbUrl, config
```

### 4. Run migrations

SSH into the App Runner service's VPC-connected environment isn't straightforward, so run migrations via a one-off ECS task or a local connection through a bastion:

```sh
# Option: run migrate from local machine through an EC2 bastion or SSM tunnel
# The RDS endpoint is accessible from within the VPC only
```

### 5. Deploy web app

Same as Full Profile step 5 above.

---

## Deployment — Ultra-lite Profile

### 1. Set up Neon database (one-time)

1. Sign up at [neon.tech](https://neon.tech) (free tier: 0.5 GB storage, auto-suspend)
2. Create a project with **PostgreSQL 17** → copy the **pooled** connection string (port 6543)
3. Run migrations locally against the Neon endpoint:

```powershell
cd services/supply-chain-api
# Install golang-migrate if needed:
# go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Prompt for the connection string so it never appears in shell history
$env:DATABASE_URL = Read-Host -Prompt "Neon connection string"
migrate -path migrations -database $env:DATABASE_URL up
Remove-Item Env:DATABASE_URL
```

### 2. Bootstrap & deploy

```sh
cd infra/cdk
cdk bootstrap aws://ACCOUNT_ID/us-east-1   # first time only
cdk deploy --all -c profile=ultra-lite
```

This deploys: Auth, ECR, Lambda + API Gateway (HTTP + WebSocket) + DynamoDB,
S3/CloudFront, and Budget (no VPC, RDS, or WAF). The DynamoDB table and both
API Gateway APIs are created and wired automatically — no manual setup step
below is needed for them.

### 3. Build the Lambda deployment package

`LambdaApiStack` deploys from a zip asset (`Code_FromAsset`), not a
container image — `Dockerfile.lambda` exists in the repo but isn't part of
this deploy path. Build the zip the same way CI does (see "Before any
local `cdk` command on the ultra-lite profile" above for the full
commands):

```sh
cd services/supply-chain-api
mkdir -p dist/pkg && cp -r migrations dist/pkg/
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -ldflags="-s -w" -o dist/pkg/bootstrap ./cmd/server
# then zip dist/pkg/{bootstrap,migrations} into dist/lambda.zip — see the
# python3 snippet earlier in this file, or .github/workflows/deploy.yml
```

### 4. Store database secret in SSM Parameter Store

The Neon connection string is stored as a SecureString in AWS SSM Parameter Store — **not** in Lambda environment variables. This keeps your database password encrypted and out of plaintext configs.

```powershell
# Prompt for the connection string so it never appears in shell history
$dbUrl = Read-Host -Prompt "Neon connection string"
aws ssm put-parameter `
  --name /supply-chain/DATABASE_URL `
  --value $dbUrl `
  --type SecureString `
  --overwrite
Remove-Variable dbUrl
```

The Lambda function reads this parameter at cold start via the `SSM_DATABASE_URL` env var (set automatically by CDK).

### 5. Configure Lambda Cognito environment

Set the non-secret Cognito variables (these are public identifiers, safe in env vars):

```sh
aws lambda update-function-configuration \
  --function-name supply-chain-api \
  --environment 'Variables={
    COGNITO_USER_POOL_ID=<from CDK output>,
    COGNITO_CLIENT_ID=<from CDK output>,
    COGNITO_REGION=us-east-1,
    ALLOWED_ORIGINS=*,
    AWS_LWA_PORT=8080,
    PORT=8080,
    LOG_FORMAT=json,
    SSM_DATABASE_URL=/supply-chain/DATABASE_URL
  }'
```

### 6. Deploy web app

Same as Full Profile step 5 (S3 sync + CloudFront invalidation).

### 7. Update Globify config

Point `EXPO_PUBLIC_API_BASE_URL` to the `ApiGatewayUrl` CDK output, and
`EXPO_PUBLIC_WS_URL` to the `WebSocketUrl` CDK output (or set the
equivalent `expo.extra.API_BASE_URL` in `app.json` — see the root
`README.md` "Run Modes" section for both forms).

---

## Cost Comparison

### Full Profile (~$196/mo)

| Resource | Monthly Cost |
|----------|-------------|
| EKS Control Plane | $73 |
| EC2 t3.medium × 2 | $60 |
| NAT Gateway | $33 + data |
| ALB | $16 + data |
| RDS db.t4g.micro | $12 |
| WAF (2 ACLs) | ~$10 |
| ECR, S3, CloudFront | ~$2 |
| Cognito | Free tier |
| **Total** | **~$196/month** |

### Lite Profile (~$25/mo)

| Resource | Monthly Cost |
|----------|-------------|
| RDS db.t4g.micro | $12 |
| App Runner (0.25 vCPU) | $5-15 |
| NAT Instance (t4g.nano) | $3 |
| WAF (1 ACL, CloudFront) | ~$5 |
| ECR, S3, CloudFront | ~$2 |
| Cognito | Free tier |
| **Total** | **~$25/month** |

### Ultra-lite Profile (~$1-3/mo)

| Resource | Monthly Cost |
|----------|-------------|
| Lambda | $0 (free tier: 1M req, 400K GB-s) |
| API Gateway (HTTP + WebSocket) | ~$0-1 (free tier: 1M HTTP calls; WS billed per message + connection-minute) |
| DynamoDB (`ws-connections`, on-demand) | ~$0 in practice (AWS's DynamoDB free tier only covers *provisioned* capacity; this table is on-demand, but at hobby-project connection volumes the request-unit cost is a few cents/month at most) |
| Neon PostgreSQL | $0 (free tier: 0.5 GB) |
| S3 + CloudFront | ~$1 |
| ECR | < $1 |
| Cognito | Free tier |
| **Total** | **~$1-3/month** |

> **Note:** Ultra-lite relies on free tier limits. If traffic exceeds 1M Lambda invocations/month or 0.5 GB Neon storage, costs will increase. Neon paid plans start at $19/mo if needed.

## Context Parameters

```sh
cdk deploy --all -c profile=ultra-lite -c instanceClass=db.t4g.small -c env=prod
```

| Context Key | Default | Description |
|-------------|---------|-------------|
| `profile` | `lite` | Deployment profile: `full`, `lite`, or `ultra-lite` |
| `instanceClass` | `db.t4g.micro` | RDS instance class (full & lite only) |
| `env` | `dev` | Environment label |

## Teardown

### Full Profile

```sh
# Remove K8s resources first (ALB won't be cleaned up by CDK)
kubectl delete -f services/supply-chain-api/k8s/ -n supply-chain
kubectl delete namespace supply-chain

cdk destroy --all -c profile=full
```

### Lite Profile

```sh
cdk destroy --all -c profile=lite
```

### Ultra-lite Profile

```sh
cdk destroy --all -c profile=ultra-lite
# Optionally delete the Neon project at neon.tech
```
