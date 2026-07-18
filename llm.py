import os

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from tools import (multiply, weather)

load_dotenv()


if not os.getenv("GROQ_API_KEY"):
    raise ValueError(
        "GROQ_API_KEY was not found in the .env file."
    )


def _groq_model(model: str, max_tokens: int) -> ChatGroq:
    options = {
        "model": model,
        "api_key": os.getenv("GROQ_API_KEY"),
        "temperature": 0,
        "max_tokens": max_tokens,
        "max_retries": 1,
        "request_timeout": 60,
    }
    if model.startswith("openai/gpt-oss-"):
        options["reasoning_effort"] = "low"
    elif model.startswith("qwen/"):
        options["reasoning_format"] = "parsed"
    return ChatGroq(**options)


specialist_llm = _groq_model(
    os.getenv("GROQ_SPECIALIST_MODEL", "qwen/qwen3.6-27b"),
    max_tokens=int(os.getenv("GROQ_SPECIALIST_MAX_TOKENS", "1800")),
)
llm = _groq_model(
    os.getenv("GROQ_SYNTHESIS_MODEL", "openai/gpt-oss-120b"),
    max_tokens=int(os.getenv("GROQ_SYNTHESIS_MAX_TOKENS", "1800")),
)


llm_with_tools = llm.bind_tools(
    [multiply, weather]
)