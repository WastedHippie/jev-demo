import { APIError, type TypeSafeClient } from "@typesafe-ai/sdk";
import { runSchema } from "@/catalog";
import recordings from "@/recordings.json";
import { runDemo } from "@/run";

export async function handleRun(request: Request, client: TypeSafeClient | null) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Open the demo on this server to run it." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Choose a demo and supply text between 1 and 12,000 characters per field." },
      { status: 400 },
    );
  }

  const { mode, input } = parsed.data;
  if (mode === "recorded") {
    const recording = recordings.find(
      (entry) => JSON.stringify(entry.input) === JSON.stringify(input),
    );
    return recording
      ? Response.json(recording.result)
      : Response.json(
          { error: "No recording matches this input. Choose a preset or switch to live mode." },
          { status: 409 },
        );
  }

  if (!client) {
    return Response.json(
      { error: "Add TYPESAFE_API_KEY to .env and restart the server, or choose recorded mode." },
      { status: 503 },
    );
  }

  try {
    const started = performance.now();
    const result = await runDemo(client, input);
    return Response.json({
      ...result,
      source: "live",
      elapsedMs: Math.round(performance.now() - started),
      capturedAt: new Date().toISOString(),
    });
  } catch (error) {
    const rejectedKey = error instanceof APIError && (error.status === 401 || error.status === 403);
    const message = rejectedKey
      ? "TypeSafe rejected the API key. Check TYPESAFE_API_KEY in .env and restart."
      : "The live Jev request failed. Try again, or choose recorded mode to continue the demo.";
    return Response.json({ error: message }, { status: 502 });
  }
}
