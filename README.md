# 🛡️ Portfolio Infrastructure — Full Stack AWS Project

![AWS](https://img.shields.io/badge/AWS-VPC_%7C_RDS_%7C_EC2_%7C_ALB_%7C_ASG-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-1.28-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-Amazon_Linux_2023-FCC624?style=for-the-badge&logo=linux&logoColor=black)
![AutoScaling](https://img.shields.io/badge/Auto_Scaling-ALB_%7C_ASG_%7C_LT-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white)

> **A production-grade full stack portfolio platform built on AWS — custom VPC networking, private RDS PostgreSQL, Node.js REST API, Nginx reverse proxy, Application Load Balancer, Auto Scaling Group, Launch Template, IAM roles, and Secrets Manager — all manually provisioned and managed via Linux CLI.**

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Infrastructure Components](#infrastructure-components)
- [Network Architecture](#network-architecture)
- [Load Balancer & Auto Scaling](#load-balancer--auto-scaling)
- [IAM Roles & Security](#iam-roles--security)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Linux Commands Used](#linux-commands-used)
- [Setup Guide](#setup-guide)
- [Compliance Mapping](#compliance-mapping)
- [Cost Breakdown](#cost-breakdown)
- [Lessons Learned](#lessons-learned)

---

## 🏗️ Architecture Overview

```
Internet
    │
    │ https://desbain.com (Route 53 → ALB DNS)
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  Application Load Balancer (portfolio-alb)                        │
│  Internet-facing — HTTP:80 / HTTPS:443                           │
│  Security Group: alb-sg (0.0.0.0/0:80,443)                      │
└────────────────────────┬─────────────────────────────────────────┘
                         │ Forwards to portfolio-tg
                         │ Health check: GET /health → 200
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Auto Scaling Group (portfolio-asg)                               │
│  Min: 1  |  Desired: 2  |  Max: 4                                │
│  Launch Template: portfolio-lt (Amazon Linux 2023, t2.micro)     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              portfolio-vpc (10.0.0.0/16)                 │    │
│  │                                                          │    │
│  │  ┌──────────────────────┐  ┌──────────────────────┐    │    │
│  │  │  Public Subnet 2a    │  │  Public Subnet 2b    │    │    │
│  │  │  10.0.1.0/24         │  │  10.0.2.0/24         │    │    │
│  │  │                      │  │                      │    │    │
│  │  │  ┌────────────────┐  │  │  ┌────────────────┐  │    │    │
│  │  │  │ EC2 (ASG)      │  │  │  │ EC2 (ASG)      │  │    │    │
│  │  │  │ t2.micro       │  │  │  │ t2.micro       │  │    │    │
│  │  │  │ Nginx (80)     │  │  │  │ Nginx (80)     │  │    │    │
│  │  │  │ Node.js (3000) │  │  │  │ Node.js (3000) │  │    │    │
│  │  │  └────────────────┘  │  │  └────────────────┘  │    │    │
│  │  │  NAT Gateway         │  │                      │    │    │
│  │  └──────────────────────┘  └──────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              Private Subnets                     │   │    │
│  │  │  portfolio-private-1 (10.0.3.0/24) us-east-2a   │   │    │
│  │  │  portfolio-private-2 (10.0.4.0/24) us-east-2b   │   │    │
│  │  │                                                  │   │    │
│  │  │  ┌────────────────────────────────────────┐     │   │    │
│  │  │  │  RDS PostgreSQL 16 (portfolio-db)       │     │   │    │
│  │  │  │  db.t3.micro — us-east-2a              │     │   │    │
│  │  │  │  SSL TLSv1.3 — Port 5432               │     │   │    │
│  │  │  └────────────────────────────────────────┘     │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

AWS Services:
  Route 53        → desbain.com → ALB DNS name
  ACM Certificate → HTTPS for desbain.com
  Secrets Manager → portfolio/db/credentials
  Internet Gateway → portfolio-igw
  NAT Gateway      → portfolio-nat
  Route Tables    → public (IGW) + private (NAT)
```

---

## 🔧 Infrastructure Components

### VPC & Networking

| Resource | Name | Value |
|----------|------|-------|
| VPC | portfolio-vpc | 10.0.0.0/16 |
| Public Subnet 1 | portfolio-public-1 | 10.0.1.0/24 — us-east-2a |
| Public Subnet 2 | portfolio-public-2 | 10.0.2.0/24 — us-east-2b |
| Private Subnet 1 | portfolio-private-1 | 10.0.3.0/24 — us-east-2a |
| Private Subnet 2 | portfolio-private-2 | 10.0.4.0/24 — us-east-2b |
| Internet Gateway | portfolio-igw | Attached to VPC |
| NAT Gateway | portfolio-nat | In public-1, Elastic IP |
| Public Route Table | portfolio-public-rt | 0.0.0.0/0 → IGW |
| Private Route Table | portfolio-private-rt | 0.0.0.0/0 → NAT |

### Compute

| Resource | Name | Value |
|----------|------|-------|
| EC2 Instance | portfolio-bastion | t2.micro, Amazon Linux 2023 |
| Availability Zone | — | us-east-2a |
| Public IP | — | 3.15.192.72 |
| Private IP | — | 10.0.1.129 |
| Key Pair | portfolio-key | RSA .pem |
| IAM Role | portfolio-bastion-role | SSM + CloudWatch + Secrets |

### Database

| Resource | Name | Value |
|----------|------|-------|
| RDS Engine | PostgreSQL 16 | portfolio-db |
| Instance Class | db.t3.micro | 1 vCPU, 1GB RAM |
| Storage | 20GB gp2 | — |
| Availability Zone | us-east-2a | — |
| Subnet Group | portfolio-db-subnet-group | Private subnets |
| Security Group | rds-sg | Port 5432 from bastion-sg only |
| Public Access | No | Private subnet only |
| SSL | TLSv1.3 | Auto-configured by AWS |
| Monitoring Role | portfolio-rds-monitoring-role | Enhanced monitoring |

### Security

| Resource | Name | Rules |
|----------|------|-------|
| bastion-sg | EC2 Security Group | SSH:22 from My IP, HTTP:80 from My IP |
| rds-sg | RDS Security Group | PostgreSQL:5432 from bastion-sg only |
| Secrets Manager | portfolio/db/credentials | DB username + password |

---

## 🌐 Network Architecture

### Traffic Flow — Web Request

```
User Browser
    │ HTTP GET http://3.15.192.72
    ▼
Internet Gateway (portfolio-igw)
    │
    ▼
EC2 Bastion — Public Subnet 10.0.1.129
    │
    ▼
Nginx (port 80) — Reverse Proxy
    │
    ├── / → serves /usr/share/nginx/html/index.html
    └── /api/* → proxy_pass http://localhost:3000
                        │
                        ▼
                Node.js API (port 3000)
                        │
                        ▼
                RDS PostgreSQL (10.0.3.64:5432)
                Private Subnet — no internet access
```

### Traffic Flow — Private Outbound

```
RDS PostgreSQL needs to reach AWS APIs
    │
    ▼
Private Route Table → NAT Gateway
    │
    ▼
NAT Gateway (public subnet) → Internet Gateway
    │
    ▼
AWS API endpoints (one-way outbound only)
```

### Security Group Chain

```
Internet → bastion-sg (port 22, 80) → EC2
EC2 (bastion-sg) → rds-sg (port 5432) → RDS
RDS cannot be accessed from internet directly ✅
```

---

## ⚖️ Load Balancer & Auto Scaling

### Application Load Balancer (ALB)

| Resource | Name | Value |
|----------|------|-------|
| Load Balancer | portfolio-alb | Internet-facing |
| Security Group | alb-sg | HTTP:80, HTTPS:443 from 0.0.0.0/0 |
| Subnets | — | portfolio-public-1, portfolio-public-2 |
| Listener | HTTP:80 | Forward to portfolio-tg |
| Listener | HTTPS:443 | Forward to portfolio-tg (ACM cert) |

**Why ALB:**
```
Single EC2 = single point of failure
ALB + ASG:
  ├── Distributes traffic across multiple EC2s
  ├── Health checks — removes unhealthy instances
  ├── SSL termination — HTTPS handled at ALB level
  └── Scales automatically with demand
```

### Target Group

| Resource | Name | Value |
|----------|------|-------|
| Target Group | portfolio-tg | HTTP:80 |
| Health Check | — | GET /health → 200 |
| Healthy threshold | — | 2 checks |
| Unhealthy threshold | — | 3 checks |
| Interval | — | 30 seconds |

### Launch Template

| Resource | Name | Value |
|----------|------|-------|
| Launch Template | portfolio-lt | Version 1 |
| AMI | — | Amazon Linux 2023 |
| Instance Type | — | t2.micro |
| Key Pair | — | portfolio-key |
| Security Group | — | bastion-sg |
| IAM Role | — | portfolio-bastion-role |
| User Data | — | Auto-installs Node.js, Nginx, API |

**What the User Data script does:**
```bash
# Runs automatically on every new EC2 launch
1. dnf update -y
2. dnf install -y nodejs20 nginx
3. Creates /home/ec2-user/portfolio-api/server.js
4. Creates /home/ec2-user/portfolio-api/.env
5. Creates /etc/systemd/system/portfolio-api.service
6. Creates /etc/nginx/conf.d/portfolio.conf
7. systemctl enable --now portfolio-api
8. systemctl enable --now nginx
```

This means every new EC2 launched by ASG is fully configured automatically — no manual setup needed.

### Auto Scaling Group

| Resource | Name | Value |
|----------|------|-------|
| ASG | portfolio-asg | — |
| Launch Template | — | portfolio-lt |
| Min capacity | — | 1 |
| Desired capacity | — | 2 |
| Max capacity | — | 4 |
| Subnets | — | portfolio-public-1, portfolio-public-2 |
| Target Group | — | portfolio-tg |
| Health check type | — | ELB |
| Health check grace | — | 300 seconds |

**Scaling Policies:**
```
Scale OUT (add instances):
  CPU > 70% for 2 minutes → add 1 instance

Scale IN (remove instances):
  CPU < 30% for 5 minutes → remove 1 instance

Always keep minimum 1 instance running
Never exceed 4 instances
```

### Security Group Chain (Updated)

```
Internet
    │ HTTP:80, HTTPS:443
    ▼
alb-sg (Application Load Balancer)
    │ HTTP:80 to bastion-sg only
    ▼
bastion-sg (EC2 instances)
    │ PostgreSQL:5432 to rds-sg only
    ▼
rds-sg (RDS PostgreSQL)
    │ No outbound internet access
    ▼
Private Subnet ✅
```


---

## 🔐 IAM Roles & Security

### Role 1 — portfolio-bastion-role (EC2)

```
Attached to: EC2 bastion host
Policies:
  ✅ AmazonSSMManagedInstanceCore    → SSM Session Manager access
  ✅ CloudWatchAgentServerPolicy     → Send logs to CloudWatch
  ✅ portfolio-bastion-inline-policy → Custom inline:
      - secretsmanager:GetSecretValue (portfolio/*)
      - secretsmanager:DescribeSecret
      - rds-db:connect
```

### Role 2 — portfolio-rds-monitoring-role (RDS)

```
Attached to: RDS PostgreSQL instance
Policies:
  ✅ AmazonRDSEnhancedMonitoring → Send metrics to CloudWatch
```

### Role 3 — portfolio-app-role (Node.js)

```
Attached to: Future app servers / EKS pods
Policies:
  ✅ CloudWatchAgentServerPolicy → Send app logs
  ✅ portfolio-app-role (inline):
      - secretsmanager:GetSecretValue (portfolio/*)
      - rds-db:connect (portfolio_app user)
      - logs:CreateLogGroup/Stream/PutLogEvents
```

### Secrets Manager

```
Secret name: portfolio/db/credentials
ARN: arn:aws:secretsmanager:us-east-2:905418310734:secret:portfolio/db/credentials-mCuh4v
Encryption: aws/secretsmanager (AWS managed key)
Contains:
  - username: postgres
  - password: [encrypted]
  - host: portfolio-db.cpgwyuumi62n.us-east-2.rds.amazonaws.com
  - port: 5432
  - dbname: portfolio
```

---

## 🗄️ Database Schema

### Table 1 — visitors

```sql
CREATE TABLE visitors (
    id         SERIAL PRIMARY KEY,
    ip_address VARCHAR(45),
    user_agent TEXT,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    country    VARCHAR(100)
);
```

**Purpose:** Records every page visit automatically when someone loads the portfolio.
The visitor count is displayed live on the homepage.

### Table 2 — contacts

```sql
CREATE TABLE contacts (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) NOT NULL,
    message      TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read      BOOLEAN DEFAULT FALSE
);
```

**Purpose:** Stores messages submitted through the contact form.
`is_read` tracks which messages have been reviewed.

### Table 3 — projects

```sql
CREATE TABLE projects (
    id          SERIAL PRIMARY KEY,
    project_num VARCHAR(10),
    title       VARCHAR(200),
    description TEXT,
    status      VARCHAR(50),
    tech_stack  TEXT[],
    github_url  VARCHAR(300),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose:** Stores all 6 portfolio projects with live status.
The webpage fetches this data dynamically from the API.

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Database Operation |
|--------|----------|-------------|-------------------|
| GET | `/health` | Health check | None |
| GET | `/api/projects` | Get all projects | SELECT * FROM projects |
| GET | `/api/visitors/count` | Get visitor count | SELECT COUNT(*) FROM visitors |
| POST | `/api/visitors` | Record new visit | INSERT INTO visitors |
| POST | `/api/contact` | Submit contact form | INSERT INTO contacts |
| GET | `/api/contacts` | Get all contacts | SELECT * FROM contacts |

### Example Responses

```json
GET /health
{"status": "healthy", "timestamp": "2026-04-28T07:52:57.761Z"}

GET /api/visitors/count
{"count": 4}

POST /api/contact
{"success": true, "message": "Message received!"}
```

---

## 🐧 Linux Commands Used

### SSH & Remote Access

```bash
# Connect to EC2 bastion
ssh -i ~/Downloads/portfolio-key.pem \
  -o "StrictHostKeyChecking=no" \
  ec2-user@3.15.192.72

# Secure key file permissions
chmod 400 ~/Downloads/portfolio-key.pem

# Copy files to EC2
scp -i ~/Downloads/portfolio-key.pem \
  ~/Downloads/index.html \
  ec2-user@3.15.192.72:/home/ec2-user/
```

### System Information

```bash
uname -a                          # OS and kernel version
cat /etc/os-release               # OS details
free -h                           # RAM usage
df -h                             # Disk usage
nproc                             # CPU count
lscpu | grep -E "CPU|Thread|Core" # CPU details
uptime                            # System uptime and load
```

### Package Management

```bash
sudo dnf update -y                # Update all packages
sudo dnf install -y postgresql15  # Install PostgreSQL client
sudo dnf install -y nodejs20      # Install Node.js 20
sudo dnf install -y nginx         # Install Nginx
sudo dnf install -y jq            # Install JSON formatter
```

### systemctl — Service Management

```bash
# Portfolio API service
sudo systemctl daemon-reload           # Reload systemd config
sudo systemctl enable portfolio-api    # Start on boot
sudo systemctl start portfolio-api     # Start now
sudo systemctl restart portfolio-api   # Restart
sudo systemctl status portfolio-api    # Check status

# Nginx service
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl reload nginx            # Reload config without downtime
sudo systemctl status nginx
```

### Logging & Monitoring

```bash
# View live logs
sudo journalctl -u portfolio-api -f
sudo journalctl -u nginx -f

# View last N lines
sudo journalctl -u portfolio-api -n 20 --no-pager

# Check open ports
ss -tulpn | grep 3000
ss -tulpn | grep 80

# Check processes
ps aux | grep node
ps aux | grep nginx

# Check network
ip addr show
ip route show

# Security — who logged in
last -n 10
who
w
```

### PostgreSQL (psql)

```bash
# Connect to RDS
psql \
  -h portfolio-db.cpgwyuumi62n.us-east-2.rds.amazonaws.com \
  -U postgres \
  -d portfolio \
  -p 5432

# Inside psql
\l              # List databases
\c portfolio    # Connect to database
\dt             # List tables
\d visitors     # Describe table
\q              # Quit

# Run query directly
psql -h <endpoint> -U postgres -d portfolio \
  -c "SELECT COUNT(*) FROM visitors;"
```

### File Operations

```bash
# View files
ls -la /usr/share/nginx/html/
cat /etc/nginx/conf.d/portfolio.conf

# Edit files
sudo nano /etc/nginx/conf.d/portfolio.conf
sudo nano /etc/systemd/system/portfolio-api.service

# Copy files
sudo cp /home/ec2-user/index.html /usr/share/nginx/html/index.html

# Test Nginx config
sudo nginx -t
```

---

## 🚀 Setup Guide

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI | 2.x | AWS resource management |
| SSH client | Any | Connect to EC2 |
| psql | 15.x | Database testing |

### Step-by-Step Build

#### 1. Create VPC
```
AWS Console → VPC → Create VPC
  Name: portfolio-vpc
  CIDR: 10.0.0.0/16
```

#### 2. Create Subnets
```
4 subnets:
  portfolio-public-1  → 10.0.1.0/24 → us-east-2a
  portfolio-public-2  → 10.0.2.0/24 → us-east-2b
  portfolio-private-1 → 10.0.3.0/24 → us-east-2a
  portfolio-private-2 → 10.0.4.0/24 → us-east-2b

Enable auto-assign public IP on public subnets
```

#### 3. Create Internet Gateway
```
Name: portfolio-igw
Attach to: portfolio-vpc
```

#### 4. Create NAT Gateway
```
Name: portfolio-nat
Subnet: portfolio-public-1
Connectivity: Public
EIP: Allocate new
```

#### 5. Create Route Tables
```
Public RT (portfolio-public-rt):
  Route: 0.0.0.0/0 → portfolio-igw
  Associate: portfolio-public-1, portfolio-public-2

Private RT (portfolio-private-rt):
  Route: 0.0.0.0/0 → portfolio-nat
  Associate: portfolio-private-1, portfolio-private-2
```

#### 6. Create IAM Roles
```
portfolio-bastion-role:
  Trust: EC2
  Policies: AmazonSSMManagedInstanceCore,
            CloudWatchAgentServerPolicy,
            portfolio-bastion-inline-policy

portfolio-rds-monitoring-role:
  Trust: RDS Enhanced Monitoring
  Policies: AmazonRDSEnhancedMonitoring

portfolio-app-role:
  Trust: EC2
  Policies: CloudWatchAgentServerPolicy,
            portfolio-app-inline-policy
```

#### 7. Create Secrets Manager Secret
```
Name: portfolio/db/credentials
Type: RDS credentials
Database: portfolio-db
```

#### 8. Create DB Subnet Group
```
Name: portfolio-db-subnet-group
VPC: portfolio-vpc
Subnets: portfolio-private-1, portfolio-private-2
```

#### 9. Create Security Groups
```
bastion-sg:
  Inbound: SSH:22 from My IP
           HTTP:80 from My IP

rds-sg:
  Inbound: PostgreSQL:5432 from bastion-sg
```

#### 10. Create RDS PostgreSQL
```
Engine: PostgreSQL 16
Instance: db.t3.micro
VPC: portfolio-vpc
Subnet Group: portfolio-db-subnet-group
Security Group: rds-sg
Public Access: No
AZ: us-east-2a
Monitoring Role: portfolio-rds-monitoring-role
```

#### 11. Create EC2 Bastion
```
Name: portfolio-bastion
AMI: Amazon Linux 2023
Type: t2.micro
Key Pair: portfolio-key (download .pem)
VPC: portfolio-vpc
Subnet: portfolio-public-1
Public IP: Enable
Security Group: bastion-sg
IAM Role: portfolio-bastion-role
```

#### 12. Configure EC2
```bash
# SSH in
ssh -i portfolio-key.pem ec2-user@<public-ip>

# Install packages
sudo dnf install -y postgresql15 nodejs20 nginx jq

# Create API
mkdir /home/ec2-user/portfolio-api
cd /home/ec2-user/portfolio-api
npm init -y
npm install express pg cors dotenv

# Create server.js and .env
# Create systemd service
sudo nano /etc/systemd/system/portfolio-api.service
sudo systemctl enable --now portfolio-api

# Configure Nginx
sudo nano /etc/nginx/conf.d/portfolio.conf
sudo systemctl enable --now nginx
```

#### 13. Create Database Schema
```bash
psql -h <rds-endpoint> -U postgres -d postgres -p 5432

CREATE DATABASE portfolio;
\c portfolio

CREATE TABLE visitors (...);
CREATE TABLE contacts (...);
CREATE TABLE projects (...);

INSERT INTO projects VALUES (...);
```

---

## 📋 Compliance Mapping

| Control | Framework | Implementation |
|---------|-----------|---------------|
| AC-3 Access Enforcement | NIST 800-53 | RDS in private subnet, only bastion-sg can connect |
| AC-6 Least Privilege | NIST 800-53 | IAM roles scoped per resource, inline policies |
| AU-2 Audit Events | NIST 800-53 | CloudTrail, RDS enhanced monitoring, journald |
| AU-9 Audit Protection | NIST 800-53 | S3 bucket for CloudTrail, encrypted |
| IA-5 Authenticator Mgmt | NIST 800-53 | Secrets Manager auto-rotation, no hardcoded creds |
| SC-8 Transmission Security | NIST 800-53 | TLSv1.3 on all RDS connections (auto) |
| SC-28 Data at Rest | NIST 800-53 | RDS AES256 encryption, Secrets Manager KMS |
| SI-2 Flaw Remediation | NIST 800-53 | dnf update, RDS auto minor version upgrade |
| Req 1.3 | PCI-DSS | Network segmentation — public/private subnets |
| Req 2.2 | PCI-DSS | Least privilege IAM, security groups |
| Req 6.4 | PCI-DSS | Private subnet, no direct internet access to DB |
| Req 8.3 | PCI-DSS | Secrets Manager, no shared credentials |
| § 164.312(a) | HIPAA | Access controls via IAM and security groups |
| § 164.312(e) | HIPAA | TLS encryption in transit |

---

## 💰 Cost Breakdown

| Resource | Type | Cost/Hour | Cost/Day |
|----------|------|-----------|----------|
| EC2 x2 (ASG desired) | t2.micro | $0.024 | $0.58 |
| RDS | db.t3.micro | $0.018 | $0.43 |
| NAT Gateway | — | $0.045 | $1.08 |
| ALB | — | $0.008 | $0.19 |
| Secrets Manager | 1 secret | $0.001 | $0.01 |
| Route 53 | Hosted zone | $0.002 | $0.05 |
| **Total** | | **~$0.098/hr** | **~$2.34/day** |

**Cost saving tips:**
```
Set ASG min=0 when not using  → saves $0.58/day
Stop RDS when not using       → saves $0.43/day
Delete NAT Gateway when done  → saves $1.08/day (biggest cost)
Delete ALB when not using     → saves $0.19/day
```

---

## 💡 Lessons Learned

1. **DB Subnet Groups require 2 AZs** — Even for single-AZ RDS, AWS requires the subnet group to span at least 2 availability zones. Always create private subnets in 2 AZs.

2. **`#` in .env files is a comment** — Passwords containing `#` must be wrapped in quotes: `DB_PASSWORD="admin1234#"` otherwise everything after `#` is ignored.

3. **NAT Gateway vs Internet Gateway** — IGW allows bidirectional internet traffic. NAT Gateway allows outbound only — private resources can call out but nothing can connect in. Always put databases in private subnets with NAT.

4. **systemctl enable vs start** — `enable` = start on boot, `start` = start now. Use `enable --now` to do both. Without `enable`, the service won't survive a reboot.

5. **Nginx reverse proxy hides ports** — Users access port 80 (Nginx), never port 3000 (Node.js). This improves security and allows SSL termination at the proxy layer.

6. **RDS SSL is automatic** — AWS configures TLSv1.3 on all RDS instances automatically. No manual certificate configuration needed — just connect and it's encrypted.

7. **Security group chaining** — Instead of allowing `0.0.0.0/0` on RDS port 5432, reference the bastion security group ID as the source. Only instances in that SG can connect — much more secure.

---

## 🔜 Next Steps

```
✅ Step 1  — VPC + Networking
✅ Step 2  — IAM Roles + Secrets Manager
✅ Step 3  — RDS PostgreSQL (private subnet)
✅ Step 4  — EC2 Bastion (public subnet)
✅ Step 5  — Node.js API (5 endpoints)
✅ Step 6  — Nginx reverse proxy
✅ Step 7  — Portfolio website live
✅ Step 8  — Live database integration
✅ Step 9  — Launch Template (auto-configuration)
✅ Step 10 — Application Load Balancer + Target Group
🔜 Step 11 — Auto Scaling Group
🔜 Step 12 — Route 53 → desbain.com
🔜 Step 13 — ACM Certificate (HTTPS)
🔜 Step 14 — GuardDuty threat detection
🔜 Step 15 — SNS email alerts
🔜 Step 16 — Lambda auto-remediation
🔜 Step 17 — Security incident simulation
🔜 Step 18 — Convert all to Terraform
```

---

## 👤 Author

**George Awa** — DevSecOps Engineer | GRC & Cloud Security

[![GitHub](https://img.shields.io/badge/GitHub-desbain-181717?style=flat&logo=github)](https://github.com/desbain)
[![Email](https://img.shields.io/badge/Email-gewa11281@gmail.com-EA4335?style=flat&logo=gmail)](mailto:gewa11281@gmail.com)
