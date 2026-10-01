# LeadFlow

Quality-first B2B lead research and outreach SaaS.

This repository is the runnable MVP foundation:

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM 7
- Better Auth email/password authentication
- Multi-tenant workspace membership
- Company profile + ICP onboarding
- Dashboard
- Manual lead create/search/view/edit/delete
- Lead/contact duplicate protection
- Audit logging
- Database models prepared for research, scoring, campaigns, email approval, sending, replies, suppression, usage and billing

## Requirements

- Node.js 24 LTS recommended
- Docker Desktop (for the provided local PostgreSQL setup)
- npm

## Local setup

1. Copy environment variables:

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Generate a Better Auth secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Put the printed value into `BETTER_AUTH_SECRET` in `.env`.

3. Start PostgreSQL:

   ```powershell
   docker compose up -d
   ```

4. Install packages:

   ```powershell
   npm install
   ```

5. Generate Prisma Client:

   ```powershell
   npm run db:generate
   ```

6. Create the database migration:

   ```powershell
   npx prisma migrate dev --name init
   ```

7. Run checks:

   ```powershell
   npm run typecheck
   npm run lint
   npm run build
   ```

8. Start development:

   ```powershell
   npm run dev
   ```

Open http://localhost:3000.

## Security model in this phase

The UI never supplies a trusted `workspaceId` for lead CRUD. The server resolves an authenticated user, validates workspace membership, and uses that verified workspace ID in every lead query and mutation.

An `leadflow_workspace` HttpOnly cookie is only a workspace preference. It is not authorization: the server verifies the current user is a member before using it.

## What comes next

1. Provider interfaces + CSV import + mock discovery provider
2. Evidence-backed website analysis
3. Structured research records
4. Transparent lead scoring
5. AI provider abstraction and guarded email generation
6. Campaign builder + approval queue
7. Resend provider + suppression/idempotency/rate limits
8. Reply processing + follow-up cancellation
9. Analytics
10. Stripe/usage enforcement
11. Tests/security hardening/demo mode/docs

Do not add real sending until the approval, suppression and idempotency layers are complete.
