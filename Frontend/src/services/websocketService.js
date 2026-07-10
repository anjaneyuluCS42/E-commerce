class WebSocketService {
  constructor() {
    this.ws = null;
  }

  connect(url) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return this.ws;
    }

    this.ws = new WebSocket(url);
    return this.ws;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  joinRoom(roomName) {
    return this.send({ action: 'join_room', room: roomName });
  }

  leaveRoom(roomName) {
    return this.send({ action: 'leave_room', room: roomName });
  }
}

const websocketService = new WebSocketService();
export default websocketService;
