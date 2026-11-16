# Savit CRM — AI-Powered CRM Module

A modern, pragmatic, B2B SaaS CRM application built for **Savit Interactive** take-home assignment. Designed with an Attio/Linear-inspired interface, robust role-based access controls, complete sales pipeline management with Kanban drag-and-drop, full activity timelines, CSV lead/contact importing with duplicate detection, and two server-side AI-powered features (Lead Scoring & Follow-up Email Generation).

---

## 1. Project Overview

Savit CRM streamlines B2B sales pipelines for growing sales teams. It models Indian business contexts with ₹ (INR) valuations, multi-city teams, and structured stage progression.

Key highlights:
- **Pragmatic Architecture**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui primitives.
- **Data Persistence**: PostgreSQL via Prisma ORM with strict foreign keys, cascade rules, and automated audit trails.
- **Strict Role-Based Access**: Multi-tenant visibility enforcement on both UI and server API layers (Admins access all records; Sales Reps access only assigned records).
- **Two Production-Grade AI Features**:
  1. **AI Lead Scoring**: Context-aware lead rating (0–100, Hot/Warm/Cold, 3 factual reasons) with intelligent database caching and auto-staling on activity changes.
  2. **AI Follow-up Email Generator**: Multi-tone (Formal, Friendly, Short) context-driven follow-up generator with editable review and one-click activity timeline logging.

---

## 2. Features Implemented

### Authentication & Authorization
- Secure JWT cookie sessions (`jose`, HttpOnly, strict same-site).
- Password hashing using `bcryptjs` with salt rounds.
- Role-based permissions (`ADMIN` and `SALES_REP`):
  - **Admin**: View, filter, create, edit, reassign, and delete all leads, tasks, contacts, and companies; view sales rep leaderboard.
  - **Sales Rep**: Isolated view showing only their assigned leads and tasks; cannot reassign ownership to other users.
  - **Server-Side Enforcement**: All `/api/leads/*`, `/api/tasks/*`, and dashboard routes enforce ownership at the database query level.

### Contacts & Companies Management
- Full CRUD for Contacts and Companies.
- 1-to-Many relational structure: A Company has multiple Contacts; each Contact optionally links to a Company.
- Instant search and multi-facet filtering (by city, lead source, tag, company).
- Deleting a company safely unlinks associated contacts (using `onDelete: SetNull`).

### Leads & Pipeline (Kanban & Table)
- Pipeline stages: `NEW` → `CONTACTED` → `QUALIFIED` → `PROPOSAL_SENT` → `NEGOTIATION` → `WON` / `LOST`.
- Interactive drag-and-drop Kanban board powered by `@dnd-kit`.
- Switchable views: Kanban board and detailed tabular view.
- Stage transition enforcement: Moving to `LOST` strictly requires entering a loss reason.
- Automated stage history logging as an activity event with author and timestamp.
- Full Lead Detail page:
  - Lead metrics, stage controller, and contact metadata.
  - Interactive AI Score dial with reasons.
  - Chronological Activity Timeline (calls, emails, meetings, notes, stage transitions).
  - Quick task scheduler with overdue alerting.
  - AI Follow-up Email composer.

### Activity Timeline & Task Management
- Activity tracking for Calls, Emails, Meetings, Notes, and automated Stage Changes.
- Follow-up task creation with due dates, completion toggling, and overdue indicators.
- Overdue tasks highlighted on the main executive dashboard.

### CSV Import Workflow
- Upload CSV file with instant browser parsing (`papaparse`).
- Dynamic column mapping to CRM fields (`name`, `email`, `phone`, `company`, `city`, `source`, `notes`, `tags`).
- Live 5-row preview prior to submission.
- Smart duplicate detection across existing database emails and phone numbers.
- Configurable "Skip duplicates" toggle.
- Detailed import report with imported, skipped, and error counts.
- Sample CSV included at `/sample-contacts.csv`.

### Executive Dashboard
- Metric cards: Total leads, Total pipeline value (INR formatted), Won deals count, Win rate (%), Overdue tasks count.
- **Pipeline Value by Stage** (Recharts Bar Chart with compact INR formatting).
- **Leads by Source** (Recharts Pie Chart with distinct color palettes).
- **Sales Rep Leaderboard** (Admin-accessible performance metrics).
- Date range filtering (`from` / `to`) and Rep-specific filtering for admins.

---

## 3. Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + Radix UI primitives + Lucide Icons
- **Database**: PostgreSQL 16
- **ORM**: [Prisma ORM v6](https://www.prisma.io/)
- **Validation**: [Zod v3](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Drag & Drop**: [@dnd-kit/core](https://dndkit.com/)
- **CSV Parsing**: [PapaParse](https://www.papaparse.com/)
- **AI Integration**: Groq API (`llama-3.3-70b-versatile`) and Google Gemini API (`gemini-2.0-flash`) via server-side endpoints

---

## 4. Installation & Local Setup

### Prerequisites
- Node.js 18+ installed
- Docker (for PostgreSQL container) or a local PostgreSQL instance

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd savit_assignment
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
DATABASE_URL="postgresql://crm:crm@localhost:5432/crm?schema=public"
AUTH_SECRET="savit-crm-dev-secret-change-in-production-32chars"

# AI Provider (provide at least one)
GROQ_API_KEY="your-groq-api-key"
GROQ_MODEL="llama-3.3-70b-versatile"
# or
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.0-flash"
```

### 3. Start Database & Seed
Start the PostgreSQL container:
```bash
npm run db:up
# or: docker compose up -d
```

Run database migrations and seed realistic Indian business data:
```bash
npx prisma db push
npm run db:seed
```

### 4. Run the Application
Development mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

Production build test:
```bash
npm run build
npm run start
```

---

## 5. Demo Login Credentials

The seed script initializes three user accounts representing typical organization roles:

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Ananya Sharma | `admin@savit.dev` | `Admin@123` |
| **Sales Rep** | Rohan Mehta | `rohan.mehta@savit.dev` | `Rep@123` |
| **Sales Rep** | Priya Nair | `priya.nair@savit.dev` | `Rep@123` |

- **Admin** has unrestricted view across all deals, contacts, companies, tasks, and the full sales rep leaderboard.
- **Sales Reps** only view and manage leads and tasks assigned directly to them.

---

## 6. Database Schema Overview

```prisma
enum Role {
  ADMIN
  SALES_REP
}

enum LeadStage {
  NEW
  CONTACTED
  QUALIFIED
  PROPOSAL_SENT
  NEGOTIATION
  WON
  LOST
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  NOTE
  STAGE_CHANGE
}

enum LeadCategory {
  HOT
  WARM
  COLD
}
```

### Primary Models & Relations:
- **User**: Authentication, role (`ADMIN` vs `SALES_REP`), assigned leads, activity logs, tasks.
- **Company**: Account records (`name`, `website`, `industry`, `city`). 1-to-many with Contacts.
- **Contact**: Customer contact (`name`, `email`, `phone`, `city`, `source`, `notes`, `tags`). Belongs to Company.
- **Lead**: Sales opportunity (`title`, `dealValue`, `stage`, `expectedCloseDate`, `source`, `lostReason`, `aiScore`, `aiCategory`, `aiReasons`, `scoreStale`). Belongs to Contact and User (Owner).
- **Activity**: Chronological audit trail linked to a Lead. Tracks interaction type (`CALL`, `EMAIL`, `MEETING`, `NOTE`, `STAGE_CHANGE`) and author.
- **Task**: Follow-up action item (`title`, `dueDate`, `completed`). Linked to Lead and assigned User.

---

## 7. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & issue JWT cookie | Public |
| `POST` | `/api/auth/logout` | Clear session cookie | Authenticated |
| `GET` | `/api/auth/me` | Fetch active session profile | Authenticated |
| `GET` | `/api/dashboard` | Dashboard metrics, stage charts, rep leaderboard | Authenticated (filtered by role) |
| `GET` | `/api/leads` | List leads with search, stage, source & owner filters | Authenticated (filtered by role) |
| `POST` | `/api/leads` | Create new lead | Authenticated |
| `GET` | `/api/leads/[id]` | Get lead detail with activities & tasks | Authenticated (permission-checked) |
| `PATCH` | `/api/leads/[id]` | Update lead attributes / reassign (Admin only) | Authenticated (permission-checked) |
| `DELETE` | `/api/leads/[id]` | Delete lead record | Authenticated (permission-checked) |
| `POST` | `/api/leads/[id]/stage` | Change lead stage (requires reason if `LOST`) | Authenticated (permission-checked) |
| `POST` | `/api/leads/[id]/score` | Generate/retrieve cached AI lead score | Authenticated (permission-checked) |
| `POST` | `/api/leads/[id]/email` | Generate AI follow-up email draft | Authenticated (permission-checked) |
| `POST` | `/api/leads/[id]/activities` | Log manual interaction to timeline | Authenticated (permission-checked) |
| `GET` | `/api/contacts` | Search and filter contacts | Authenticated |
| `POST` | `/api/contacts` | Create contact | Authenticated |
| `PATCH` | `/api/contacts/[id]` | Update contact details | Authenticated |
| `DELETE` | `/api/contacts/[id]` | Delete contact | Authenticated |
| `GET` | `/api/companies` | Search companies with contact counts | Authenticated |
| `POST` | `/api/companies` | Create company | Authenticated |
| `PATCH` | `/api/companies/[id]` | Update company details | Authenticated |
| `DELETE` | `/api/companies/[id]` | Delete company | Authenticated |
| `GET` | `/api/tasks` | Get tasks (open, overdue, done) | Authenticated (filtered by role) |
| `POST` | `/api/tasks` | Create task | Authenticated |
| `PATCH` | `/api/tasks/[id]` | Update task completion or due date | Authenticated |
| `DELETE` | `/api/tasks/[id]` | Delete task | Authenticated |
| `POST` | `/api/import/contacts` | Process batch CSV contact import with duplicate handling | Authenticated |
| `GET` | `/api/search` | Quick omni-search for leads and contacts | Authenticated |

---

## 8. AI Feature Explanations & Prompts

Both AI features are executed exclusively **server-side**; API keys are never leaked to client bundles. Responses are parsed and verified using Zod schemas with fallback retry logic.

### Feature 1: AI Lead Scoring
- **Endpoint**: `POST /api/leads/[id]/score`
- **Mechanism**:
  - Checks if a valid cached score exists on the lead (`scoreStale: false`). If so, returns the cached score without calling external APIs.
  - When stage, deal value, expected close date, or activity history changes, `scoreStale` is marked `true`.
  - The scoring prompt receives structured JSON facts about the deal: value in INR, pipeline stage, days to expected close date, recent interaction notes, and contact company.
  - Produces:
    - Score (0–100)
    - Category (`Hot`: 70–100, `Warm`: 40–69, `Cold`: 0–39)
    - 3 concise reasons referencing concrete facts.
- **System Prompt**:
```
You are a CRM analyst for an Indian B2B sales team.
Score the lead from 0 to 100 using only the JSON facts provided. Do not invent meetings, budget, or intent.
Return JSON only, with this shape:
{"score": number, "category": "Hot" | "Warm" | "Cold", "reasons": [string, string, string]}
Rules:
- Hot is 70-100, Warm is 40-69, Cold is 0-39. The category must match the score.
- Higher deal value, later pipeline stages, a close date within 30 days, and recent substantive activity raise the score.
- Won leads can score high. Lost leads should score low.
- Stale or missing activity lowers the score.
- Each reason is one short sentence under 140 characters and cites a fact from the input.
- Do not recommend changing CRM fields.
```

### Feature 2: AI Follow-Up Email Generator
- **Endpoint**: `POST /api/leads/[id]/email`
- **Mechanism**:
  - Sales reps choose from three tones: `Formal`, `Friendly`, or `Short`.
  - The model receives contact information, company name, current stage, and the last 5 activities logged on the timeline.
  - Returns a structured `{ subject, body }` payload.
  - The rep can review, modify the subject and body directly in the browser, and click **Save as Activity** to append it to the lead's permanent activity history.
- **System Prompt**:
```
You write follow-up emails for sales reps at Savit Interactive, a B2B CRM consultancy.
Return JSON only: {"subject": string, "body": string}
Rules:
- Use only facts in the user payload. Do not invent pricing, meetings, or promises.
- The body is plain text with short paragraphs. No markdown.
- Sign off with the sales rep's name.
- Formal: professional and complete. Friendly: warm and still businesslike. Short: under 90 words.
- Do not claim the email was already sent.
```

---

## 9. AI Cost Estimation (10 Sales Reps, 2,000 Leads / Month)

### Assumptions:
- **Team Size**: 10 sales reps.
- **Monthly Lead Volume**: 2,000 new leads.
- **Scoring Usage**: 2,000 leads scored initially + ~1,000 stage/activity recalculations = **3,000 scoring requests/month**.
- **Email Generation Usage**: Average 2 follow-up drafts per lead = **4,000 email requests/month**.
- **Average Token Consumption**:
  - Scoring: ~600 input tokens + ~120 output tokens.
  - Email generation: ~700 input tokens + ~250 output tokens.

### Monthly Token Volume:
- **Input Tokens**:
  - Scoring: 3,000 × 600 = 1,800,000 tokens (1.8M)
  - Emails: 4,000 × 700 = 2,800,000 tokens (2.8M)
  - **Total Input**: ~4.6M tokens
- **Output Tokens**:
  - Scoring: 3,000 × 120 = 360,000 tokens (0.36M)
  - Emails: 4,000 × 250 = 1,000,000 tokens (1.0M)
  - **Total Output**: ~1.36M tokens

### Cost Breakdown:

| Provider & Model | Input Pricing (per 1M) | Output Pricing (per 1M) | Estimated Monthly Cost |
|---|---|---|---|
| **Google Gemini 2.0 Flash** | \$0.10 | \$0.40 | **\$1.00 / month** (within generous free tier) |
| **Groq (Llama 3.3 70B)** | \$0.59 | \$0.79 | **\$3.79 / month** |
| **OpenAI GPT-4o-mini** (Benchmark) | \$0.15 | \$0.60 | **\$1.51 / month** |

**Conclusion**: Thanks to intelligent database-level score caching and payload minification, operating this AI CRM module costs **less than \$4.00 per month** across 10 reps and 2,000 leads, and can run completely **free** on Google Gemini or Groq's free-tier developer quotas.

---

## 10. Features Intentionally Not Implemented (And Why)

1. **Direct SMTP / IMAP Email Dispatch**:
   - *Reason*: Assignment explicitly states: *"Do not implement actual email sending"*. In modern CRM architectures, email integration requires domain verification (SPF/DKIM), OAuth consents, and mailbox webhook listeners which would introduce brittle external dependencies for an MVP.
2. **Third-Party OAuth / SSO (Google/Microsoft)**:
   - *Reason*: Avoids external OAuth client ID setup for evaluators testing locally. Secure password hashing with bcrypt and signed JWT cookies provide reliable, self-contained local evaluation.
3. **Complex Multi-Step Drag-and-Drop Column Reordering**:
   - *Reason*: Kanban columns follow the defined linear sales progression (`NEW` to `WON`/`LOST`). Arbitrary column reordering would violate standard pipeline progression rules.
4. **WebSocket / Real-Time Push Subscriptions**:
   - *Reason*: Kept the stack light with fast client-side polling and revalidation on mutate, avoiding the infrastructure overhead of a dedicated WebSocket server.
