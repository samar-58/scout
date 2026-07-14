from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn
from llm import llm

app = FastAPI(
    title="Multi agent tutorial",
    version="1.0.0"
)

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
    response = llm.invoke(request.message)
    return {"response": response.content}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
