import os
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
import uvicorn
from graph import graph
from langchain_core.messages import HumanMessage

from ai_sdk_stream import UIMessageStreamFormatter, encode_sse
from startup_graph import (
    StartupStressTestRequest,
    StartupStressTestResponse,
    StartupStressTestV2Request,
    StartupStressTestV2Response,
    run_startup_stress_test,
    run_startup_stress_test_v2,
    stream_startup_stress_test_v2,
)
app = FastAPI(
    title="Multi agent tutorial",
    version="1.0.0"
)

frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3001,http://127.0.0.1:3001",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["x-vercel-ai-ui-message-stream"],
)


class UIMessage(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    role: Literal["system", "user", "assistant"]
    parts: list[dict[str, Any]] = Field(default_factory=list)


class StartupStressTestV2StreamRequest(BaseModel):
    messages: list[UIMessage] = Field(min_length=1)
    startup: StartupStressTestV2Request


class ChatResponse(BaseModel):
    answer: str = Field(
        description="response from the model"
    )
    topics: list[str] = Field(
        description="topics of the response"
    )
    difficulty: Literal[
        "beginner",
        "intermediate",
        "advanced",
    ]
class ChatRequest(BaseModel):
    message: str = Field(
        min_length = 1,
        description="user message"
    )


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.get("/health")
def health_check():
    return {"status":"Server is running"}
    
@app.post("/chat")
def chat(request: ChatRequest):
    result = graph.invoke(
    {
        "messages": [
            HumanMessage(
                content=request.message
            )
        ]
    }
    )
    final_message = result["messages"][-1]
    print(result)
    return {"response": final_message.content}


@app.post("/startup/stress-test", response_model=StartupStressTestResponse)
def startup_stress_test(request: StartupStressTestRequest):
    try:
        return run_startup_stress_test(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/startup/stress-test/v2", response_model=StartupStressTestV2Response)
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


@app.post("/startup/stress-test/v2/stream")
async def startup_stress_test_v2_stream(request: StartupStressTestV2StreamRequest):
    return StreamingResponse(
        _stream_sse_events(request.startup),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "x-vercel-ai-ui-message-stream": "v1",
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
