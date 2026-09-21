import { presets } from "@/catalog";
import { createClient } from "@/client";
import { customerLabels } from "@/examples/customer";
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
  const result = await runDemo(createClient(), preset.input);
  const labels =
    result.demo === "customer"
      ? customerLabels(result.response.answers)
      : pullRequestLabels(result.response.answers);

  console.log(`${preset.label}\n`);
  console.log(JSON.stringify(result.response, null, 2));
  console.log("\nLabels:", labels.map(({ label }) => label).join(", ") || "None");
  console.log(`${result.response.model} | ${Math.round(performance.now() - started)} ms`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "The Jev request failed.");
  process.exitCode = 1;
}
