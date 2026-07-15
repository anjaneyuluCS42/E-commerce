import json
import logging
from fastapi import WebSocket
from typing import Dict, List

logger = logging.getLogger("uvicorn")

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> List of active WebSockets (User might have multiple tabs open)
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # List for unauthenticated or generic connections
        self.general_connections: List[WebSocket] = []
        # Maps room_name -> List of active WebSockets
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int = None):
        await websocket.accept()
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
            
            # Send dynamic notifications and chat history over the WebSocket immediately
            await self.send_history_on_connect(websocket, user_id)
        else:
            self.general_connections.append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int = None):
        if user_id and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]: # Cleanup empty lists
                del self.active_connections[user_id]
        elif websocket in self.general_connections:
            self.general_connections.remove(websocket)

        # Cleanup rooms
        for room_name in list(self.rooms.keys()):
            if websocket in self.rooms[room_name]:
                self.rooms[room_name].remove(websocket)
                if not self.rooms[room_name]:
                    del self.rooms[room_name]

    async def join_room(self, websocket: WebSocket, room_name: str):
        if room_name not in self.rooms:
            self.rooms[room_name] = []
        if websocket not in self.rooms[room_name]:
            self.rooms[room_name].append(websocket)

    async def leave_room(self, websocket: WebSocket, room_name: str):
        if room_name in self.rooms and websocket in self.rooms[room_name]:
            self.rooms[room_name].remove(websocket)
            if not self.rooms[room_name]:
                del self.rooms[room_name]

    async def send_to_user(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

    async def send_to_room(self, message: dict, room_name: str):
        if room_name in self.rooms:
            for connection in self.rooms[room_name]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

    async def broadcast(self, message: dict):
        for connections in self.active_connections.values():
            for connection in connections:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass
        for connection in self.general_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

    # Save & Store Notifications in Redis
    async def send_notification(self, user_id: int, title: str, message: str, payload: dict = None):
        import uuid
        from datetime import datetime
        notif_id = f"notif-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}"
        notif = {
            "id": notif_id,
            "title": title,
            "message": message,
            "read": False,
            "timestamp": datetime.utcnow().strftime("%I:%M %p"),
            "type": "notification"
        }
        if payload:
            notif.update(payload)
            
        try:
            from app.cache.redis_client import redis_client
            await redis_client.rpush(f"notifications:{user_id}", json.dumps(notif))
        except Exception as e:
            logger.error(f"Redis error in send_notification: {e}")
            
        # Dispatch live message
        await self.send_to_user(notif, user_id)

    # Mark Notification as Read in Redis
    async def mark_notification_as_read(self, user_id: int, notification_id: str):
        try:
            from app.cache.redis_client import redis_client
            key = f"notifications:{user_id}"
            notifs = await redis_client.lrange(key, 0, -1)
            
            # Clear the old list and push updated values
            await redis_client.delete(key)
            for notif_str in notifs:
                notif = json.loads(notif_str)
                if notif.get("id") == notification_id:
                    notif["read"] = True
                await redis_client.rpush(key, json.dumps(notif))
        except Exception as e:
            logger.error(f"Redis error in mark_notification_as_read: {e}")

    # Save Chat Messages in Redis
    async def save_chat_message(self, sender_id: int, receiver_id: int, text: str, timestamp: str = None):
        import uuid
        from datetime import datetime
        if not timestamp:
            timestamp = datetime.utcnow().isoformat()
        msg = {
            "id": f"msg-{int(datetime.utcnow().timestamp())}-{uuid.uuid4().hex[:6]}",
            "sender_id": sender_id,
            "receiver_id": receiver_id,
            "text": text,
            "timestamp": timestamp
        }
        try:
            from app.cache.redis_client import redis_client
            await redis_client.rpush("chat:history:global", json.dumps(msg))
        except Exception as e:
            logger.error(f"Redis error in save_chat_message: {e}")
        return msg

    # Send History on Connect
    async def send_history_on_connect(self, websocket: WebSocket, user_id: int):
        from app.cache.redis_client import redis_client
        
        # 1. Send stored notifications
        notif_key = f"notifications:{user_id}"
        try:
            notifs = await redis_client.lrange(notif_key, 0, -1)
            for notif_str in notifs:
                try:
                    notif = json.loads(notif_str)
                    notif["is_history"] = True
                    await websocket.send_text(json.dumps(notif))
                except:
                    pass
        except Exception as e:
            logger.error(f"Redis error in send_history_on_connect notifications: {e}")
                
        # 2. Send relevant chat history
        chat_key = "chat:history:global"
        try:
            messages = await redis_client.lrange(chat_key, 0, -1)
            for msg_str in messages:
                try:
                    msg = json.loads(msg_str)
                    # Admin (ID 1) gets all support messages. Customers get messages sent to/from them.
                    if user_id == 1 or msg.get("sender_id") == user_id or msg.get("receiver_id") == user_id:
                        msg_payload = {
                            "type": "chat_message",
                            **msg
                        }
                        await websocket.send_text(json.dumps(msg_payload))
                except:
                    pass
        except Exception as e:
            logger.error(f"Redis error in send_history_on_connect chat history: {e}")

manager = ConnectionManager()