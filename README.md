# Scout — Startup Research Multi-Agent App

Scout stress-tests a startup idea with live web research, specialist analysis, and an evidence-backed report. It is a full-stack application with a FastAPI/LangGraph backend and a Bun-powered Next.js frontend.

## Product flow

Scout runs one loop: **evidence → assumption → experiment → result → decision → updated thesis.**

1. Enter an idea and as much context as available in the Scout composer.
2. Scout runs eight focused Tavily searches covering market, timing, competitors, customer pain, go-to-market, and defensibility.
3. Seven specialist agents receive the evidence relevant to their role and produce structured insights.
4. A synthesis agent combines those insights and source evidence into a scored report.
5. Completing a run materializes first-class records: claims, evidence, risk-ranked assumptions, suggested experiments, and the project's first thesis version.
6. The founder accepts, rewrites, or rejects each assumption, then asks Scout to **build a validation sprint** for the riskiest open ones.
7. The founder runs each experiment outside Scout and records metrics, quotes, surprises, and constraints against it.
8. Scout reviews the observations against the experiment's own thresholds and proposes a decision with supporting and contradicting evidence.
9. Confirming a decision — and only that — writes a new immutable thesis version. Rejecting it leaves the thesis untouched.
10. The project timeline keeps every run, experiment, observation, decision, and thesis change in one ordered history.

The seven specialists are Market Analyst, Competitor Analyst, Customer Analyst, GTM Agent, VC Partner, Moat Agent, and Experiment Agent. The report scores market, competition, distribution, execution, timing, and monetization, plus an overall score.

Agents propose; application code commits. Every AI workflow returns a typed proposal, the persistence service validates ownership and state transitions, and the founder confirms anything that changes the canonical thesis.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Bun
- **Backend:** FastAPI, Uvicorn, Python 3.14+, LangGraph, LangChain
- **Research:** Tavily advanced search, normalized and URL-deduplicated evidence
- **Models:** Groq via `langchain-groq`, with configurable specialist and synthesis models
- **Orchestration:** Inngest durable functions with independently retryable research stages
- **Transport:** Ordered event polling for durable runs; AI SDK SSE retained for compatibility
- **Authentication:** Clerk for Next.js sessions and backend bearer-token verification
- **Persistence:** PostgreSQL through SQLAlchemy and Alembic

## Local development

Requirements: Python 3.14+, `uv`, Bun, PostgreSQL, a Clerk application, and API keys for Groq and Tavily.

### 1. Configure the backend

Create the root environment file from the safe template:

```bash
cp .env.example .env
```

Set the required service keys, database URL, Clerk backend key, and allowed browser origins:

```dotenv
GROQ_API_KEY=your-groq-key
TAVILY_API_KEY=your-tavily-key
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/scout
INNGEST_APP_ID=scout
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=signkey-prod-your-inngest-signing-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
CLERK_AUTHORIZED_PARTIES=http://localhost:3001,http://127.0.0.1:3001
FRONTEND_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
```

`FRONTEND_ORIGINS` is a comma-separated list. Add every frontend origin used in deployment. Optional backend settings include:

```dotenv
GROQ_SPECIALIST_MODEL=qwen/qwen3.6-27b
GROQ_SYNTHESIS_MODEL=openai/gpt-oss-120b
GROQ_SPECIALIST_MAX_TOKENS=1800
GROQ_SYNTHESIS_MAX_TOKENS=1800
GROQ_SPECIALIST_CONCURRENCY=1
GROQ_LLM_MAX_ATTEMPTS=3
```

The backend loads `.env` at startup. Never commit `.env` or API keys.

### 2. Configure the frontend

Next.js loads browser-visible environment variables from the `frontend/` directory, so create the frontend file separately:

```bash
cp frontend/.env.example frontend/.env.local
```

Set the backend URL and Clerk keys used by Next.js:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your-clerk-publishable-key
CLERK_SECRET_KEY=sk_test_your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app
```

`NEXT_PUBLIC_API_BASE_URL` is the frontend-to-backend URL. `FRONTEND_ORIGINS` is the backend-to-frontend CORS allowlist; they should describe the two sides of the same deployment.

### 3. Start both applications

Start the backend on port 3000:

```bash
uv sync
uv run alembic upgrade head
INNGEST_DEV=1 uv run uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

In another terminal, start Inngest's local Dev Server and point it at the FastAPI handler:

```bash
inngest dev -u http://localhost:3000/api/inngest
```

In a third terminal, install and start the frontend on port 3001:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3001>. Restart Next.js after changing `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, because public Next.js environment values are embedded at build/dev-server startup.

## Frontend experience

- **Landing page:** explains the workflow and introduces the specialist team before the user opens Scout.
- **Application bar:** one shared bar across the composer, live run, projects list, and saved project — brand, breadcrumbs, run status, actions, theme control, and the Clerk account menu. Clerk's sign-in, sign-up, and account popover are themed to the Scout palette instead of Clerk's defaults.
- **Auth pages:** split-screen sign-in and sign-up. An ink narrative panel carries the workflow, the specialist roster, and headline numbers; the form column is all that renders on small screens.
- **Startup composer:** captures the idea plus optional problem, target customer, geography, business model, current alternatives, customer pain, proposed solution, GTM constraints, pricing hypothesis, stage, traction, team context, and known competitors. Pasting a long startup brief into an empty idea field securely extracts those fields, preserves context already entered, and leaves the form open for review before research starts. Signed-in users also get a "continue where you left off" strip of recent saved projects.
- **Live research:** shows all seven specialists immediately as queued placeholders. They transition through running, completed, or failed states as lifecycle events arrive. Search cards show purpose, query, result count, timing, errors, and source links.
- **Progress feedback:** the main active-run indicator uses a calm live pulse; status counters show agent and search progress without blocking the page.
- **Report view:** renders streamed Markdown with score breakdown, navigable headings, verified source links, Copy, and Download Markdown actions. The layout is fully mobile responsive: the score breakdown and rationale reflow to a single column on small screens, headings scale down, wide tables scroll horizontally within a bordered container, and the research-activity panel collapses so the report stays front and centre.
- **Run controls:** Back and Stop warn before interrupting active research. Projects, ordered events, stage-level graph checkpoints, and completed report versions are persisted. Failed or cancelled runs can resume from the latest completed stage without repeating saved searches or specialist work.
- **Validation workspace:** each project opens on **Validate**, the persisted loop. It shows the versioned thesis, risk-ranked assumptions with accept/rewrite/reject and status controls, a **Build my validation sprint** action, experiments grouped by lifecycle state with inline observation entry, decisions awaiting confirmation, and the full learning timeline. Canvas and Runs remain as separate tabs.
- **Saved projects:** `/projects` lists every owned workspace as a card carrying its verdict score ring, six dimension bars, run status, run and version counts, with a portfolio stats strip, text search, and status filters. Each project page opens immutable report versions in the existing startup canvas through a version switcher, and shows run history as a timeline with per-run phase progress (evidence → specialists → synthesis) and inline resume.
- **Timestamps:** run and version times render in the viewer's locale, swapped in after mount so server-rendered markup stays locale-independent.

## Backend API

### Health and legacy routes

- `GET /` — basic API response.
- `GET /health` — health check.
- `POST /chat` — legacy chat route retained for compatibility.
- `POST /startup/stress-test` — blocking v1 startup report.
- `POST /startup/stress-test/v2` — blocking structured startup report.

### Authenticated persistence routes

All `/api/*` routes require a Clerk session token in `Authorization: Bearer <token>`. Resources are always filtered by the token's `sub` claim.

- `GET /api/me` — current authenticated identity.
- `POST/GET /api/projects` — create or list owned projects.
- `GET/PATCH/DELETE /api/projects/{project_id}` — read, update, or archive an owned project.
- `POST/GET /api/projects/{project_id}/runs` — create or list research runs.
- `POST /api/runs` — create and dispatch a durable Inngest run; returns the queued run immediately.
- `POST /api/runs/{run_id}/resume` — dispatch a failed or cancelled run from its latest completed graph stage.
- `POST /api/runs/stream` — compatibility path that creates and executes a request-coupled persisted SSE run.
- `GET /api/runs/{run_id}` and `POST /api/runs/{run_id}/cancel` — inspect or cancel an owned run and its Inngest execution.
- `POST /api/runs/{run_id}/resume/stream` — compatibility path for request-coupled resume.
- `GET /api/runs/{run_id}/events?after=N` — replay ordered persisted domain events.
- `GET /api/projects/{project_id}/reports` — list immutable report versions.
- `POST /api/startup/extract` — extract composer fields from a pasted startup brief.

### Validation loop routes

- `GET /api/projects/{project_id}/assumptions` — risk-ranked assumptions materialized from completed runs.
- `PATCH /api/assumptions/{assumption_id}` — accept, rewrite, reject, restatus, or annotate one assumption. Rewrites keep Scout's original wording in provenance.
- `GET /api/projects/{project_id}/claims` and `GET /api/projects/{project_id}/evidence` — source-backed claims and deduplicated evidence.
- `POST /api/projects/{project_id}/sprint` — propose and commit a validation sprint for up to three open assumptions.
- `GET /api/projects/{project_id}/experiments` — experiments with their linked assumptions and observations.
- `PATCH /api/experiments/{experiment_id}` — edit an experiment or move it through `suggested → planned → running → completed`, or abandon it.
- `POST/GET /api/experiments/{experiment_id}/observations` — record or list metrics, quotes, notes, surprises, and constraints.
- `POST /api/experiments/{experiment_id}/review` — review recorded observations against the experiment's thresholds and propose a decision.
- `GET /api/projects/{project_id}/decisions` — proposed, confirmed, and rejected decisions with their evidence.
- `POST /api/decisions/{decision_id}/confirm` — confirm a decision; only this creates a new thesis version.
- `POST /api/decisions/{decision_id}/reject` — reject a decision and leave the thesis unchanged.
- `GET /api/projects/{project_id}/thesis` — immutable thesis versions, newest first.
- `GET /api/projects/{project_id}/timeline` — the project's learning history across runs, reports, experiments, observations, decisions, and thesis changes.

### Legacy streaming route

`POST /startup/stress-test/v2/stream` remains available for compatibility. The authenticated Next.js client dispatches `POST /api/runs`, then polls `GET /api/runs/{run_id}/events?after=N` and `GET /api/runs/{run_id}` while Inngest executes independently. The compatibility `/api/runs/stream` route wraps the same graph in a request-coupled persisted stream. Streaming routes accept a UI-message envelope with a non-empty `messages` array and a nested `startup` payload:

```json
{
  "messages": [
    {
      "id": "user-1",
      "role": "user",
      "parts": [
        { "type": "text", "text": "Stress-test my startup idea" }
      ]
    }
  ],
  "startup": {
    "idea": "AI copilot for small accounting firms",
    "problem": "Month-end close work is slow and repetitive.",
    "target_customer": "CPA firms with 5-20 employees",
    "geography": "United States",
    "business_model": "SaaS subscription",
    "current_alternatives": ["Spreadsheets", "QuickBooks", "Manual work"],
    "customer_pain": "Accountants spend too much time on repetitive work.",
    "proposed_solution": "An assistant connected to the firm's accounting workflow.",
    "gtm_constraints": "Founder-led outbound for the first three months.",
    "pricing_hypothesis": "$79 per user per month",
    "stage": "idea",
    "traction": "No users yet.",
    "team_context": "Solo technical founder.",
    "known_competitors": ["Botkeeper", "Digits"]
  }
}
```

Only `startup.idea` is required; the remaining startup fields are optional and improve query and specialist context. The authenticated `/api/runs/stream` variant additionally requires an owned `project_id` at the top level. The response is `text/event-stream` with `x-vercel-ai-ui-message-stream: v1` and ends with `data: [DONE]`.

The stream includes observable UI events such as:

- AI SDK lifecycle parts: `start`, `start-step`, `finish-step`, and `finish`.
- Short user-visible progress summaries in reasoning parts. These are status updates, never model chain-of-thought.
- Search tool input/output parts and `data-search` events.
- `data-agent` lifecycle events for specialist status and findings.
- `data-score`, `source-url`, `text-*`, `data-report`, and `error` parts.

## Architecture

Backend code lives under the `scout` package: `api/` contains authenticated and compatibility routers, `core/` owns auth/configuration, `persistence/` owns SQLAlchemy data access, `research/` contains LangGraph orchestration, `workflows/` owns Inngest durable execution, `streaming/` adapts domain events to AI SDK SSE, and `legacy/` isolates the tutorial chat workflow. Root `main.py` remains the stable `uvicorn main:app` entry point, and `/api/inngest` serves signed Inngest discovery and execution requests.

The durable workflow stores no large research state in Inngest step outputs. Every step reloads canonical state by owned `run_id`; evidence, seven parallel specialist steps, and synthesis are independently memoized. Parallel specialist deltas merge under a PostgreSQL row lock, ordered events receive database-backed sequences, and report creation plus terminal events commit atomically. Duplicate dispatches and retried steps are idempotent.

The validation loop is separated the same way. `persistence/loop_materializer.py` is pure and deterministic: it turns a completed report into claims, evidence, ranked assumptions, suggested experiments, and the initial thesis, and it runs inside the same transaction that writes the report artifact, so materialization is atomic and idempotent per run. `research/loop_workflows.py` holds the only two model calls in the loop, and both return proposals — a validation sprint or an experiment review — that `api/loop.py` maps back onto owned records before the persistence service commits them. Experiment lifecycle moves go through an explicit transition table, and a thesis version is created only by a founder-confirmed decision.

The v2 graph follows a bounded research pipeline:

1. Build eight topic-specific search queries from the startup context.
2. Run Tavily searches with up to four search workers, four results per query, normalized evidence, and URL-deduplicated sources.
3. Continue when some searches fail, provided at least one search succeeds; fail the run if no usable search evidence remains.
4. Fan out evidence to the seven role-specific specialists using topic routing. Model-call concurrency is configurable with `GROQ_SPECIALIST_CONCURRENCY` and defaults to `1` for provider-friendly behavior.
5. Reduce specialist outputs into a compact synthesis context and source digest.
6. Generate the final structured report, deterministic score summary, verified sources, and Markdown report.
7. Adapt the same graph events to either blocking API responses or the AI SDK SSE stream; the blocking and streaming paths do not maintain separate orchestration logic.

Specialist failures emit failed lifecycle events and empty fallback insights so the remaining specialists can still contribute. Blocking failures return HTTP 503; streaming failures are represented as protocol `error` and `finish` parts.

## Terminal stream client

`scripts/stream_startup_test.py` exercises the streaming endpoint without a browser. It prints progress, search, agent, score, source, report, and error events, then writes the completed report and reconstructed Markdown to `startup_stream_report.json` by default.

```bash
uv run python scripts/stream_startup_test.py
```

Useful options:

```bash
uv run python scripts/stream_startup_test.py \
  --url http://localhost:3000/startup/stress-test/v2/stream \
  --payload path/to/request.json \
  --output path/to/report.json
```

## Validation

Run the backend tests:

```bash
uv run python -m unittest discover -s tests -v
```

Run the frontend checks from `frontend/`:

```bash
bun run typecheck
bun run build
```

The test suite covers request validation, blocking and streaming responses, SSE ordering, protocol errors, CORS behavior, Clerk identity extraction, missing-auth rejection, ownership isolation, event/report persistence, artifact versioning, source normalization, specialist fan-out, synthesis, score ownership, report generation, durable Inngest step ordering and registration, brief extraction, loop materialization and ranking, assumption review provenance, sprint commitment, experiment transitions, observation recording, review-to-decision flow, thesis versioning, and timeline assembly.

## Current limitations

- The provider does not expose token-by-token model streaming. The completed structured report is generated after synthesis and its Markdown is emitted in 500-character SSE chunks.
- In-flight synchronous provider calls may not stop immediately after cancellation, but cancelled runs reject later stage commits.
- Experiments are executed outside Scout; the product records their design, observations, results, and decisions rather than running them.
- Recurring execution-cycle memos and evidence-grounded questions over project history are not implemented yet.
- Distributed rate limiting and production telemetry are not implemented.

### Vercel and Inngest production deployment

Vercel detects the root `main.py` FastAPI `app` as the Python function entrypoint. `vercel.json` gives each independently durable Inngest invocation up to 300 seconds; Inngest's 30-minute finish timeout covers the complete multi-step function, not one Vercel request.

For the backend Vercel project, set `DATABASE_URL`, provider keys, Clerk settings, `INNGEST_APP_ID=scout`, `INNGEST_EVENT_KEY`, and `INNGEST_SIGNING_KEY`. Do not set `INNGEST_DEV` in production. After deployment, sync `https://<backend-domain>/api/inngest` in Inngest Cloud. The endpoint derives its public origin from the signed request, while `main.py` remains the local `uvicorn main:app` entrypoint.
