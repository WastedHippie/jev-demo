import { TypeSafeClient } from "@typesafe-ai/sdk";

export function createClient() {
  return new TypeSafeClient({
    defaultModel: process.env.TYPESAFE_MODEL || "jev-1.13.0",
    timeout: 15_000,
    retry: { maxRetries: 1, maxRetryAfterMs: 2_000 },
  });
}
