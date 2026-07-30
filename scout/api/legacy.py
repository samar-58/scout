from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, ConfigDict, Field

from scout.legacy.chat_graph import graph
from scout.research.startup_graph import (
    StartupStressTestRequest,
    StartupStressTestResponse,
    StartupStressTestV2Request,
    StartupStressTestV2Response,
    run_startup_stress_test,
    run_startup_stress_test_v2,
    stream_startup_stress_test_v2,
)
from scout.streaming.ai_sdk import UIMessageStreamFormatter, encode_sse

router = APIRouter(tags=["compatibility"])


class UIMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    role: Literal["system", "user", "assistant"]
    parts: list[dict[str, Any]] = Field(default_factory=list)


class StartupStressTestV2StreamRequest(BaseModel):
    messages: list[UIMessage] = Field(min_length=1)
    startup: StartupStressTestV2Request


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, description="User message")


@router.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Scout API"}


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "Server is running"}


@router.post("/chat")
def chat(request: ChatRequest) -> dict[str, str]:
    result = graph.invoke({"messages": [HumanMessage(content=request.message)]})
    return {"response": result["messages"][-1].content}


@router.post("/startup/stress-test", response_model=StartupStressTestResponse)
def startup_stress_test(request: StartupStressTestRequest):
    try:
        return run_startup_stress_test(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/startup/stress-test/v2", response_model=StartupStressTestV2Response)
def startup_stress_test_v2(request: StartupStressTestV2Request):
    try:
        return run_startup_stress_test_v2(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def _stream_sse_events(request: StartupStressTestV2Request):
    formatter = UIMessageStreamFormatter()
    async for event in stream_startup_stress_test_v2(request):
        for part in formatter.translate(event):
            yield encode_sse(part)
    yield "data: [DONE]\n\n"


@router.post("/startup/stress-test/v2/stream")
def startup_stress_test_v2_stream(
    request: StartupStressTestV2StreamRequest,
) -> StreamingResponse:
    return StreamingResponse(
        _stream_sse_events(request.startup),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
        },
    )
