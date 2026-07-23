# Nexora AI deployment runbook

## Deployment order

1. Configure and deploy the backend on Render.
2. Confirm `GET /api/health` returns `200`.
3. Configure and deploy the frontend on Vercel.
4. Run the smoke tests below.

## Vercel frontend

Set this variable for Production and Preview:

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://nexora-ai-backend-1yvz.onrender.com/api` |

The value must contain only the URL. Do **not** include `VITE_API_URL=` inside the value. Redeploy after changing it.

## Render backend

Configure these variables in Render; never commit their secret values:

- `NODE_ENV=production`
- `CLIENT_URL=https://frontend-kappa-fawn-15.vercel.app`
- `MONGODB_URI`
- `JWT_SECRET` (cryptographically random, at least 32 bytes)
- `JWT_EXPIRE=1h`
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY`
- `EMAIL_FROM` (verified sender)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Optional AI-provider keys used by the selected deployment

Sessions use an HttpOnly, Secure, `SameSite=None` cookie because Vercel and Render are different sites. State-changing requests also require the matching CSRF nonce returned to frontend memory. Restrict `CLIENT_URL` to the deployed frontend.

## Credential rotation

Delete or rotate every formerly seeded shared admin/student/tutor account before exposing the deployment. Do not publish replacement credentials. Create administrators through a one-time secure operator workflow.

## Email service

The repository includes a Resend HTTP adapter and a no-delivery test/development transport. Production verification and recovery require `EMAIL_PROVIDER`, `RESEND_API_KEY`, and `EMAIL_FROM`. Verify the sender domain before launch.

## Smoke tests

1. Open `/register`, create a fake account, and verify the API request targets the Render `/api` origin.
2. Verify the email, complete onboarding, and open Dashboard.
3. Log out and confirm `/api/auth/me` returns 401 with the old cookie.
4. Test password reset once, then confirm the link cannot be reused.
5. Confirm a student receives 403 for `/api/admin/users`.
6. Open an invalid URL and confirm the branded 404 page.
7. Test 320 px, mobile landscape, and 200% zoom.
8. Upload/cancel/retry/delete a non-confidential PDF.
9. Check console/network health and rerun Lighthouse.

## Rollback

Use the Vercel and Render deployment dashboards to promote the last known-good immutable deployment. If authentication changes are rolled back, rotate `JWT_SECRET` to invalidate incompatible cookies and communicate the forced sign-in. Back up MongoDB before schema migrations; never roll back by deleting production data.
