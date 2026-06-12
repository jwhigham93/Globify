# Supply Chain API — AWS CDK Infrastructure

Infrastructure as Code (IaC) for deploying the Supply Chain API to AWS using CDK (Go).

## Deployment Profiles

Three profiles target different cost/capability tradeoffs:

| | **Full** (`-c profile=full`) | **Lite** (`-c profile=lite`) | **Ultra-lite** (`-c profile=ultra-lite`) |
|---|---|---|---|
| **Compute** | EKS (2-6 pods, ALB) | App Runner (0.25 vCPU) | Lambda + Function URL |
| **Database** | RDS PostgreSQL 16 | RDS PostgreSQL 16 | External (Neon free tier) |
| **Network** | VPC + NAT Gateway | VPC + NAT instance | No VPC |
| **WAF** | ALB + CloudFront | CloudFront only | None (Lambda throttling) |
| **Web Hosting** | S3 + CloudFront | S3 + CloudFront | S3 + CloudFront |
| **Auth** | Cognito | Cognito | Cognito |
| **Budget Alert** | $250/mo | $50/mo | $10/mo |
| **Monthly Cost** | ~$196 | ~$25 | ~$1-3 |
| **Best For** | Production | Staging / demo | Side project / dev |

Default profile is **lite** (set in `cdk.json`). Override with:

```sh
cdk deploy --all -c profile=full        # production
cdk deploy --all -c profile=lite        # staging (default)
cdk deploy --all -c profile=ultra-lite  # side project
```

## Architecture

### Full Profile

```
┌─────────────────────────────────────────────────────────────┐
│                         VPC (2 AZs)                        │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────────────┐ │
│  │  Public Subnets   │         │    Private Subnets        │ │
│  │  ┌──────────────┐ │         │  ┌────────────────────┐  │ │
│  │  │ NAT Gateway  │ │         │  │  EKS Cluster       │  │ │
│  │  └──────────────┘ │         │  │  ┌──────────────┐  │  │ │
│  │  ┌──────────────┐ │         │  │  │ API Pods (2-6)│  │  │ │
│  │  │  ALB + WAF   │◄├─ inet ─►│  │  └──────────────┘  │  │ │
│  │  └──────────────┘ │         │  └────────────────────┘  │ │
│  │                    │         │  ┌────────────────────┐  │ │
│  │                    │         │  │  RDS PostgreSQL 16 │  │ │
│  │                    │         │  └────────────────────┘  │ │
│  └──────────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
  + S3/CloudFront (web) · ECR · Cognito · WAF · Secrets Manager
```

### Lite Profile

```
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

```
┌───────────────────────────────┐
│  Lambda (ARM64, 256 MB)       │
│  ┌─────────────────────────┐  │
│  │ Lambda Web Adapter      │  │
│  │ → Go HTTP server        │  │
│  └─────────────────────────┘  │
│  Function URL (HTTPS)         │
└───────────────────────────────┘
          │
          ▼ (internet)
  ┌───────────────────┐
  │  Neon Free Tier   │
  │  PostgreSQL 17    │
  │  (0.5 GB, ext.)   │
  └───────────────────┘

  + S3/CloudFront (web) · ECR · Cognito
```

## CDK Stacks

| Stack | Profiles | Resources | Key Outputs |
|-------|----------|-----------|-------------|
| **SupplyChainAuth** | All | Cognito User Pool (admin-only), App Client | Pool ID, Client ID |
| **SupplyChainContainer** | All | ECR repository, lifecycle policy | Repository URI |
| **SupplyChainNetwork** | Full, Lite | VPC, 2 AZ, subnets, NAT (gateway or instance) | VPC ID |
| **SupplyChainDatabase** | Full, Lite | RDS PostgreSQL 16, Secrets Manager | Endpoint, Secret ARN |
| **SupplyChainSecurity** | Full, Lite | WAF Web ACLs (REGIONAL + CLOUDFRONT) | ACL ARNs |
| **SupplyChainCluster** | Full | EKS, node group, ALB Controller, IRSA | Cluster endpoint |
| **SupplyChainAppRunner** | Lite | App Runner, VPC connector, auto-deploy | Service URL |
| **SupplyChainLambdaApi** | Ultra-lite | Lambda (container), Function URL | Function URL |
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

This deploys only: Auth, ECR, Lambda, S3/CloudFront, and Budget (no VPC, RDS, or WAF).

### 3. Build and push Lambda container image

The Lambda image uses `Dockerfile.lambda` which includes the AWS Lambda Web Adapter:

```sh
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

cd services/supply-chain-api
docker build -f Dockerfile.lambda -t supply-chain-api:lambda .
docker tag supply-chain-api:lambda ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:lambda
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/supply-chain-api:lambda
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

Point `API_BASE_URL` to the Lambda Function URL from CDK outputs.

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
