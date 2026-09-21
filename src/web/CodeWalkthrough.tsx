import { useEffect, useRef, useState } from "react";
import type { DemoId } from "@/catalog";
import type { DemoRun } from "@/run";
import "@/web/Comparison.css";

function SourceCode({ source }: { source: string }) {
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      const [{ default: hljs }, { default: typescript }] = await Promise.all([
        import("highlight.js/lib/core"),
        import("highlight.js/lib/languages/typescript"),
      ]);
      if (cancelled || !element.current) return;
      hljs.registerLanguage("typescript", typescript);
      hljs.highlightElement(element.current);
    }
    // Highlighting is optional; the source stays readable if it cannot load.
    void highlight().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <pre className="source-code">
      <code ref={element} className="language-typescript">
        {source}
      </code>
    </pre>
  );
}

export function CodeWalkthrough({ demo, result }: { demo: DemoId; result: DemoRun | null }) {
  const [example, setExample] = useState<"jev" | "openai">("jev");
  const [source, setSource] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const sourceId = example === "openai" ? "openai" : demo;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/source/${sourceId}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the source. Refresh to try again.");
        const text = await response.text();
        if (!controller.signal.aborted) setSource({ id: sourceId, text });
      } catch (cause) {
        if (!controller.signal.aborted)
          setError({
            id: sourceId,
            message: cause instanceof Error ? cause.message : "Source unavailable.",
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [sourceId]);

  return (
    <div className="workspace source-view">
      <section className="pane source-pane" aria-label="Example source">
        <div className="pane-heading">
          <h2>
            <code>{example === "openai" ? "src/openai.ts" : `src/examples/${demo}.ts`}</code>
          </h2>
          <label className="source-selector" htmlFor="source-example">
            Source
            <select
              id="source-example"
              value={example}
              onChange={(event) => setExample(event.target.value as "jev" | "openai")}
            >
              <option value="jev">Jev example</option>
              <option value="openai">OpenAI comparison</option>
            </select>
          </label>
        </div>
        {source?.id === sourceId ? (
          <SourceCode key={source.text} source={source.text} />
        ) : (
          <p className="empty" role="status">
            {error?.id === sourceId ? error.message : "Loading source…"}
          </p>
        )}
      </section>
      <section className="pane" aria-labelledby="raw-heading">
        <div className="pane-heading">
          <h2 id="raw-heading">
            {example === "openai" ? "Inspect the comparison" : "Jev response"}
          </h2>
        </div>
        {example === "openai" ? (
          <p className="empty">
            Open Jev vs LLM to inspect the exact OpenAI request and response alongside Jev's result.
          </p>
        ) : result ? (
          <pre className="json-output source-response">
            <code>{JSON.stringify(result.response, null, 2)}</code>
          </pre>
        ) : (
          <p className="empty">Run an example in the Demo view first.</p>
        )}
      </section>
    </div>
  );
}
