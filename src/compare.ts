import type { TypeSafeClient } from "@typesafe-ai/sdk";
import type { DemoInput } from "@/catalog";
import { customerRequest } from "@/examples/customer";
import { pullRequestRequest } from "@/examples/pull-request";
import { type OpenAIConfig, runOpenAI } from "@/openai";
import { runDemo } from "@/run";

export type Attempt<T> = { ok: true; result: T; elapsedMs: number } | { ok: false; error: string };

async function measure<T>(run: () => Promise<T>, error: string): Promise<Attempt<T>> {
  const started = performance.now();
  try {
    return { ok: true, result: await run(), elapsedMs: Math.round(performance.now() - started) };
  } catch {
    return { ok: false, error };
  }
}

export async function compareDemo(client: TypeSafeClient, openai: OpenAIConfig, input: DemoInput) {
  const task =
    input.demo === "customer"
      ? customerRequest(client.defaultModel, input.interactions)
      : pullRequestRequest(client.defaultModel, input.title, input.diff);

  const [jev, llm] = await Promise.all([
    measure(
      () => runDemo(client, input),
      "The Jev request failed. Check TYPESAFE_API_KEY or try again.",
    ),
    measure(
      () => runOpenAI(openai, task),
      "OpenAI did not return a valid decision. Check OPENAI_URL, OPENAI_MODEL, and OPENAI_API_KEY; the model must support structured outputs.",
    ),
  ]);
  return { jev, llm };
}

export type ComparisonResult = Awaited<ReturnType<typeof compareDemo>>;
