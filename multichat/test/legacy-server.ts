// bun test/legacy-server.ts <port>: a channel server from before the a05ae2d hardening.
// No hello/features, no echo of user messages, no pong, no history_end: the client must still work.
const port = Number(process.argv[2]);
const received: string[] = [];

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws" && server.upgrade(req)) return;
    if (url.pathname === "/received") return Response.json(received);
    return new Response("404", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.send(JSON.stringify({ type: "msg", id: "old1", from: "assistant", text: "history from the old server", ts: Date.now() - 60000 }));
    },
    message(_ws, raw) {
      const data = JSON.parse(String(raw));
      if (typeof data.text === "string") received.push(data.text);
    },
  },
});
console.error(`legacy server on ${port}`);
