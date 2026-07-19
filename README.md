# Startup Research Multi-Agent MVP

Evidence-backed startup idea stress testing with FastAPI, LangGraph, Tavily, Groq, and a Bun-powered Next.js client.

## What is included

- Existing blocking APIs remain available:
  - `POST /startup/stress-test`
  - `POST /startup/stress-test/v2`
- `POST /startup/stress-test/v2/stream` returns the AI SDK UI Message Stream Protocol over SSE.
- Eight Tavily research queries run with bounded concurrency.
- Seven independent specialists run in parallel after evidence collection, then join at one synthesizer.
- The frontend shows agent state, search/tool activity, source links, scores, errors, stop state, and streamed Markdown.

## Local development

Requirements: Python 3.14+, `uv`, and Bun 1.3+.

Create `.env` in the repository root:

```dotenv
GROQ_API_KEY=your-groq-key
TAVILY_API_KEY=your-tavily-key
# Optional free-tier-safe defaults. qwen/qwen3-32b is not available to
# this Groq account; qwen/qwen3.6-27b is the available Qwen alternative.
FRONTEND_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
GROQ_SPECIALIST_MODEL=qwen/qwen3.6-27b
GROQ_SYNTHESIS_MODEL=openai/gpt-oss-120b
GROQ_SPECIALIST_MAX_TOKENS=1800
GROQ_SYNTHESIS_MAX_TOKENS=1800
GROQ_SPECIALIST_CONCURRENCY=1
GROQ_LLM_MAX_ATTEMPTS=3

# Optional GPT-OSS upgrade: it uses Groq strict JSON-schema output,
# but needs more TPM headroom.
# GROQ_SYNTHESIS_MODEL=openai/gpt-oss-120b
```

Start the backend on port 3000:

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

Start the frontend on port 3001 using Bun only:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3001>. To use another backend URL, set `NEXT_PUBLIC_API_BASE_URL` before starting Next.js.

## Frontend research UX

- The live research view shows all seven specialists immediately. Agents that have not received evidence yet appear as queued, then transition through running, completed, or failed states as lifecycle events arrive.
- Search activity, query purpose, result counts, source links, agent progress, and streamed Markdown update in place while the run is active.
- Active runs use a calm live pulse indicator instead of a continuously spinning loader.
- Because runs are not persisted, the Back and Stop actions show a styled confirmation dialog explaining that the current progress and report will be lost. Confirming Back returns to the landing page; confirming Stop aborts the stream.

## Streaming request contract

```json
{
  "messages": [
    {
      "id": "user-1",
      "role": "user",
      "parts": [{ "type": "text", "text": "Stress-test my startup" }]
    }
  ],
  "startup": {
    "idea": "AI copilot for small accounting firms",
    "target_customer": "CPA firms with 5-20 employees",
    "geography": "United States"
  }
}
```

The response uses `Content-Type: text/event-stream` and `x-vercel-ai-ui-message-stream: v1`. It emits AI SDK `start`, step, user-visible reasoning, tool, `data-*`, source, text, error, and finish parts, followed by `data: [DONE]`.

## Validation

```bash
uv run python -m unittest tests/test_startup_endpoint.py -v
cd frontend
bun run typecheck
bun run build
```

The terminal client can inspect the stream without a browser:

```bash
uv run python scripts/stream_startup_test.py
```

## Architecture notes

The graph keeps raw search evidence out of global conversational history. Evidence is normalized, bounded, and routed by research topic to relevant specialists. Specialist output dictionaries use a LangGraph reducer, allowing safe fan-out/fan-in. Dimension scores have explicit owners, and synthesis receives compact structured specialist output plus a source digest rather than all raw evidence.

Search failures are tolerated when other searches succeed. Specialist failures emit a failed lifecycle event and produce an empty fallback insight so remaining specialists can still produce a report. The stream is one adapter over `startup_graph_v2.astream(..., stream_mode=["updates", "custom"])`; blocking and streaming no longer maintain separate orchestration flows.

## MVP limitations

- The final Markdown is generated as one structured synthesis result and then chunked; provider token streaming is not yet exposed.
- In-flight synchronous provider calls may not cancel immediately after the browser aborts.
- In-memory run state is not persisted: refreshing, leaving, or stopping a run loses its progress and report; auth and production telemetry are also intentionally outside this MVP.
