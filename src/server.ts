import { handleCompare, handleRun } from "@/api";
import { createClient } from "@/client";
import { createOpenAIClient } from "@/openai";
import homepage from "@/web/index.html";

const client = process.env.TYPESAFE_API_KEY?.trim() ? createClient() : null;
const openai = createOpenAIClient();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT || 3000),
  maxRequestBodySize: 32 * 1024,
  development: process.env.NODE_ENV !== "production" && { hmr: true, console: true },
  routes: {
    "/": homepage,
    "/api/config": {
      GET: () =>
        Response.json({
          liveAvailable: client !== null,
          model: client?.defaultModel ?? "jev-1.13.0",
          openaiAvailable: openai !== null,
          openaiModel: openai?.model ?? null,
        }),
    },
    "/api/run": { POST: (request) => handleRun(request, client) },
    "/api/compare": { POST: (request) => handleCompare(request, client, openai) },
    "/api/source/:demo": {
      GET(request) {
        const { demo } = request.params;
        if (demo !== "customer" && demo !== "pull-request" && demo !== "openai") {
          return new Response("Example not found", { status: 404 });
        }
        const file = demo === "openai" ? "./openai.ts" : `./examples/${demo}.ts`;
        return new Response(Bun.file(new URL(file, import.meta.url)), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
  fetch: () => new Response("Not found", { status: 404 }),
});

console.log(`Jev demo: ${server.url}`);
