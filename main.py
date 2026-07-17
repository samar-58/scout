from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
from llm import llm
from typing import Literal
from langchain_core.prompts import ChatPromptTemplate
from graph import graph
from langchain_core.messages import HumanMessage
from startup_graph import (
    StartupStressTestRequest,
    StartupStressTestResponse,
    run_startup_stress_test,
)
app = FastAPI(
    title="Multi agent tutorial",
    version="1.0.0"
)

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
class MultiplicationAnswer(BaseModel):
    answer: int

class ChatRequest(BaseModel):
    message: str = Field(
        min_length = 1,
        description="user message"
    )

structured_llm = llm.with_structured_output(MultiplicationAnswer)


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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
