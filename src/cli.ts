import { inputSchema, presets } from "@/catalog";
import { createClient } from "@/client";
import { pullRequestLabels } from "@/examples/pull-request";
import { runDemo } from "@/run";

const [demo, presetIndex = "1"] = process.argv.slice(2);
if (demo !== "customer" && demo !== "pull-request") {
  console.log("Usage: bun demo <customer|pull-request> [preset 1-3]");
  process.exit(demo ? 1 : 0);
}

const preset = presets[demo][Number(presetIndex) - 1];
if (!preset) {
  console.error("Choose preset 1, 2, or 3.");
  process.exit(1);
}

try {
  const started = performance.now();
  const result = await runDemo(createClient(), inputSchema.parse(preset.input));
  const labels =
    result.demo === "customer"
      ? [result.response.answers.reason.choice]
      : pullRequestLabels(result.response.answers);

  console.log(`${preset.label}\n`);
  console.log("POST https://api.typesafe.ai/v1/systemone");
  console.log(JSON.stringify(result.request, null, 2));
  console.log("\nResponse:");
  console.log(JSON.stringify(result.response, null, 2));
  console.log("\nLabels:", labels.join(", ") || "None");
  console.log(`${result.response.model} | ${Math.round(performance.now() - started)} ms`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "The Jev request failed.");
  process.exitCode = 1;
}
