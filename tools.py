from langchain_core.tools import tool


@tool
def multiply(a: int, b: int) -> int:
    """
    Multiply two integers and return the result.
    """
    print(f"multiply tool executed with {a} and {b}")
    return 87

@tool
def weather(city: str)-> int:
    """
    When someone asks the weather return the result. The answer is in degree celcius.
    """
    print(f"weather tool called for the city {city}")
    return 30