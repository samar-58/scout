from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn
from llm import llm
from typing import Literal
from langchain_core.prompts import ChatPromptTemplate
from graph import graph
from langchain_core.messages import HumanMessage
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

prompt = ChatPromptTemplate.from_messages(    [
        (
            "system",
            """
            You are a helpful AI teacher.

            Explain technical concepts simply.
            Use practical examples when useful.
            """,
        ),
        (
            "human",
            "{message}",
        ),
    ])

chain = prompt | structured_llm

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
    return {"response": final_message.content}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
