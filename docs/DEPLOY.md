# 🚀 Deployment Guide: Nexus Online Banking System

This guide provides end-to-end instructions for deploying the **Nexus Online Banking System** to cloud environments (Render, Railway, AWS, Vercel, Netlify) with production configurations.

---

## 📋 Architecture & Deployment Overview

- **Backend**: Spring Boot 3.5.6 (Java 21 LTS) containerized via multi-stage Docker build.
  - Recommended platforms: **Render**, **Railway**, **Fly.io**, or **AWS ECS/App Runner**.
- **Database**: Managed MySQL 8.0 instance.
  - Recommended providers: **Railway MySQL**, **Aiven for MySQL**, or **Amazon RDS**.
- **Frontend**: Single Page Application (SPA) built with React 19 and Vite 7.
  - Recommended platforms: **Vercel**, **Netlify**, or **Cloudflare Pages**.

---

## 🔑 Environment Variables Matrix

### Backend Configuration

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Yes | Active Spring profile | `prod` |
| `PORT` | Yes | HTTP port (injected by host) | `8080` (or host assigned) |
| `DB_URL` | Yes | JDBC MySQL connection URL | `jdbc:mysql://<host>:<port>/<db>?useSSL=true&serverTimezone=UTC` |
| `DB_USERNAME` | Yes | Database username | `banking_user` |
| `DB_PASSWORD` | Yes | Database password | `<strong_password>` |
| `JWT_SECRET` | Yes | 256-bit+ Base64 or plain string | `c2VjdXJlQmFua2luZ1N5c3RlbVNlY3JldEtleUZvckpXVFRva2VuR2VuZXJhdGlvbjEyMzQ1Ng==` |
| `ALLOWED_ORIGINS` | Yes | Comma-delimited frontend URLs | `https://nexus-banking.vercel.app,http://localhost:5173` |

### Frontend Configuration

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | Backend public API base URL | `https://nexus-backend.onrender.com` |

---

## 🗄️ Step 1: Provision Managed MySQL Database

1. Sign up or log into **Railway** (or **Aiven** / **Render**).
2. Create a new service and select **MySQL Database (8.0)**.
3. Once initialized, note the connection credentials:
   - `Host`, `Port`, `Database Name`, `Username`, `Password`.
4. Construct the standard JDBC connection string:
   ```text
   jdbc:mysql://<HOST>:<PORT>/<DATABASE>?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC
   ```
5. *Note*: Flyway database migrations (`V1__init_schema.sql` and `V2__seed_demo_data.sql`) will automatically execute on the first boot of the backend application, provisioning the schema and seeding default demo accounts.

---

## ⚙️ Step 2: Deploy Backend to Render

1. Sign into [Render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `OnlineBankingSystem-SDP`.
4. Configure service settings:
   - **Name**: `nexus-banking-backend`
   - **Region**: Choose the region closest to your MySQL database.
   - **Root Directory**: `BACKEND/onlinebanking-backend`
   - **Environment**: **Docker**
   - **Dockerfile Path**: `Dockerfile`
5. In the **Environment Variables** section, add:
   - `SPRING_PROFILES_ACTIVE` = `prod`
   - `DB_URL` = `jdbc:mysql://<host>:<port>/<database>?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC`
   - `DB_USERNAME` = `<your_mysql_username>`
   - `DB_PASSWORD` = `<your_mysql_password>`
   - `JWT_SECRET` = `<min_32_characters_secret_string>`
   - `ALLOWED_ORIGINS` = `https://<your-frontend-domain>.vercel.app`
6. Set the **Health Check Path** to:
   ```text
   /actuator/health
   ```
7. Click **Create Web Service**.
8. After build succeeds, copy the public URL (e.g., `https://nexus-banking-backend.onrender.com`).

---

## ⚙️ Step 3 (Alternative): Deploy Backend to Railway

1. Sign into [Railway.app](https://railway.app).
2. Create a new project from your GitHub repo.
3. In settings, set the **Root Directory** to `/BACKEND/onlinebanking-backend`.
4. Set the build type to **Dockerfile**.
5. Add the environment variables listed in the matrix above.
6. Under **Networking**, generate a public domain for the backend service.

---

## 💻 Step 4: Deploy Frontend to Vercel

1. Sign into [Vercel.com](https://vercel.com).
2. Click **Add New...** > **Project** and import `OnlineBankingSystem-SDP`.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `FRONTEND/onlinebanking-frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
4. Add Environment Variable:
   - `VITE_API_URL` = `https://nexus-banking-backend.onrender.com` (your deployed backend URL without trailing slash).
5. Ensure `vercel.json` is present in `FRONTEND/onlinebanking-frontend` (included in repository) to route all paths to `/index.html`.
6. Click **Deploy**.

---

## 🔍 Step 5: Post-Deployment Smoke Test & Verification

Once both frontend and backend are live:

1. **Verify Actuator Health Check**:
   - Access `https://<your-backend-domain>/actuator/health` in your browser.
   - Expected status: `{"status":"UP"}`.
2. **Verify Interactive API Documentation**:
   - Access `https://<your-backend-domain>/swagger-ui/index.html`.
   - Ensure endpoints and schemas are visible.
3. **Smoke Test Customer Authentication**:
   - Navigate to your frontend URL.
   - Log in as Customer: `cust1` / `cust123`.
   - Verify balance ($5,000.00) renders on dashboard.
   - Perform a fund transfer of $50.00 to account `1001001002` (`cust2`).
   - Download the generated branded PDF statement.
4. **Smoke Test Staff Operations**:
   - Log in as Staff: `staff1` / `staff123`.
   - Navigate to loan approvals and verify submitted loan requests.
5. **Smoke Test Admin Capabilities**:
   - Log in as Admin: `admin` / `admin123`.
   - View aggregated analytics charts and customer directory.

---

## 🛡️ Production Security Checklist

- [ ] Changed default demo passwords in production.
- [ ] Enforced HTTPS across all endpoints (enforced by Render/Vercel).
- [ ] Set `ALLOWED_ORIGINS` to strictly match the production frontend domain (no wildcards).
- [ ] Stored `JWT_SECRET` in cloud secrets manager or encrypted environment variables.
- [ ] Database credentials rotated and restricted by IP where applicable.
