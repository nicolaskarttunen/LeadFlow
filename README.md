# LeadFlow

Quality-first B2B lead research and outreach SaaS.

LeadFlow is an independent full-stack project focused on helping small businesses find relevant B2B prospects, organize lead research and manage outreach in a structured way.

## Current MVP

The current repository contains the working MVP foundation:

- Email/password authentication
- Multi-tenant workspaces
- Company and ideal customer profile onboarding
- Dashboard
- Lead creation, search, editing and deletion
- Lead and contact duplicate protection
- Audit logging
- Database models prepared for research, scoring, campaigns, email workflows, replies, suppression, usage and billing

## Tech stack

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Prisma ORM
- Better Auth
- Tailwind CSS
- Zod
- Docker

## Architecture and security

Lead data is scoped to authenticated workspaces on the server side. The application does not trust a workspace ID supplied by the browser for authorization.

Workspace membership is verified before lead queries or mutations are performed.

Environment variables are kept outside version control and the repository contains only an example environment file.

## Project status

LeadFlow is under active development.

Planned next steps include:

- Lead discovery providers
- Evidence-backed company and website research
- Transparent lead scoring
- AI-assisted personalized email generation
- Campaign and approval workflows
- Safe email sending with suppression and rate limits
- Reply processing and follow-up cancellation
- Analytics and usage tracking

The project intentionally does not enable unrestricted automated sending at this stage.

## Run locally

Requirements:

- Node.js 24 LTS
- Docker Desktop
- npm

Clone the repository and install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d
```

Generate Prisma Client and run the migration:

```bash
npm run db:generate
npx prisma migrate dev --name init
```

Run the checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Start development:

```bash
npm run dev
```

Then open http://localhost:3000.

## About

Built as an independent software project by Nicolas Karttunen.
