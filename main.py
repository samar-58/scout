"""Stable ASGI compatibility entry point for `uvicorn main:app`."""

from scout.app import app

__all__ = ["app"]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3000)
