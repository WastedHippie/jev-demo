import { useEffect, useRef, useState } from "react";
import { type DemoInput, type Mode, presets } from "@/catalog";
import type { ComparisonResult } from "@/compare";
import "@/web/Comparison.css";

type Props = {
  input: DemoInput;
  mode: Mode;
  jevAvailable: boolean;
  llmAvailable: boolean;
  llmModel: string | null;
};

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="comparison-json">
      <summary>{label}</summary>
      <pre className="json-output">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </details>
  );
}

function RequestMetrics({
  model,
  elapsedMs,
  tokens,
}: {
  model: string;
  elapsedMs: number;
  tokens: string;
}) {
  return (
    <dl className="comparison-metrics">
      <div>
        <dt>Returned model</dt>
        <dd>{model}</dd>
      </div>
      <div>
        <dt>Request time</dt>
        <dd>{Math.round(elapsedMs)} ms</dd>
      </div>
      <div>
        <dt>Tokens</dt>
        <dd>{tokens}</dd>
      </div>
    </dl>
  );
}

function JevAnswer({ attempt }: { attempt: ComparisonResult["jev"] }) {
  if (!attempt.ok)
    return (
      <p className="error" role="alert">
        {attempt.error}
      </p>
    );
  const { result, elapsedMs } = attempt;
  const { response } = result;
  return (
    <>
      <RequestMetrics
        model={response.model}
        elapsedMs={elapsedMs}
        tokens={`${response.usage.input_tokens} in / ${response.usage.output_tokens} out`}
      />
      {result.demo === "customer" ? (
        <>
          <h3>Choice</h3>
          <p className="comparison-answer">
            <code>{result.response.answers.reason.choice}</code>
          </p>
          <p className="hint">
            {Math.round(result.response.answers.reason.confidence * 100)}% confidence in the choice
            distribution.
          </p>
          <table className="comparison-probabilities">
            <thead>
              <tr>
                <th>Option</th>
                <th>Probability</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(result.response.answers.reason.probabilities).map(
                ([option, probability]) => (
                  <tr key={option}>
                    <td>
                      <code>{option}</code>
                    </td>
                    <td>{probability.toFixed(2)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <h3>Noul</h3>
          <p className="comparison-answer">
            <code>breakingChange: {result.response.answers.breakingChange.noul.toFixed(2)}</code>
          </p>
          <p className="hint">P(yes), not severity. Your code chooses the threshold for a label.</p>
        </>
      )}
      <JsonDetails label="Exact Jev request" value={result.request} />
      <JsonDetails label="Exact Jev response" value={result.response} />
    </>
  );
}

function LlmAnswer({ attempt }: { attempt: ComparisonResult["llm"] }) {
  if (!attempt.ok)
    return (
      <p className="error" role="alert">
        {attempt.error}
      </p>
    );
  const { result, elapsedMs } = attempt;
  const { response } = result;
  return (
    <>
      <RequestMetrics
        model={response.model}
        elapsedMs={elapsedMs}
        tokens={
          response.usage
            ? `${response.usage.prompt_tokens} in / ${response.usage.completion_tokens} out`
            : "Not returned"
        }
      />
      <h3>Structured JSON</h3>
      <pre className="comparison-answer">
        <code>{JSON.stringify(result.answer, null, 2)}</code>
      </pre>
      <p className="hint">
        A generated {"reason" in result.answer ? "enum value" : "boolean"}. This response does not
        provide a decision probability.
      </p>
      <JsonDetails label="Exact OpenAI request" value={result.request} />
      <JsonDetails label="Exact OpenAI response" value={result.response} />
    </>
  );
}

export function Comparison({ input, mode, jevAvailable, llmAvailable, llmModel }: Props) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const scenario = presets[input.demo].find(
    (preset) => JSON.stringify(preset.input) === JSON.stringify(input),
  );
  const valid =
    input.demo === "customer" ? input.interactions.trim() : input.title.trim() && input.diff.trim();
  const disabledReason =
    mode !== "live"
      ? "Switch to Live mode to compare real model calls."
      : !jevAvailable || !llmAvailable
        ? "Both Jev and OpenAI must be configured on the server to run this comparison."
        : !valid
          ? "Enter an input in the Demo view first."
          : null;

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  async function runComparison() {
    if (disabledReason || pending) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as ComparisonResult | { error: string };
      if (!response.ok || "error" in payload)
        throw new Error(
          "error" in payload ? payload.error : `Comparison failed (${response.status}).`,
        );
      if (request.current === controller) setResult(payload);
    } catch (cause) {
      if (request.current === controller)
        setError(cause instanceof Error ? cause.message : "The comparison request failed.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <article className="model-comparison">
      <header className="comparison-intro">
        <h2>Jev and an LLM, on the same question</h2>
        <p>
          Both receive the same state, question, and criteria, and both return typed outputs. Jev
          returns a native judgment with probabilities; the LLM generates JSON constrained to an
          enum or boolean.
        </p>
        <p className="hint">
          The two calls run concurrently. Times include network and gateway overhead, including
          Portkey where configured; one run is not a benchmark.
        </p>
        <div className="comparison-controls">
          <div>
            <strong>{scenario?.label ?? "Custom input"}</strong>
            <span>
              {llmModel ? `OpenAI comparison: ${llmModel}` : "OpenAI model not configured"}
            </span>
          </div>
          <button
            type="button"
            className="primary"
            disabled={Boolean(disabledReason) || pending}
            onClick={() => void runComparison()}
          >
            {pending ? "Running both models…" : "Run both models"}
          </button>
        </div>
        {disabledReason ? <p className="hint">{disabledReason}</p> : null}
        <JsonDetails label="Current input from the Demo view" value={input} />
      </header>
      {error ? (
        <p className="error comparison-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="workspace comparison-results" aria-busy={pending} aria-live="polite">
        <section className="pane" aria-labelledby="jev-comparison-heading">
          <div className="pane-heading">
            <h2 id="jev-comparison-heading">Jev</h2>
            <span>Native typed judgment</span>
          </div>
          {result ? (
            <JevAnswer attempt={result.jev} />
          ) : (
            <p className="empty">
              {pending ? "Waiting for the comparison…" : "Run both models to see Jev's answer."}
            </p>
          )}
        </section>
        <section className="pane" aria-labelledby="llm-comparison-heading">
          <div className="pane-heading">
            <h2 id="llm-comparison-heading">OpenAI</h2>
            <span>Generative LLM</span>
          </div>
          {result ? (
            <LlmAnswer attempt={result.llm} />
          ) : (
            <p className="empty">
              {pending ? "Waiting for the comparison…" : "Run both models to see the LLM's answer."}
            </p>
          )}
        </section>
      </div>
      <p className="comparison-docs">
        <a href="https://docs.typesafe.ai/concepts/system-one" target="_blank" rel="noreferrer">
          TypeSafe System One
        </a>
        <a
          href="https://developers.openai.com/api/docs/guides/structured-outputs"
          target="_blank"
          rel="noreferrer"
        >
          OpenAI structured outputs
        </a>
      </p>
    </article>
  );
}
