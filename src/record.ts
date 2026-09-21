import { presets } from "@/catalog";
import { createClient } from "@/client";
import { type Recording, runDemo } from "@/run";

const client = createClient();
const recordings: Recording[] = [];

for (const { label, input } of Object.values(presets).flat()) {
  const started = performance.now();
  const result = await runDemo(client, input);
  recordings.push({
    input,
    result: {
      ...result,
      source: "recorded",
      elapsedMs: Math.round(performance.now() - started),
      capturedAt: new Date().toISOString(),
    },
  });
  console.log(`Recorded ${input.demo}: ${label}`);
}

// Only replace the file after every call succeeds. No credentials are saved.
await Bun.write(
  new URL("./recordings.json", import.meta.url),
  `${JSON.stringify(recordings, null, 2)}\n`,
);
