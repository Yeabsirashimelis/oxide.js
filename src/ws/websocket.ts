import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";

export type WsHandler = (socket: OxideSocket, req: IncomingMessage) => void;

interface WsRoute {
  path: string;
  handler: WsHandler;
}

export class OxideSocket {
  readonly raw: WebSocket;
  readonly id: string;
  private _rooms: Set<string> = new Set();
  private server: OxideWebSocketServer;

  constructor(ws: WebSocket, server: OxideWebSocketServer) {
    this.raw = ws;
    this.id = generateId();
    this.server = server;
  }

  /** Send data to this client */
  send(data: string | object): void {
    // readyState 1 = OPEN
    if (this.raw.readyState === 1) {
      const payload = typeof data === "object" ? JSON.stringify(data) : data;
      this.raw.send(payload);
    }
  }

  /** Listen for events on this socket */
  on(event: "message", cb: (data: string) => void): this;
  on(event: "close", cb: (code: number, reason: string) => void): this;
  on(event: "error", cb: (err: Error) => void): this;
  on(event: string, cb: (...args: any[]) => void): this {
    if (event === "message") {
      this.raw.on("message", (rawData) => {
        cb(rawData.toString());
      });
    } else if (event === "close") {
      this.raw.on("close", (code, reason) => {
        this._rooms.forEach((room) => this.server.leaveRoom(room, this));
        this.server.removeClient(this);
        cb(code, reason.toString());
      });
    } else if (event === "error") {
      this.raw.on("error", cb);
    }
    return this;
  }

  /** Close this connection */
  close(code?: number, reason?: string): void {
    this.raw.close(code, reason);
  }

  /** Broadcast to all other connected clients */
  broadcast(data: string | object): void {
    this.server.broadcast(data, this);
  }

  /** Join a room */
  join(room: string): void {
    this._rooms.add(room);
    this.server.joinRoom(room, this);
  }

  /** Leave a room */
  leave(room: string): void {
    this._rooms.delete(room);
    this.server.leaveRoom(room, this);
  }

  /** Send to all clients in a room (excluding self) */
  to(room: string): { send: (data: string | object) => void } {
    return {
      send: (data: string | object) => {
        this.server.sendToRoom(room, data, this);
      },
    };
  }

  get rooms(): string[] {
    return Array.from(this._rooms);
  }
}

export class OxideWebSocketServer {
  private wss: WebSocketServer;
  private routes: WsRoute[] = [];
  private clients: Set<OxideSocket> = new Set();
  private rooms: Map<string, Set<OxideSocket>> = new Map();

  constructor() {
    this.wss = new WebSocketServer({ noServer: true });
  }

  /** Register a WebSocket route */
  addRoute(path: string, handler: WsHandler): void {
    this.routes.push({ path, handler });
  }

  /** Attach to an HTTP server to handle upgrade requests */
  attach(server: HttpServer | HttpsServer): void {
    server.on("upgrade", (req, socket, head) => {
      const url = req.url || "/";
      const pathname = url.split("?")[0] || "/";

      const route = this.routes.find((r) => this.matchPath(r.path, pathname));

      if (!route) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        const oxideSocket = new OxideSocket(ws, this);
        this.clients.add(oxideSocket);

        // Auto-cleanup on close
        ws.on("close", () => {
          oxideSocket.rooms.forEach((room) => this.leaveRoom(room, oxideSocket));
          this.clients.delete(oxideSocket);
        });

        route.handler(oxideSocket, req);
      });
    });
  }

  /** Broadcast to all connected clients, optionally excluding one */
  broadcast(data: string | object, exclude?: OxideSocket): void {
    const payload = typeof data === "object" ? JSON.stringify(data) : data;
    for (const client of this.clients) {
      if (client !== exclude && client.raw.readyState === 1) {
        client.raw.send(payload);
      }
    }
  }

  /** Get count of connected clients */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Get all connected clients */
  getClients(): OxideSocket[] {
    return Array.from(this.clients);
  }

  // Room management
  joinRoom(room: string, client: OxideSocket): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(client);
  }

  leaveRoom(room: string, client: OxideSocket): void {
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(client);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }

  sendToRoom(room: string, data: string | object, exclude?: OxideSocket): void {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    const payload = typeof data === "object" ? JSON.stringify(data) : data;
    for (const client of roomClients) {
      if (client !== exclude && client.raw.readyState === 1) {
        client.raw.send(payload);
      }
    }
  }

  getRoomSize(room: string): number {
    return this.rooms.get(room)?.size || 0;
  }

  removeClient(client: OxideSocket): void {
    this.clients.delete(client);
  }

  private matchPath(pattern: string, url: string): boolean {
    // Simple exact match for now
    return pattern === url;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}
