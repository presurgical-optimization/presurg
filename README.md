# Presurgical Optimization Platform (UCI MSWE 2025 Hackathon)

We are **Presurgical Optimization Platform**, a hackathon prototype focused on **backend system design, LLM-assisted structured extraction, and real-time clinical workflow updates**.

This document is written by **Carrie Chang**.

> Scope note: This is a hackathon prototype. It focuses on backend data modeling + system workflows rather than production-grade compliance/security.


---

## Our Team

- Carrie Chang [@Tsu-Yu](https://github.com/Tsu-Yu)
- Carol Yeh [@Carolyehhh](https://github.com/Carolyehhh)
- Shih-Yuan Huang [@shihyunhuang](https://github.com/shihyunhuang)
- I-Hsuan Chiang [@J-ihsuan](https://github.com/J-ihsuan)
- Pete Chen [@petechentw](https://github.com/petechentw)
---

## Table of Contents

- [Our Team](#our-team)
- [Table of Contents](#table-of-contents)
- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Core Technical Design](#core-technical-design)
  - [Data Modeling & Versioning](#data-modeling--versioning)
  - [LLM Integration (OpenAI + LangChain)](#llm-integration-openai--langchain)
  - [Real-time Update (WebSocket)](#real-time-update-websocket)
- [How to Run Locally](#how-to-run-locally)
- [For Developers](#for-developers)
  - [Software Requirements](#software-requirements)
  - [Developer Tools](#developer-tools)
- [Future Improvements](#future-improvements)

---

## Project Overview

**Presurgical Optimization Platform** is a full-stack web application designed to explore how perioperative clinical workflows can be modeled as:

- **Versioned backend data**
- **Structured, machine-readable rules**
- **Event-driven UI updates**

Instead of treating guidelines as static text, this system treats them as **versioned JSON-based instructions** that can be:
- audited
- updated
- published
- consumed by both humans and machines

---

## System Architecture

```

┌──────────────┐
│ Doctor UI    │◀──── WebSocket (guideline:updated)
└──────┬───────┘
│ REST APIs
┌──────▼───────┐
│ Next.js API  │
│ (Node.js)    │
├──────┬───────┤
│ Prisma ORM   │
│ PostgreSQL  │
└──────┬───────┘
│
┌──────▼────────────────┐
│ OpenAI + LangChain    │
│ Structured JSON Output│
└───────────────────────┘

```

---

## Project Structure

(Without: `node_modules`, `.env`, `*.lock`)

```

prisma/
└─ schema.prisma              # Data model & versioning

src/
├─ app/
│   ├─ api/
│   │   ├─ guidelines/        # Guideline CRUD + socket emit
│   │   ├─ doctor/            # Doctor data aggregation API
│   │   ├─ patients/          # Patient-facing APIs
│   │   ├─ openAI/            # LLM structured extraction
│   │
│   ├─ doctor/page.tsx        # Doctor dashboard (client)
│   ├─ patient/page.tsx       # Patient view
│
├─ lib/
│   ├─ prisma.ts              # Prisma client singleton
│   ├─ auth.ts                # Role-based auth helpers
│   ├─ session.ts             # In-memory session store
│   ├─ socket.ts              # Socket.IO server singleton
│   ├─ useGuidelineSocket.ts  # Client WebSocket hook
│
├─ pages/
│   └─ api/socket.ts          # Socket.IO server initialization

````

---

## Core Technical Design

### Data Modeling & Versioning

- Each **Surgery** can have multiple **SurgeryPlanVersions**
- Only one version is marked as **published** and exposed to patients
- Historical versions are preserved for traceability

Key ideas:
- `currentPublishedVersionId` acts as a **single source of truth**
- Instructions are stored as **JSON**, not rigid tables, to support evolving clinical logic

---

### LLM Integration (OpenAI + LangChain)

This project intentionally avoids free-form AI responses.

**Why LangChain?**
- Enforces **schema-validated outputs**
- Enables automation and downstream processing
- Prevents “hallucinated” fields

Flow:
1. Aggregate patient medication instructions from DB
2. Accept pill image + user hints
3. Send to OpenAI via LangChain
4. Validate output against strict JSON schema
5. Persist run metadata for auditability

All LLM runs are logged with:
- input metadata
- output JSON
- success / error state

---

### Real-time Update (WebSocket)

- **Socket.IO** is used for event-driven updates
- When a guideline is created or updated:
  - backend emits `guideline:updated`
  - doctor dashboard automatically refreshes data

This avoids manual refresh and demonstrates:
- backend-driven UI synchronization
- decoupled, event-based system design

---

## How to Run Locally

Clone the repository:

```bash
git clone <this-repo-url>
cd presurg
````

Install dependencies:

```bash
npm install
```

Create `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/db
OPENAI_API_KEY=your_openai_key
```

Run database migration:

```bash
npx prisma migrate dev
```

Start development server:

```bash
npm run dev
```

Open:
[http://localhost:3000](http://localhost:3000)

---

## For Developers

### Software Requirements

| Category | Tool               |
| -------- | ------------------ |
| Runtime  | Node.js 18+        |
| Backend  | Next.js API Routes |
| Database | PostgreSQL         |
| ORM      | Prisma             |
| AI       | OpenAI, LangChain  |
| Realtime | Socket.IO          |

---

### Developer Tools

* Visual Studio Code
* Prisma Studio
* Postman / curl
* pgAdmin / TablePlus

Recommended VSCode extensions:

* Prisma
* ESLint
* Prettier
* GitLens

---

## Future Improvements

* Replace in-memory sessions with Redis
* Add API contract tests
