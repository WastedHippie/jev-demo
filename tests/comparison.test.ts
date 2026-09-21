import { describe, expect, test } from "bun:test";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { handleCompare } from "@/api";
import type { DemoInput } from "@/catalog";
import { type ComparisonResult, compareDemo } from "@/compare";
import { customerRequest } from "@/examples/customer";
import { pullRequestRequest } from "@/examples/pull-request";
import { createOpenAIClient, runOpenAI } from "@/openai";
import recordings from "@/recordings.json";

const environment = {
  OPENAI_API_KEY: "synthetic-comparison-key",
  OPENAI_URL: "https://gateway.example.test/v1",
  OPENAI_MODEL: "configured-test-model",
};
const input: DemoInput = { demo: "customer", interactions: "Please replace my lost card." };
const customerTask = customerRequest("jev-test-model", input.interactions);
const prTask = pullRequestRequest("jev-test-model", "Rename a field", "-name\n+fullName");
const customerResponse = recordings.find(({ result }) => result.demo === "customer")?.result
  .response;
if (!customerResponse) throw new Error("A recorded customer response is required.");

function completion(
  content: string | null,
  finishReason: ChatCompletion.Choice["finish_reason"] = "stop",
  refusal: string | null = null,
): ChatCompletion {
  return {
    id: "completion-test",
    object: "chat.completion",
    created: 0,
    model: environment.OPENAI_MODEL,
    choices: [
      {
        index: 0,
        finish_reason: finishReason,
        logprobs: null,
        message: { role: "assistant", content, refusal },
      },
    ],
  };
}

function openAIReturning(body: unknown, status = 200, beforeReply = () => Promise.resolve()) {
  const config = createOpenAIClient(environment);
  if (!config) throw new Error("Synthetic OpenAI configuration must be complete.");
  const calls: { url: string; headers: Headers; body: ChatCompletionCreateParamsNonStreaming }[] =
    [];
  const client = config.client.withOptions({
    logLevel: "off",
    fetch: async (url, init) => {
      calls.push({
        url: String(url),
        headers: new Headers(init?.headers),
        body: JSON.parse(String(init?.body)) as ChatCompletionCreateParamsNonStreaming,
      });
      await beforeReply();
      return Response.json(body, { status });
    },
  });
  return { config: { ...config, client }, calls };
}

function jevReturning(status = 200, beforeReply = () => Promise.resolve()) {
  const calls: unknown[] = [];
  const client = new TypeSafeClient({
    apiKey: "synthetic-jev-key",
    retry: { maxRetries: 0 },
    logLevel: "off",
    fetch: async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      await beforeReply();
      return Response.json(
        status === 200 ? customerResponse : { message: "private-provider-detail" },
        { status },
      );
    },
  });
  return { client, calls };
}

function compareRequest(body: unknown, origin?: string) {
  return new Request("http://localhost:3000/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });
}

describe("OpenAI comparison request", () => {
  test.each(["OPENAI_API_KEY", "OPENAI_URL", "OPENAI_MODEL"])(
    "requires %s explicitly",
    (missing) => {
      expect(createOpenAIClient({ ...environment, [missing]: undefined })).toBeNull();
    },
  );

  test.each([
    {
      name: "customer",
      task: customerTask,
      answer: { reason: "card_replacement" },
      properties: {
        reason: { type: "string", enum: Object.keys(customerTask.questions.reason.criteria) },
      },
    },
    {
      name: "PR",
      task: prTask,
      answer: { breakingChange: true },
      properties: { breakingChange: { type: "boolean" } },
    },
  ])(
    "sends the same $name task with a strict output schema",
    async ({ task, answer, properties }) => {
      const reply = completion(JSON.stringify(answer));
      const { config, calls } = openAIReturning(reply);
      const result = await runOpenAI(config, task);

      expect(config.client.baseURL).toBe(environment.OPENAI_URL);
      expect(config.client.maxRetries).toBe(0);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(`${environment.OPENAI_URL}/chat/completions`);
      expect(calls[0]?.headers.get("x-portkey-api-key")).toBe(environment.OPENAI_API_KEY);
      expect(calls[0]?.body).toEqual(result.request);
      expect(result.request.model).toBe(environment.OPENAI_MODEL);
      const message = result.request.messages.find(({ role }) => role === "user");
      expect(JSON.parse(String(message?.content))).toEqual({
        state: task.state,
        questions: task.questions,
      });
      expect(result.request.response_format).toMatchObject({
        type: "json_schema",
        json_schema: {
          strict: true,
          schema: {
            type: "object",
            properties,
            required: Object.keys(properties),
            additionalProperties: false,
          },
        },
      });
      expect(result.answer).toEqual(answer);
      expect(result.response).toMatchObject(reply);
      expect(JSON.stringify(result)).not.toContain(environment.OPENAI_API_KEY);
    },
  );

  test.each([
    { name: "unknown Choice", task: customerTask, reply: completion('{"reason":"unknown"}') },
    {
      name: "string instead of boolean",
      task: prTask,
      reply: completion('{"breakingChange":"true"}'),
    },
    { name: "invalid JSON", task: customerTask, reply: completion("not JSON") },
    {
      name: "refusal",
      task: customerTask,
      reply: completion('{"reason":"other"}', "stop", "Cannot answer"),
    },
    { name: "truncation", task: prTask, reply: completion('{"breakingChange":true}', "length") },
  ])("rejects $name instead of displaying a decision", async ({ task, reply }) => {
    const { config } = openAIReturning(reply);
    await expect(runOpenAI(config, task)).rejects.toThrow();
  });
});

describe("comparison execution", () => {
  test("starts both providers before waiting for either response", async () => {
    const gate = Promise.withResolvers<void>();
    const bothStarted = Promise.withResolvers<boolean>();
    let started = 0;
    const beforeReply = () => {
      if (++started === 2) bothStarted.resolve(true);
      return gate.promise;
    };
    const jev = jevReturning(200, beforeReply);
    const llm = openAIReturning(completion('{"reason":"card_replacement"}'), 200, beforeReply);
    const pending = compareDemo(jev.client, llm.config, input);
    try {
      expect(await Promise.race([bothStarted.promise, Bun.sleep(1_000).then(() => false)])).toBe(
        true,
      );
    } finally {
      gate.resolve();
    }
    const result = await pending;
    expect(result.jev.ok).toBe(true);
    expect(result.llm.ok).toBe(true);
  });

  test.each(["jev", "llm"] as const)("keeps the other result when %s fails", async (failed) => {
    const jev = jevReturning(failed === "jev" ? 500 : 200);
    const llm = openAIReturning(
      failed === "llm"
        ? { error: { message: "private-provider-detail" } }
        : completion('{"reason":"card_replacement"}'),
      failed === "llm" ? 500 : 200,
    );
    const response = await handleCompare(compareRequest({ input }), jev.client, llm.config);
    const body: ComparisonResult = await response.json();

    expect(response.status).toBe(200);
    expect(body[failed]).toMatchObject({ ok: false, error: expect.any(String) });
    expect(body[failed === "jev" ? "llm" : "jev"]).toMatchObject({ ok: true });
    expect(jev.calls).toHaveLength(1);
    expect(llm.calls).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("private-provider-detail");
    expect(JSON.stringify(body)).not.toContain(environment.OPENAI_API_KEY);
  });
});

describe("comparison endpoint", () => {
  test.each(["jev", "llm"] as const)(
    "requires %s configuration before calling either provider",
    async (missing) => {
      const jev = jevReturning();
      const llm = openAIReturning(completion('{"reason":"other"}'));
      const response = await handleCompare(
        compareRequest({ input }),
        missing === "jev" ? null : jev.client,
        missing === "llm" ? null : llm.config,
      );

      expect(response.status).toBe(503);
      expect(jev.calls).toHaveLength(0);
      expect(llm.calls).toHaveLength(0);
    },
  );

  test.each([
    { body: null, origin: undefined, status: 400 },
    { body: { input: { demo: "customer", interactions: " " } }, origin: undefined, status: 400 },
    { body: { input }, origin: "https://other.example", status: 403 },
  ])(
    "rejects invalid comparison requests before using either provider",
    async ({ body, origin, status }) => {
      const jev = jevReturning();
      const llm = openAIReturning(completion('{"reason":"other"}'));
      const response = await handleCompare(compareRequest(body, origin), jev.client, llm.config);
      expect(response.status).toBe(status);
      expect(jev.calls).toHaveLength(0);
      expect(llm.calls).toHaveLength(0);
    },
  );

  test("rejects malformed JSON", async () => {
    const request = new Request("http://localhost:3000/api/compare", {
      method: "POST",
      body: "{broken",
    });
    expect((await handleCompare(request, null, null)).status).toBe(400);
  });
});
