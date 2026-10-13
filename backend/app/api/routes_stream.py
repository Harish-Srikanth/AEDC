from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..services.stream_service import (
    simulated_event_generator, set_simulation_state, is_simulation_running
)

router = APIRouter(prefix="/stream", tags=["Real-Time Streaming"])


class StreamControlRequest(BaseModel):
    running: bool


@router.get("/events")
async def stream_live_events(interval: float = 3.0):
    """
    Streams simulated cybersecurity events via Server-Sent Events (SSE).
    Events are clearly identified with [SIMULATED] and appended to the live hash chain.
    """
    return StreamingResponse(
        simulated_event_generator(interval_seconds=interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/control")
def control_simulation(request: StreamControlRequest):
    """Pauses or resumes the real-time event generator simulator."""
    set_simulation_state(request.running)
    return {"simulation_running": request.running}


@router.get("/status")
def get_simulation_status():
    """Returns whether the simulator is actively generating events."""
    return {"simulation_running": is_simulation_running()}
