import { describe, expect, expectTypeOf, test } from "bun:test";
import { type SystemOneRequestPayload, TypeSafeClient } from "@typesafe-ai/sdk";
import { handleRun } from "@/api";
import { type DemoInput, runSchema } from "@/catalog";
import type { CustomerResponse } from "@/examples/customer";
import { pullRequestLabels } from "@/examples/pull-request";
import savedRecordings from "@/recordings.json";
import { type Recording, runDemo } from "@/run";

const recordings = savedRecordings as Recording[];
const customer = recordings.find(({ result }) => result.demo === "customer");
const pullRequest = recordings.find(({ result }) => result.demo === "pull-request");
if (customer?.result.demo !== "customer" || pullRequest?.result.demo !== "pull-request") {
  throw new Error("The demo needs a recording of each example.");
}
const customerResponse = customer.result.response;
const customerRequest = customer.result.request;
const pullRequestResponse = pullRequest.result.response;

function sdkReturning(body: unknown, status = 200) {
  const requests: SystemOneRequestPayload[] = [];
  const client = new TypeSafeClient({
    apiKey: "test-key",
    retry: { maxRetries: 0 },
    logLevel: "off",
    fetch: async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)) as SystemOneRequestPayload);
      return Response.json(body, { status });
    },
  });
  return { client, requests };
}

function request(body: unknown, origin?: string) {
  return new Request("http://localhost:3000/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body: JSON.stringify(body),
  });
}

describe("model requests", () => {
  test("customer classification sends one Choice and exposes the exact request", async () => {
    const { client, requests } = sdkReturning(customerResponse);
    const input: DemoInput = {
      demo: "customer",
      interactions: "My card is damaged. Please send a replacement.",
    };

    const result = await runDemo(client, input);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual(result.request);
    expect(Object.keys(result.request.questions)).toEqual(["reason"]);
    expect(requests[0]).toMatchObject({
      model: client.defaultModel,
      state: { interactions: input.interactions },
      questions: { reason: { type: "choice" } },
    });
    expect(result).toMatchObject({ demo: "customer", response: customerResponse });
    expectTypeOf<CustomerResponse["answers"]["reason"]["choice"]>().toEqualTypeOf<
      "card_replacement" | "payment_query" | "online_banking" | "other"
    >();
    expect(customerRequest.questions.reason.criteria).toHaveProperty(
      customerResponse.answers.reason.choice,
    );
  });

  test("PR classification sends one Noul and exposes the exact request", async () => {
    const { client, requests } = sdkReturning(pullRequestResponse);
    const input: DemoInput = {
      demo: "pull-request",
      title: "Change the public API",
      diff: "-export function transfer()\n+export function createTransfer()",
    };

    const result = await runDemo(client, input);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toEqual(result.request);
    expect(Object.keys(result.request.questions)).toEqual(["breakingChange"]);
    expect(requests[0]).toMatchObject({
      model: client.defaultModel,
      state: { title: input.title, diff: input.diff },
      questions: { breakingChange: { type: "noul" } },
    });
    expect(result).toMatchObject({ demo: "pull-request", response: pullRequestResponse });
  });
});

describe("label policy", () => {
  test("the PR label uses an inclusive, adjustable probability threshold", () => {
    const answers = {
      breakingChange: { type: "noul", noul: 0.8 } as const,
    };

    expect(pullRequestLabels(answers)).toEqual(["breaking-change"]);
    expect(pullRequestLabels(answers, 0.79)).toEqual(["breaking-change"]);
    expect(pullRequestLabels(answers, 0.81)).toEqual([]);
  });
});

describe("run endpoint", () => {
  test.each(recordings)("replays an exact saved input without an API key", async (recording) => {
    const response = await handleRun(request({ mode: "recorded", input: recording.input }), null);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ...recording.result, source: "recorded" });
  });

  test("edited input cannot silently use an unrelated recording", async () => {
    const input = { demo: "customer", interactions: "A new interaction with no saved result." };
    const response = await handleRun(request({ mode: "recorded", input }), null);
    expect(response.status).toBe(409);
  });

  test("live mode requires a key even when its input has a recording", async () => {
    const response = await handleRun(request({ mode: "live", input: customer.input }), null);
    expect(response.status).toBe(503);
  });

  test("live success includes the actual request, typed answers, and live source", async () => {
    const { client, requests } = sdkReturning(customerResponse);
    const response = await handleRun(request({ mode: "live", input: customer.input }), client);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: "live",
      request: requests[0],
      response: customerResponse,
    });
    expect(requests).toHaveLength(1);
  });

  test.each([
    null,
    { mode: "live", input: { demo: "customer", interactions: "   " } },
    { mode: "live", input: { demo: "pull-request", title: "Missing diff" } },
    { mode: "live", input: { demo: "customer", interactions: "x".repeat(20_001) } },
    { mode: "unknown", input: customer.input },
  ])("rejects invalid input before making a model request", async (body) => {
    const { client, requests } = sdkReturning(customerResponse);
    expect(runSchema.safeParse(body).success).toBe(false);
    expect((await handleRun(request(body), client)).status).toBe(400);
    expect(requests).toHaveLength(0);
  });

  test("malformed JSON gets a useful client error", async () => {
    const malformed = new Request("http://localhost:3000/api/run", {
      method: "POST",
      body: "{broken",
    });
    expect((await handleRun(malformed, null)).status).toBe(400);
  });

  test("only same-origin browser requests can use the endpoint", async () => {
    const body = { mode: "recorded", input: customer.input };
    expect((await handleRun(request(body, "https://other.example"), null)).status).toBe(403);
    expect((await handleRun(request(body, "http://localhost:3000"), null)).status).toBe(200);
  });

  test("upstream failures are sanitized and never replaced with a recording", async () => {
    const { client, requests } = sdkReturning({ message: "private-upstream-detail" }, 500);
    const response = await handleRun(request({ mode: "live", input: customer.input }), client);
    const body = await response.text();
    expect(response.status).toBe(502);
    expect(requests).toHaveLength(1);
    expect(body).not.toContain("private-upstream-detail");
    expect(body).not.toContain('"source":"recorded"');
  });
});
