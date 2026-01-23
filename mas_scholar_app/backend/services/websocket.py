"""
WebSocket Manager Service
=========================
Shared instance for managing real-time agent memory stream connections.
Mapped by search_id.
"""

from fastapi import WebSocket
import asyncio
from typing import Dict

class ConnectionManager:
    def __init__(self):
        # Map search_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, search_id: str):
        await websocket.accept()
        self.active_connections[search_id] = websocket

    def disconnect(self, search_id: str):
        if search_id in self.active_connections:
            del self.active_connections[search_id]

    async def emit(self, search_id: str, message: dict):
        """Emit a message to a specific search session."""
        if search_id in self.active_connections:
            ws = self.active_connections[search_id]
            try:
                await ws.send_json(message)
            except:
                self.disconnect(search_id)

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
