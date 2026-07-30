"""AI SDK UI Message Stream Protocol adapter.

The formatter translates observable domain progress into public UI parts. Reasoning
parts contain short status summaries only; they never expose model chain-of-thought.
"""

from __future__ import annotations

import json
from typing import Any
from uuid import uuid4


def encode_sse(part: dict[str, Any]) -> str:
    return f"data: {json.dumps(part, default=str, separators=(',', ':'))}\n\n"


class UIMessageStreamFormatter:
    def __init__(self, message_id: str | None = None) -> None:
        self.message_id = message_id or f"msg_{uuid4().hex}"
        self.reasoning_id = f"reasoning_{uuid4().hex}"
        self.text_id = f"text_{uuid4().hex}"
        self.started = False
        self.reasoning_open = False
        self.text_open = False
        self.finished = False

    def translate(self, event: dict[str, Any]) -> list[dict[str, Any]]:
        event_type = event.get("type")
        if event_type == "run_start":
            self.started = True
            self.reasoning_open = True
            return [
                {"type": "start", "messageId": self.message_id},
                {"type": "start-step"},
                {"type": "reasoning-start", "id": self.reasoning_id},
                self._reasoning_delta(event.get("message", "Research started.")),
            ]

        if event_type == "search_start":
            index = event["index"]
            tool_call_id = f"tavily-search-{index}"
            return [
                {
                    "type": "tool-input-available",
                    "toolCallId": tool_call_id,
                    "toolName": "tavilySearch",
                    "input": {
                        "query": event.get("query"),
                        "purpose": event.get("purpose"),
                    },
                },
                {
                    "type": "data-search",
                    "id": f"search-{index}",
                    "data": event,
                },
                self._reasoning_delta(
                    f"Searching {event.get('purpose', 'independent evidence')}."
                ),
            ]

        if event_type == "search_end":
            index = event["index"]
            output = {
                "status": event.get("status", "completed"),
                "resultCount": event.get("result_count", 0),
                "topResults": event.get("top_results", []),
                "elapsedMs": event.get("elapsed_ms"),
            }
            if event.get("error"):
                output["error"] = event["error"]
            return [
                {
                    "type": "tool-output-available",
                    "toolCallId": f"tavily-search-{index}",
                    "output": output,
                },
                {
                    "type": "data-search",
                    "id": f"search-{index}",
                    "data": event,
                },
                self._reasoning_delta(
                    f"Search {index} {event.get('status', 'completed')} with "
                    f"{event.get('result_count', 0)} results."
                ),
            ]

        if event_type == "evidence_ready":
            return [
                {
                    "type": "data-search",
                    "id": "search-summary",
                    "data": event,
                },
                self._reasoning_delta(
                    f"Evidence ready from {event.get('search_count', 0)} searches."
                ),
            ]

        if event_type == "agent_status":
            parts = [
                {
                    "type": "data-agent",
                    "id": f"agent-{event.get('agent', 'unknown')}",
                    "data": event,
                }
            ]
            status = event.get("status")
            if status in {"running", "completed", "failed"}:
                parts.append(
                    self._reasoning_delta(
                        event.get("message")
                        or f"{event.get('display_name', 'Agent')} is {status}."
                    )
                )
            return parts

        if event_type == "score":
            return [{"type": "data-score", "id": "score", "data": event}]

        if event_type == "source":
            source = event.get("source", {})
            part: dict[str, Any] = {
                "type": "source-url",
                "sourceId": source.get("url") or f"source-{event.get('index')}",
                "url": source.get("url", ""),
            }
            if source.get("title"):
                part["title"] = source["title"]
            return [part]

        if event_type == "report_delta":
            parts = self._begin_text()
            parts.append(
                {
                    "type": "text-delta",
                    "id": self.text_id,
                    "delta": event.get("delta", ""),
                }
            )
            return parts

        if event_type == "run_end":
            parts = self._close_content()
            report = dict(event.get("report") or {})
            report.pop("markdown_report", None)
            parts.extend(
                [
                    {
                        "type": "data-report",
                        "id": "report",
                        "data": {
                            "status": "completed",
                            "elapsed_ms": event.get("elapsed_ms"),
                            "report": report,
                        },
                    },
                    {"type": "finish-step"},
                    {"type": "finish"},
                ]
            )
            self.finished = True
            return parts

        if event_type == "error":
            parts = self._close_content()
            parts.extend(
                [
                    {
                        "type": "data-report",
                        "id": "report",
                        "data": {
                            "status": "failed",
                            "elapsed_ms": event.get("elapsed_ms"),
                        },
                    },
                    {
                        "type": "error",
                        "errorText": event.get("message") or "Startup research failed.",
                    },
                    {"type": "finish-step"},
                    {"type": "finish"},
                ]
            )
            self.finished = True
            return parts

        return []

    def _reasoning_delta(self, message: str) -> dict[str, Any]:
        return {
            "type": "reasoning-delta",
            "id": self.reasoning_id,
            "delta": f"{message}\n",
        }

    def _begin_text(self) -> list[dict[str, Any]]:
        parts: list[dict[str, Any]] = []
        if self.reasoning_open:
            parts.append({"type": "reasoning-end", "id": self.reasoning_id})
            self.reasoning_open = False
        if not self.text_open:
            parts.append({"type": "text-start", "id": self.text_id})
            self.text_open = True
        return parts

    def _close_content(self) -> list[dict[str, Any]]:
        parts: list[dict[str, Any]] = []
        if self.reasoning_open:
            parts.append({"type": "reasoning-end", "id": self.reasoning_id})
            self.reasoning_open = False
        if self.text_open:
            parts.append({"type": "text-end", "id": self.text_id})
            self.text_open = False
        return parts
