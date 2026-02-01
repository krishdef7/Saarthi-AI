"""
WebSocket Manager Service
=========================
Shared instance for managing real-time agent memory stream connections.
Mapped by search_id.
"""

from fastapi import WebSocket
import asyncio
import logging
import threading
from typing import Dict, Optional
from datetime import datetime, timedelta

logger = logging.getLogger("mas_scholar_api.websocket")

# Stale connection timeout (5 minutes)
STALE_CONNECTION_TIMEOUT = timedelta(minutes=5)


class ConnectionManager:
    def __init__(self):
        # Map search_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        self._connection_times: Dict[str, datetime] = {}
        self._lock = threading.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, search_id: str):
        await websocket.accept()

        with self._lock:
            # Clean up any stale connection with same ID
            if search_id in self.active_connections:
                # Schedule close without holding lock
                old_ws = self.active_connections.pop(search_id, None)
                if search_id in self._connection_times:
                    del self._connection_times[search_id]
            else:
                old_ws = None

            self.active_connections[search_id] = websocket
            self._connection_times[search_id] = datetime.now()

        # Close old connection outside lock
        if old_ws:
            try:
                await old_ws.close()
            except Exception:
                pass

        logger.debug(f"WebSocket connected: {search_id}")

        # Start cleanup task if not running
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())

    async def _close_connection(self, search_id: str):
        """Safely close a connection."""
        ws = None
        with self._lock:
            if search_id in self.active_connections:
                ws = self.active_connections.pop(search_id, None)
                if search_id in self._connection_times:
                    del self._connection_times[search_id]

        if ws:
            try:
                await ws.close()
            except Exception:
                pass  # Already closed

    def disconnect(self, search_id: str):
        """Synchronous disconnect (for use in except handlers)."""
        with self._lock:
            if search_id in self.active_connections:
                del self.active_connections[search_id]
            if search_id in self._connection_times:
                del self._connection_times[search_id]
        logger.debug(f"WebSocket disconnected: {search_id}")

    async def _periodic_cleanup(self):
        """Periodically clean up stale connections."""
        while True:
            await asyncio.sleep(60)  # Check every minute
            await self._cleanup_stale_connections()

    async def _cleanup_stale_connections(self):
        """Remove connections that have been idle too long."""
        now = datetime.now()
        stale_ids = []

        with self._lock:
            for search_id, conn_time in list(self._connection_times.items()):
                if now - conn_time > STALE_CONNECTION_TIMEOUT:
                    stale_ids.append(search_id)

        for search_id in stale_ids:
            logger.info(f"Cleaning up stale WebSocket: {search_id}")
            await self._close_connection(search_id)

    async def emit(self, search_id: str, message: dict):
        """Emit a message to a specific search session."""
        ws = None
        with self._lock:
            ws = self.active_connections.get(search_id)
            # Update last activity time
            if ws and search_id in self._connection_times:
                self._connection_times[search_id] = datetime.now()

        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to emit to {search_id}: {e}")
                self.disconnect(search_id)

    def get_active_count(self) -> int:
        """Return count of active connections."""
        with self._lock:
            return len(self.active_connections)

# Singleton instance
manager = ConnectionManager()

async def broadcast_agent_event(search_id: str, stage: str, message: str, meta: dict = None):
    """
    Broadcast an event to a specific search session.
    """
    from datetime import datetime

    event = {
        "search_id": search_id,
        "stage": stage,
        "message": message,
        "meta": meta or {},
        "timestamp": datetime.now().isoformat()
    }

    await manager.emit(search_id, event)


# Stage definitions for /ws/search endpoint
SEARCH_STAGES = {
    "query_understanding": {"message": "Analyzing your query...", "progress": 10},
    "bm25_search": {"message": "Searching for exact keyword matches...", "progress": 25},
    "vector_search": {"message": "Finding semantically similar scholarships...", "progress": 45},
    "rrf_fusion": {"message": "Combining search results with RRF fusion...", "progress": 60},
    "memory_boost": {"message": "Personalizing based on your history...", "progress": 75},
    "eligibility_check": {"message": "Verifying eligibility for each scholarship...", "progress": 90},
    "complete": {"message": "Search complete, returning results", "progress": 100},
}


async def emit_search_stage(
    websocket,
    stage: str,
    timing_ms: float = 0,
    data: dict = None,
    custom_message: str = None
):
    """
    Emit a search stage update in the specified format for /ws/search.

    Format:
    {
        "stage": "bm25_search",
        "message": "Searching for exact keyword matches...",
        "progress": 35,
        "timing_ms": 12,
        "data": {}
    }
    """
    stage_info = SEARCH_STAGES.get(stage, {"message": stage, "progress": 0})

    event = {
        "stage": stage,
        "message": custom_message or stage_info["message"],
        "progress": stage_info["progress"],
        "timing_ms": round(timing_ms, 2),
        "data": data or {}
    }

    try:
        await websocket.send_json(event)
    except Exception as e:
        logger.debug(f"Failed to emit search stage '{stage}': {e}")
