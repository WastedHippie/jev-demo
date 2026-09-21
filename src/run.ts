import type { TypeSafeClient } from "@typesafe-ai/sdk";
import type { DemoInput } from "@/catalog";
import { labelCustomer } from "@/examples/customer";
import { labelPullRequest } from "@/examples/pull-request";

export async function runDemo(client: TypeSafeClient, input: DemoInput) {
  switch (input.demo) {
    case "customer":
      return { demo: input.demo, response: await labelCustomer(client, input.interactions) };
    case "pull-request":
      return {
        demo: input.demo,
        response: await labelPullRequest(client, input.title, input.diff),
      };
  }
}

export type DemoResult = Awaited<ReturnType<typeof runDemo>>;
export type DemoRun = DemoResult & {
  source: "live" | "recorded";
  elapsedMs: number;
  capturedAt: string;
};

export type Recording = { input: DemoInput; result: DemoRun };
