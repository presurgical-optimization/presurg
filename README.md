# Presurgical Optimization Platform (Hackathon Prototype) — Technical Deep Dive

A full-stack prototype that demonstrates:
1) **Versioned perioperative plans** stored as structured JSON (PostgreSQL + Prisma)  
2) **LLM + LangChain structured output** to support reliable automation (not free-form text)  
3) **Event-driven updates** (Socket.IO) so the doctor dashboard refreshes when guidelines change  
4) **Simple role-based auth** via in-memory sessions (hackathon-friendly)

> ⚠️ Scope note: This is a hackathon prototype. It focuses on backend data modeling + system workflows rather than production-grade compliance/security.

---

## 1. Tech Stack

### Core
- **Next.js 16 (App Router)** + React 19
- **PostgreSQL**
- **Prisma ORM**
- **Zod** (runtime schema validation)
- **Socket.IO** (real-time updates)
- **OpenAI + LangChain** (structured extraction)

### Relevant Dependencies (from `package.json`)
- `@langchain/openai`, `@langchain/core`, `langchain`
- `socket.io`, `socket.io-client`
- `zod`, `file-type`
- `@prisma/client`, `prisma`

---

## 2. Repository Structure (Important Files)

```

prisma/
schema.prisma                      # Data model (users, surgeries, versioning, LLM audit logs)

src/
app/
doctor/page.tsx                  # Doctor dashboard (uses Zod parsing + supports refresh)
patient/page.tsx                 # Patient view (fetches published plan as guideline items)

```
api/
  auth/
    login/route.ts               # POST login -> sets session cookie
    me/route.ts                  # GET current user
    logout/route.ts              # POST logout -> deletes session cookie

  doctor/route.ts                # Doctor API -> returns patients + surgeries + plan version history
  patients/surgeries/route.ts    # Patient API -> returns surgeries w/ published plan mapped to items

  guidelines/route.ts            # GET list; POST create guideline + emit socket event
  guidelines/search/route.ts     # Search endpoint for guidelines
  openAI/route.ts                # LLM route: image + hints -> structured JSON decision + DB log

  socket.ts                      # Socket server init (see WebSocket notes below)
```

lib/
prisma.ts                        # PrismaClient singleton
session.ts                       # in-memory session store (hackathon)
auth.ts                          # requireAuth/requireRole via cookie sid
socket.ts                        # Socket.IO singleton + init/get
useGuidelineSocket.ts            # client hook: connect + listen "guideline:updated"

````

---

## 3. Domain Model & Why It’s Designed This Way

### 3.1 High-level concepts
- **User** has role: `doctor | patient`
- **Surgery** belongs to a patient and a doctor
- **SurgeryPlanVersion** stores **instructions as JSON** (JSONB in Postgres)
- Each surgery has a pointer to the **currentPublishedVersion** as a patient-facing “single source of truth”
- **LlmExtractionRun** logs each LLM run for traceability

### 3.2 Prisma models (key design)
From `prisma/schema.prisma`:

- `Surgery.currentPublishedVersionId` is **unique**, forming a 1:1 relation to a plan version.
- `SurgeryPlanVersion.instructions` is a JSON blob (intentionally), because perioperative instructions are diverse and evolve quickly.
- `@@unique([surgeryId, versionNo])` ensures plan version numbers are stable per surgery.
- `LlmExtractionRun` stores:
  - `inputJson` (metadata + user meds list + hints)
  - `outputJson` (validated structured result)
  - `status` + `error`

This is the "regulated systems mindset":
- immutable-ish history (versions)
- stable published pointer (current plan)
- auditable automation (LLM runs)

---

## 4. Authentication (Hackathon-Friendly)

### 4.1 Session store
This project uses a very simple in-memory session store:

- `src/lib/session.ts` stores sessions in a `Map<string, SessionData>`
- `src/lib/auth.ts` reads cookie `sid` and resolves to `{ userId, role }`

**Trade-offs (intentional for hackathon):**
- Restart server -> sessions wiped
- Not safe for multi-instance deployment
- No token rotation, CSRF strategy, etc.

### 4.2 Login flow
- `POST /api/auth/login` with `{ ssn, dob }`
- Server sets `sid` cookie (`httpOnly`, `sameSite=lax`)
- Frontend uses `GET /api/auth/me` to check current user role and route them

---

## 5. Core API Endpoints (Backend Contracts)

### 5.1 Doctor dashboard data
**GET `/api/doctor`** (`src/app/api/doctor/route.ts`)

Returns patients with surgeries, including plan versions:
- selects patient users
- for each surgery includes:
  - guideline name/description
  - versions sorted by `versionNo`
- response is reshaped into:
  - `latestVersion` = last element
  - `history` = full list

This supports UI:
- show latest instructions
- allow “History” modal view

---

### 5.2 Patient surgeries + published plan mapping
**GET `/api/patients/surgeries`** (`src/app/api/patients/surgeries/route.ts`)

Important behavior:
- requires role `patient`
- fetches each surgery + `currentPublishedVersion.instructions`
- maps `instructions[]` -> `guideline.items[]` using a minimal schema:

The UI currently expects guideline items like:
- `{ id, title, description, itemKey, type, window, appliesIf }`

But your instructions JSON can contain richer medical fields (dosage, max_dose, indications, etc.).  
So the endpoint intentionally **projects only what the UI needs**, while keeping JSON extensible for future.

---

### 5.3 Guidelines CRUD + real-time notification
**GET `/api/guidelines`**: list guidelines (doctor only)  
**POST `/api/guidelines`**: create guideline (doctor only) + emit socket event

In `src/app/api/guidelines/route.ts`:
- `prisma.surgeryGuideline.create(...)`
- then emits:
  - `io?.to("guidelines").emit("guideline:updated", { action, guidelineId, updatedAt })`

---

## 6. Real-time Updates (Socket.IO)

### 6.1 Client subscription
`src/lib/useGuidelineSocket.ts`:
- `fetch("/api/socket")` to initialize server
- connects Socket.IO client using `path: "/api/socket"`
- joins room `"guidelines"`
- listens `"guideline:updated"` and triggers callback

Expected usage in a page:
```ts
useGuidelineSocket(() => router.refresh());
````

### 6.2 Server initialization

`src/lib/socket.ts`:

* stores singleton `global.io`
* initializes Socket.IO with:

  * `path: "/api/socket"`
  * CORS open (hackathon mode)

`src/app/api/socket.ts` currently contains a **Pages Router style handler** (`NextApiRequest/NextApiResponse`) and references `res.socket.server`.

#### ⚠️ Important Next.js note

Socket.IO server initialization typically needs to live under:

```
src/pages/api/socket.ts
```

because it relies on `res.socket.server` (Node HTTP server), which is a **Pages Router API feature**.

**Recommended fix (if you want this to run reliably):**

* Move file:

  * from `src/app/api/socket.ts`
  * to `src/pages/api/socket.ts`

and keep its content as-is.

If you keep it under `src/app/api/socket.ts`, it may not behave consistently depending on Next.js runtime behavior.

---

## 7. LLM Integration (OpenAI + LangChain Structured Output)

### 7.1 What this route does

**POST `/api/openAI`** (`src/app/api/openAI/route.ts`) processes:

Inputs (multipart/form-data):

* `userId`
* `image` (pill image)
* optional hints: `imprint`, `color`, `shape`

Server steps:

1. Query surgeries for the patient (by `patientId = userId`)
2. Resolve `currentPublishedVersionId` list
3. Load each `SurgeryPlanVersion.instructions` JSON
4. Extract medication instructions (type === `"medication"`) to build `user_med_list`
5. Parse image mimetype using `file-type`
6. Invoke OpenAI through LangChain with:

   * system prompt (“never provide medical advice”)
   * content: JSON + image (base64)
7. Enforce **schema-validated JSON output** using Zod

### 7.2 Why LangChain is used here (vs raw OpenAI SDK)

The key need is **reliable structured data**:

* downstream automation depends on stable keys + types
* avoids “model returns random text / missing fields”

Implementation detail:

```ts
const model = new ChatOpenAI({...}).withStructuredOutput(PillIdentifierSchema);
const result = await model.invoke(messages);
```

Where `PillIdentifierSchema` ensures output includes:

* `name`
* `confidence_0to1` (0..1)
* `is_on_user_list`
* `matched_index`
* `reason`

If it fails schema validation, the route returns 502 and logs an ERROR run.

### 7.3 Auditability: LLM run logs

Every run is persisted to `LlmExtractionRun`:

* success: inputJson + outputJson + status=SUCCESS
* failure: inputJson + status=ERROR + error

Data minimization:

* stores **image metadata** but not raw base64 image in DB

---

## 8. Local Setup

### 8.1 Prerequisites

* Node.js 18+ recommended
* PostgreSQL running locally or hosted

### 8.2 Environment variables

Create `.env` at project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
OPENAI_API_KEY=your_openai_key
```

Note: `.env.example` currently doesn’t include `OPENAI_API_KEY` — add it for clarity.

### 8.3 Install & run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open:

* [http://localhost:3000](http://localhost:3000)

---

## 9. Useful Debug Commands

### Prisma

```bash
npx prisma studio
```

### Quick API checks

Create guideline (doctor role required):

```bash
curl -X POST http://localhost:3000/api/guidelines \
  -H "Content-Type: application/json" \
  -d '{"name":"Test guideline","description":"socket test"}'
```

If socket is correctly initialized, doctor page should refresh via `router.refresh()`.

---

## 10. Known Limitations (Intentional / Hackathon)

* Auth sessions stored in memory (not Redis)
* No production security hardening (rate limits, CSRF strategy, etc.)
* Socket server route should be moved to Pages Router for reliability
* LLM route is a prototype: “pill identification” is not medical-grade and does not provide advice

---

## 11. Future Work (If Productizing)

* Replace in-memory sessions with Redis / DB sessions
* Introduce RBAC at the query level (doctor sees only their patients)
* Add test coverage for API contracts (Zod-based contract tests)
* Expand instruction schema in patient endpoint to include dosage/indications fields in UI
* Improve socket routing in Next.js with a stable server adapter for production