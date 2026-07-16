from typing import (Annotated,TypedDict)
from langgraph.graph import (
    StateGraph,
    START,
    END
    )                        
from langgraph.graph.message import add_messages
from llm import llm_with_tools
from langgraph.prebuilt import ToolNode
from tools import multiply

class AgentState(TypedDict):

    messages: Annotated[
        list,
        add_messages
    ]

graph_builder = StateGraph(
    AgentState
)

tool_node = ToolNode(
    [multiply]
)
def chatbot(state:AgentState):

    response = llm_with_tools.invoke(
        state['messages']
    )

    return {
        "messages": [response]
    }

def should_continue(state: AgentState):

    last_message = state["messages"][-1]

    if last_message.tool_calls:
        return "tools"
    
    return END

graph_builder.add_node(
    "chatbot",
    chatbot
)
graph_builder.add_node(
    "tools",
    tool_node
)

graph_builder.add_edge(
    START,
    "chatbot"
)

graph_builder.add_conditional_edges(
    "chatbot",
    should_continue
)

graph_builder.add_edge(
    "tools",
    "chatbot"
)

graph = graph_builder.compile()
