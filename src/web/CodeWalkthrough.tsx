import { useEffect, useRef, useState } from "react";
import type { DemoId } from "@/catalog";
import type { DemoRun } from "@/run";

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
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/source/${demo}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the source. Refresh to try again.");
        const text = await response.text();
        if (!controller.signal.aborted) setSource(text);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Source unavailable.");
      }
    }
    void load();
    return () => controller.abort();
  }, [demo]);

  return (
    <div className="workspace source-view">
      <section className="pane source-pane" aria-label="Example source">
        <div className="pane-heading">
          <h2>
            <code>src/examples/{demo}.ts</code>
          </h2>
        </div>
        {source ? (
          <SourceCode key={source} source={source} />
        ) : (
          <p className="empty" role="status">
            {error ?? "Loading source…"}
          </p>
        )}
      </section>
      <section className="pane" aria-labelledby="raw-heading">
        <div className="pane-heading">
          <h2 id="raw-heading">Response</h2>
        </div>
        {result ? (
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
