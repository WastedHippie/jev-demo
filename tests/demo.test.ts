import { describe, expect, test } from "bun:test";
import { type SystemOneRequestPayload, TypeSafeClient } from "@typesafe-ai/sdk";
import { handleRun } from "@/api";
import { type DemoInput, runSchema } from "@/catalog";
import { customerLabels } from "@/examples/customer";
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

describe("batched model requests", () => {
  test("customer labels ask independent questions over the same interaction log", async () => {
    const { client, requests } = sdkReturning(customerResponse);
    const input: DemoInput = {
      demo: "customer",
      interactions: "A synthetic customer called twice.",
    };

    const result = await runDemo(client, input);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { interactions: input.interactions },
      questions: {
        owner: { type: "choice" },
        unresolved: { type: "noul" },
        repeatContact: { type: "noul" },
        wantsHuman: { type: "noul" },
        friction: { type: "score" },
      },
    });
    expect(result).toEqual({ demo: "customer", response: customerResponse });
  });

  test("PR labels inspect title and diff together in one request", async () => {
    const { client, requests } = sdkReturning(pullRequestResponse);
    const input: DemoInput = {
      demo: "pull-request",
      title: "Change the public API",
      diff: "-export function transfer()\n+export function createTransfer()",
    };

    const result = await runDemo(client, input);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      state: { title: input.title, diff: input.diff },
      questions: {
        breaking: { type: "noul" },
        security: { type: "noul" },
        migration: { type: "noul" },
        blastRadius: { type: "score" },
      },
    });
    expect(result).toEqual({ demo: "pull-request", response: pullRequestResponse });
  });
});

describe("label policy", () => {
  test("customer labels include the threshold, allow multiple matches, and can all be withheld", () => {
    const answers = {
      ...customerResponse.answers,
      unresolved: { type: "noul", noul: 0.8 } as const,
      repeatContact: { type: "noul", noul: 0.79 } as const,
      wantsHuman: { type: "noul", noul: 0.85 } as const,
    };

    expect(customerLabels(answers)).toEqual([
      { label: "Unresolved issue", probability: 0.8 },
      { label: "Human requested", probability: 0.85 },
    ]);
    expect(customerLabels(answers, 0.75)).toHaveLength(3);
    expect(customerLabels(answers, 0.9)).toEqual([]);
  });

  test("PR labels are independent, with an adjustable inclusive threshold", () => {
    const answers = {
      ...pullRequestResponse.answers,
      breaking: { type: "noul", noul: 0.81 } as const,
      security: { type: "noul", noul: 0.8 } as const,
      migration: { type: "noul", noul: 0.1 } as const,
    };

    expect(pullRequestLabels(answers)).toEqual([
      { label: "breaking-change", probability: 0.81 },
      { label: "security-sensitive", probability: 0.8 },
    ]);
    expect(pullRequestLabels(answers, 0.1)).toHaveLength(3);
    expect(pullRequestLabels(answers, 0.82)).toEqual([]);
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

  test("live success is marked as live and keeps the typed answers", async () => {
    const { client, requests } = sdkReturning(customerResponse);
    const response = await handleRun(request({ mode: "live", input: customer.input }), client);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: "live", response: customerResponse });
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
