import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path


DEFAULT_PAYLOAD = {
    "idea": "AI copilot for small accounting firms",
    "problem": (
        "Small CPA firms waste hours categorizing transactions, preparing "
        "month-end close notes, and writing client explanations."
    ),
    "target_customer": "CPA firms with 5-20 employees serving SMB clients",
    "geography": "United States",
    "business_model": "SaaS subscription",
    "current_alternatives": [
        "QuickBooks",
        "Xero",
        "manual spreadsheets",
        "ChatGPT",
        "Botkeeper",
        "Digits",
    ],
    "customer_pain": (
        "Accountants spend too much time on repetitive reconciliation, "
        "categorization, and client communication work."
    ),
    "proposed_solution": (
        "A QuickBooks-connected AI assistant that drafts reconciliations, "
        "flags anomalies, and generates client-ready explanations."
    ),
    "gtm_constraints": "Founder-led outbound only, no paid ads for the first 3 months.",
    "pricing_hypothesis": "$79 per user per month",
    "stage": "idea",
    "traction": "No users yet, only informal conversations with two accountants.",
    "team_context": "Solo technical founder with prior fintech engineering experience.",
    "known_competitors": [
        "Digits",
        "Botkeeper",
        "Zeni",
        "QuickBooks Assist",
    ],
}


def parse_args():
    parser = argparse.ArgumentParser(
        description="Stream the startup stress-test v2 SSE endpoint in the terminal."
    )
    parser.add_argument(
        "--url",
        default="http://localhost:3000/startup/stress-test/v2/stream",
        help="Streaming endpoint URL.",
    )
    parser.add_argument(
        "--payload",
        help="Path to a JSON request payload. Defaults to an accounting startup sample.",
    )
    parser.add_argument(
        "--output",
        default="startup_stream_report.json",
        help="Where to save the final streamed report JSON.",
    )
    return parser.parse_args()


def load_payload(path):
    if not path:
        return DEFAULT_PAYLOAD
    return json.loads(Path(path).read_text())


def render_event(event):
    event_type = event.get("type")

    if event_type == "reasoning-delta":
        print(f"[progress] {event.get('delta', '').strip()}")
    elif event_type == "data-search":
        search = event.get("data", {})
        if search.get("type") == "search_start":
            print(
                f"[search {search.get('index')}/{search.get('total')}] "
                f"{search.get('purpose')}\n  query: {search.get('query')}"
            )
        elif search.get("type") == "search_end":
            print(
                f"[search {search.get('index')}] {search.get('status')} in "
                f"{search.get('elapsed_ms')}ms, {search.get('result_count', 0)} results"
            )
    elif event_type == "data-agent":
        agent = event.get("data", {})
        print(
            f"[agent] {agent.get('display_name')}: {agent.get('status')}"
            f" — {agent.get('message', '')}"
        )
    elif event_type == "data-score":
        score = event.get("data", {})
        print(f"[score] overall {score.get('scores', {}).get('overall')}/100")
    elif event_type == "source-url":
        print(f"[source] {event.get('title') or event.get('url')}: {event.get('url')}")
    elif event_type == "text-delta":
        sys.stdout.write(event.get("delta", ""))
        sys.stdout.flush()
    elif event_type == "error":
        print(f"\n[error] {event.get('errorText')}")


def stream_events(url, payload, output_path):
    envelope = {
        "messages": [
            {
                "id": "terminal-user-1",
                "role": "user",
                "parts": [
                    {
                        "type": "text",
                        "text": f"Stress-test this startup idea: {payload['idea']}",
                    }
                ],
            }
        ],
        "startup": payload,
    }
    data = json.dumps(envelope).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        },
        method="POST",
    )

    final_report = None
    markdown_chunks = []
    with urllib.request.urlopen(request, timeout=None) as response:
        for raw_line in response:
            line = raw_line.decode("utf-8").strip()
            if not line or not line.startswith("data: "):
                continue

            payload_text = line.removeprefix("data: ")
            if payload_text == "[DONE]":
                print("\n[stream] done")
                break

            event = json.loads(payload_text)
            render_event(event)
            if event.get("type") == "text-delta":
                markdown_chunks.append(event.get("delta", ""))
            if event.get("type") == "data-report":
                report_data = event.get("data", {})
                if report_data.get("status") == "completed":
                    final_report = report_data.get("report")

    if final_report:
        final_report["markdown_report"] = "".join(markdown_chunks)
        Path(output_path).write_text(json.dumps(final_report, indent=2))
        print(f"[file] saved final report to {output_path}")


def main():
    args = parse_args()
    payload = load_payload(args.payload)
    try:
        stream_events(args.url, payload, args.output)
    except urllib.error.URLError as exc:
        raise SystemExit(f"Could not connect to {args.url}: {exc}") from exc


if __name__ == "__main__":
    main()
