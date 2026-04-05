import { describe, it, expect, beforeAll } from "vitest";
import WebSocket from "ws";
import http from "http";
import { createApp, Context } from "../src/core/app";

const PORT = 4002;

/** Creates a WS connection that buffers all messages from the start */
function createClient(path: string): Promise<{
  ws: WebSocket;
  nextMessage: () => Promise<any>;
  getMessages: (count: number, timeout?: number) => Promise<any[]>;
  close: () => void;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${PORT}${path}`);
    const messageQueue: any[] = [];
    let messageResolvers: Array<(msg: any) => void> = [];

    // Buffer messages from the very start (before "open" fires)
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (messageResolvers.length > 0) {
        const resolver = messageResolvers.shift()!;
        resolver(msg);
      } else {
        messageQueue.push(msg);
      }
    });

    ws.on("open", () => {
      resolve({
        ws,
        nextMessage: () => {
          if (messageQueue.length > 0) {
            return Promise.resolve(messageQueue.shift()!);
          }
          return new Promise((res, rej) => {
            const timer = setTimeout(() => rej(new Error("Message timeout")), 3000);
            messageResolvers.push((msg) => {
              clearTimeout(timer);
              res(msg);
            });
          });
        },
        getMessages: (count: number, timeout = 2000) => {
          return new Promise((res) => {
            const msgs: any[] = [];
            // Drain buffered messages first
            while (messageQueue.length > 0 && msgs.length < count) {
              msgs.push(messageQueue.shift()!);
            }
            if (msgs.length >= count) {
              res(msgs);
              return;
            }
            const remaining = count - msgs.length;
            let collected = 0;
            const handler = (msg: any) => {
              msgs.push(msg);
              collected++;
              if (collected >= remaining) {
                clearTimeout(timer);
                res(msgs);
              }
            };
            for (let i = 0; i < remaining; i++) {
              messageResolvers.push(handler);
            }
            const timer = setTimeout(() => {
              messageResolvers = messageResolvers.filter((r) => r !== handler);
              res(msgs);
            }, timeout);
          });
        },
        close: () => ws.close(),
      });
    });

    ws.on("error", reject);
    setTimeout(() => reject(new Error("Connection timeout")), 3000);
  });
}

describe("WebSocket", () => {
  beforeAll(async () => {
    const app = createApp();

    // Echo endpoint
    app.ws("/ws/echo", (socket) => {
      socket.send({ type: "connected" });
      socket.on("message", (data) => {
        socket.send({ type: "echo", data });
      });
    });

    // Chat endpoint with rooms
    app.ws("/ws/chat", (socket) => {
      let currentRoom = "general";
      socket.join(currentRoom);

      socket.send({ type: "welcome", id: socket.id });
      socket.to(currentRoom).send({ type: "joined", id: socket.id });

      socket.on("message", (data) => {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "chat") {
            socket.to(currentRoom).send({ type: "chat", from: socket.id, message: msg.message });
            socket.send({ type: "chat", from: "self", message: msg.message });
          } else if (msg.type === "join") {
            socket.leave(currentRoom);
            currentRoom = msg.room;
            socket.join(currentRoom);
            socket.send({ type: "room-changed", room: currentRoom });
          }
        } catch {
          socket.send({ type: "error" });
        }
      });

      socket.on("close", () => {
        socket.to(currentRoom).send({ type: "left", id: socket.id });
      });
    });

    // Broadcast endpoint
    app.ws("/ws/broadcast", (socket) => {
      socket.send({ type: "connected" });
      socket.on("message", (data) => {
        socket.broadcast({ type: "broadcast", data });
      });
    });

    // HTTP route
    app.get("/health", (ctx: Context) => {
      ctx.json({ ok: true });
    });

    await new Promise<void>((resolve) => {
      app.listen(PORT, () => resolve());
    });
    await new Promise((r) => setTimeout(r, 200));
  }, 10000);

  // ========== Echo ==========

  describe("Echo", () => {
    it("receives connected message on connect", async () => {
      const client = await createClient("/ws/echo");
      const msg = await client.nextMessage();
      expect(msg).toEqual({ type: "connected" });
      client.close();
    }, 10000);

    it("echoes messages back", async () => {
      const client = await createClient("/ws/echo");
      await client.nextMessage(); // skip connected
      client.ws.send("hello world");
      const msg = await client.nextMessage();
      expect(msg).toEqual({ type: "echo", data: "hello world" });
      client.close();
    }, 10000);

    it("echoes JSON strings", async () => {
      const client = await createClient("/ws/echo");
      await client.nextMessage();
      client.ws.send(JSON.stringify({ foo: "bar" }));
      const msg = await client.nextMessage();
      expect(msg.type).toBe("echo");
      expect(msg.data).toBe('{"foo":"bar"}');
      client.close();
    }, 10000);

    it("handles multiple messages", async () => {
      const client = await createClient("/ws/echo");
      await client.nextMessage();
      client.ws.send("msg1");
      client.ws.send("msg2");
      client.ws.send("msg3");
      const msgs = await client.getMessages(3);
      expect(msgs.map((m) => m.data)).toEqual(["msg1", "msg2", "msg3"]);
      client.close();
    }, 10000);
  });

  // ========== Chat / Rooms ==========

  describe("Chat rooms", () => {
    it("broadcasts to room members", async () => {
      const c1 = await createClient("/ws/chat");
      const c2 = await createClient("/ws/chat");

      // Consume initial messages
      await c1.getMessages(2, 1000); // welcome + c2 joined
      await c2.nextMessage(); // welcome

      c1.ws.send(JSON.stringify({ type: "chat", message: "hi" }));

      const c2Msg = await c2.nextMessage();
      expect(c2Msg.type).toBe("chat");
      expect(c2Msg.message).toBe("hi");

      const c1Echo = await c1.nextMessage();
      expect(c1Echo.from).toBe("self");

      c1.close();
      c2.close();
    }, 10000);

    it("isolates rooms", async () => {
      const cA = await createClient("/ws/chat");
      const cB = await createClient("/ws/chat");

      await cA.getMessages(2, 1000);
      await cB.nextMessage();

      // B joins vip
      cB.ws.send(JSON.stringify({ type: "join", room: "vip" }));
      await cB.nextMessage(); // room-changed

      // A sends in general
      cA.ws.send(JSON.stringify({ type: "chat", message: "general-only" }));
      const aMsg = await cA.nextMessage();
      expect(aMsg.from).toBe("self");

      // B should NOT receive it
      const bMsgs = await cB.getMessages(1, 500);
      const chatMsgs = bMsgs.filter((m) => m.type === "chat");
      expect(chatMsgs.length).toBe(0);

      cA.close();
      cB.close();
    }, 10000);

    it("notifies on disconnect", async () => {
      const c1 = await createClient("/ws/chat");
      const c2 = await createClient("/ws/chat");

      await c1.getMessages(2, 1000);
      await c2.nextMessage();

      c2.close();
      const msg = await c1.nextMessage();
      expect(msg.type).toBe("left");

      c1.close();
    }, 10000);
  });

  // ========== Broadcast ==========

  describe("Broadcast", () => {
    it("sends to all except sender", async () => {
      const c1 = await createClient("/ws/broadcast");
      const c2 = await createClient("/ws/broadcast");
      const c3 = await createClient("/ws/broadcast");

      await c1.nextMessage(); // connected
      await c2.nextMessage();
      await c3.nextMessage();

      c1.ws.send("hello");

      const msg2 = await c2.nextMessage();
      const msg3 = await c3.nextMessage();
      expect(msg2).toEqual({ type: "broadcast", data: "hello" });
      expect(msg3).toEqual({ type: "broadcast", data: "hello" });

      // c1 should NOT receive it
      const c1Msgs = await c1.getMessages(1, 500);
      const broadcastMsgs = c1Msgs.filter((m) => m.type === "broadcast");
      expect(broadcastMsgs.length).toBe(0);

      c1.close();
      c2.close();
      c3.close();
    }, 10000);
  });

  // ========== Edge Cases ==========

  describe("Edge cases", () => {
    it("rejects connection to unknown path", async () => {
      const result = await new Promise<number>((resolve) => {
        const ws = new WebSocket(`ws://localhost:${PORT}/ws/unknown`);
        ws.on("unexpected-response", (_, res) => resolve(res.statusCode!));
        ws.on("error", () => resolve(0));
      });
      expect(result).toBe(404);
    }, 10000);

    it("HTTP routes still work alongside WebSocket", async () => {
      const res = await new Promise<any>((resolve) => {
        http.get(`http://localhost:${PORT}/health`, (res) => {
          let data = "";
          res.on("data", (c: any) => (data += c));
          res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    }, 10000);
  });
});
