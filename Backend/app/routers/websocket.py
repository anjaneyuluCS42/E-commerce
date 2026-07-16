from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from jose import jwt, JWTError
from app.config import SECRET_KEY, ALGORITHM
from app.websocket.manager import manager
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
import json

router = APIRouter()


async def get_ws_user(token: str, db: AsyncSession):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, token: str = None, db: AsyncSession = Depends(get_db)
):
    # Accept the connection first so we can cleanly close it with a custom code if authentication fails
    await websocket.accept()

    user = await get_ws_user(token, db)
    if not user:
        # Close connection immediately with code 4001 (Authentication failed)
        await websocket.close(code=4001)
        return

    user_id = user.id

    # Store connection in active connections and push initial history/notifications
    if user_id not in manager.active_connections:
        manager.active_connections[user_id] = []
    manager.active_connections[user_id].append(websocket)

    # Send history on connect
    await manager.send_history_on_connect(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                action = message.get("action")

                if action == "join_room":
                    room_name = message.get("room")
                    if room_name:
                        await manager.join_room(websocket, room_name)

                elif action == "leave_room":
                    room_name = message.get("room")
                    if room_name:
                        await manager.leave_room(websocket, room_name)

                elif action == "send_chat":
                    receiver_id = int(message.get("receiver_id"))
                    text = message.get("text")
                    if receiver_id and text:
                        # Save in Redis and broadcast
                        msg = await manager.save_chat_message(
                            user_id, receiver_id, text, message.get("timestamp")
                        )
                        await manager.send_to_user(
                            {"type": "chat_message", **msg}, receiver_id
                        )
                        await manager.send_to_user(
                            {"type": "chat_message", **msg}, user_id
                        )

                elif action == "typing":
                    receiver_id = int(message.get("receiver_id"))
                    is_typing = message.get("is_typing", False)
                    if receiver_id:
                        await manager.send_to_user(
                            {
                                "type": "chat_typing",
                                "sender_id": user_id,
                                "is_typing": is_typing,
                            },
                            receiver_id,
                        )

                elif action == "mark_read":
                    notification_id = message.get("notification_id")
                    if notification_id:
                        await manager.mark_notification_as_read(
                            user_id, notification_id
                        )

                elif action == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except (json.JSONDecodeError, ValueError, TypeError):
                pass

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
