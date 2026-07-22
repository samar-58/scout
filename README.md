# Scout — Startup Research Multi-Agent App

Scout stress-tests a startup idea with live web research, specialist analysis, and an evidence-backed report. It is a full-stack application with a FastAPI/LangGraph backend and a Bun-powered Next.js frontend.

## Product flow

1. Enter an idea and as much context as available in the Scout composer.
2. Scout runs eight focused Tavily searches covering market, timing, competitors, customer pain, go-to-market, and defensibility.
3. Seven specialist agents receive the evidence relevant to their role and produce structured insights.
4. A synthesis agent combines those insights and source evidence into a scored report.
5. The frontend displays live activity, the final score breakdown, Markdown report, table of contents, verified sources, and Copy/Download actions.

The seven specialists are Market Analyst, Competitor Analyst, Customer Analyst, GTM Agent, VC Partner, Moat Agent, and Experiment Agent. The report scores market, competition, distribution, execution, timing, and monetization, plus an overall score.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Bun
- **Backend:** FastAPI, Uvicorn, Python 3.14+, LangGraph, LangChain
- **Research:** Tavily advanced search, normalized and URL-deduplicated evidence
- **Models:** Groq via `langchain-groq`, with configurable specialist and synthesis models
- **Transport:** Server-Sent Events using the AI SDK UI Message Stream Protocol

## Local development

Requirements: Python 3.14+, `uv`, Bun, and API keys for Groq and Tavily.

### 1. Configure the backend

Create the root environment file from the safe template:

```bash
cp .env.example .env
```

Set the required keys and the browser origins allowed by CORS:

```dotenv
GROQ_API_KEY=your-groq-key
TAVILY_API_KEY=your-tavily-key
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

Set the backend URL that the browser should call:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_BASE_URL` is the frontend-to-backend URL. `FRONTEND_ORIGINS` is the backend-to-frontend CORS allowlist; they should describe the two sides of the same deployment.

### 3. Start both applications

Start the backend on port 3000:

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

In a second terminal, install and start the frontend on port 3001:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3001>. Restart Next.js after changing `NEXT_PUBLIC_API_BASE_URL`, because public Next.js environment values are embedded at build/dev-server startup.

## Frontend experience

- **Landing page:** explains the workflow and introduces the specialist team before the user opens Scout.
- **Startup composer:** captures the idea plus optional problem, target customer, geography, business model, current alternatives, customer pain, proposed solution, GTM constraints, pricing hypothesis, stage, traction, team context, and known competitors.
- **Live research:** shows all seven specialists immediately as queued placeholders. They transition through running, completed, or failed states as lifecycle events arrive. Search cards show purpose, query, result count, timing, errors, and source links.
- **Progress feedback:** the main active-run indicator uses a calm live pulse; status counters show agent and search progress without blocking the page.
- **Report view:** renders streamed Markdown with score breakdown, navigable headings, verified source links, Copy, and Download Markdown actions. The layout is fully mobile responsive: the score breakdown and rationale reflow to a single column on small screens, headings scale down, wide tables scroll horizontally within a bordered container, and the research-activity panel collapses so the report stays front and centre.
- **Run controls:** Back and Stop open a styled warning dialog because runs are not persisted. The dialog explains that leaving or stopping loses the current progress/report; confirming Back returns home and confirming Stop aborts the stream.

## Backend API

### Health and legacy routes

- `GET /` — basic API response.
- `GET /health` — health check.
- `POST /chat` — legacy chat route retained for compatibility.
- `POST /startup/stress-test` — blocking v1 startup report.
- `POST /startup/stress-test/v2` — blocking structured startup report.

### Streaming route

`POST /startup/stress-test/v2/stream` is the route used by the Next.js client. It accepts a UI-message envelope with a non-empty `messages` array and a nested `startup` payload:

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

Only `startup.idea` is required; the remaining startup fields are optional and improve query and specialist context. The response is `text/event-stream` with `x-vercel-ai-ui-message-stream: v1` and ends with `data: [DONE]`.

The stream includes observable UI events such as:

- AI SDK lifecycle parts: `start`, `start-step`, `finish-step`, and `finish`.
- Short user-visible progress summaries in reasoning parts. These are status updates, never model chain-of-thought.
- Search tool input/output parts and `data-search` events.
- `data-agent` lifecycle events for specialist status and findings.
- `data-score`, `source-url`, `text-*`, `data-report`, and `error` parts.

## Architecture

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
uv run python -m unittest tests/test_startup_endpoint.py -v
```

Run the frontend checks from `frontend/`:

```bash
bun run typecheck
bun run build
```

The test suite covers request validation, blocking and streaming responses, SSE ordering, protocol errors, CORS behavior, search failure handling, source normalization, specialist fan-out, synthesis, score ownership, and report generation.

## Current limitations

- The provider does not expose token-by-token model streaming. The completed structured report is generated after synthesis and its Markdown is emitted in 500-character SSE chunks.
- In-flight synchronous provider calls may not stop immediately after the browser aborts the stream.
- Run state is in memory only. Refreshing, leaving, stopping, or starting a new run loses the current progress/report.
- Authentication, persistent storage, distributed rate limiting, and production telemetry are outside this application.
