# DEPLOYMENT.md — Solo Project 3 (Workout Collection Manager)

## Live URL (Custom Domain + HTTPS)
- **Primary domain:** https://workout-logs.com
- **WWW redirect:** https://www.workout-logs.com (redirects to primary)

✅ HTTPS is enabled via Render certificate.

---

## Domain + Registrar
- **Domain name:** workout-logs.com
- **Registrar/DNS provider:** Network Solutions

### DNS Records (Network Solutions)
These records point the domain to Render:

**Root domain (workout-logs.com)**
- Type: **A**
- Name/Host: **@**
- Value: **216.24.57.1** (Render A record target)

**WWW (www.workout-logs.com)**
- Type: **CNAME**
- Name/Host: **www**
- Value/Target: **solo3-workout-logs-node.onrender.com**

---

## Hosting Provider
- **Hosting provider:** Render
- **Service type:** Node/Express Web Service

Render provides automatic TLS/SSL certificates once DNS is verified.

---

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Uploads:** Multer (image uploads stored on the server)
- **Deployment:** GitHub → Render auto-deploy

---

## Database Type + Hosting
- **Database type:** PostgreSQL
- **Hosted on:** Render PostgreSQL (managed database)
- **Connection method:** `DATABASE_URL` environment variable (SSL enabled)

---

## Environment Variables / Secrets

Sensitive configDeuration values are stored securely in Render environment settings
and are NOT committed to GitHub.

Environment variables used:

- DATABASE_URL (PostgreSQL connection string provided by Render)
- NODE_ENV=production
- PORT (provided automatically by Render)

These variables are configured in the Render dashboard under:
Service → Environment → Environment Variables.
---

## How to Deploy / Update
### Deploy (first time)
1. Push project to GitHub.
2. Create a new **Web Service** on Render linked to the GitHub repo.
3. Add environment variables in Render (especially `DATABASE_URL`).
4. Deploy the service.
5. Add custom domains in Render:
   - workout-logs.com
   - www.workout-logs.com
6. Create DNS records in Network Solutions (A + CNAME) and verify in Render.

### Update (future changes)
1. Commit + push changes to GitHub (`main` branch).
2. Render automatically redeploys the service.
3. Verify the site loads at https://workout-logs.com

---

## Seed Data
The app includes **40+ seeded workout records** in the PostgreSQL database (required minimum is 30).
Each record has an associated image URL and supports full CRUD.

---

## Production Features Checklist
- ✅ Full CRUD backed by PostgreSQL
- ✅ Paging + user-configurable page size
- ✅ Page size saved/restored via cookie
- ✅ Sorting + search/filtering
- ✅ Stats view includes total records, current page size, and domain stats
- ✅ Each record shows an image + broken/missing image fallback
- ✅ Custom domain + HTTPS enabled