import os

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from tools import multiply

load_dotenv()


if not os.getenv("GROQ_API_KEY"):
    raise ValueError(
        "GROQ_API_KEY was not found in the .env file."
    )

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)

llm_with_tools = llm.bind_tools(
    [multiply]
)

response = llm_with_tools.invoke(
    "What is 1809 muiltiplied by 9028"
)

print(response)