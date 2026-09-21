import { useEffect, useRef, useState } from "react";
import { type DemoInput, type Mode, presets } from "@/catalog";
import type { DemoRun } from "@/run";

type Config = {
  liveAvailable: boolean;
  model: string;
  openaiAvailable: boolean;
  openaiModel: string | null;
};

export function useDemo() {
  const [config, setConfig] = useState<Config | null>(null);
  const [input, setInput] = useState<DemoInput>(
    presets.customer[0]?.input ?? { demo: "customer", interactions: "" },
  );
  const [mode, setMode] = useState<Mode>("recorded");
  const [result, setResult] = useState<DemoRun | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadConfig() {
      try {
        const response = await fetch("/api/config", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load the demo configuration.");
        const next = (await response.json()) as Config;
        if (controller.signal.aborted) return;
        setConfig(next);
        setMode(next.liveAvailable ? "live" : "recorded");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setConfig({
          liveAvailable: false,
          model: "Jev",
          openaiAvailable: false,
          openaiModel: null,
        });
        setError(cause instanceof Error ? cause.message : "Could not connect to the demo server.");
      }
    }
    void loadConfig();
    return () => {
      controller.abort();
      request.current?.abort();
      request.current = null;
    };
  }, []);

  function clearResult() {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setPending(false);
    setError(null);
  }

  function changeInput(next: DemoInput) {
    clearResult();
    setInput(next);
  }

  function changeMode(next: Mode) {
    clearResult();
    setMode(next);
    if (next === "recorded") {
      const options = presets[input.demo];
      const match = options.find(
        (preset) => JSON.stringify(preset.input) === JSON.stringify(input),
      );
      const preset = match ?? options[0];
      if (preset) setInput(preset.input);
    }
  }

  async function execute() {
    clearResult();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as DemoRun | { error: string };
      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : `Request failed (${response.status}).`,
        );
      }
      if (request.current === controller) setResult(payload);
    } catch (cause) {
      if (request.current !== controller) return;
      setError(cause instanceof Error ? cause.message : "The request failed. Try again.");
    } finally {
      if (request.current === controller) {
        setPending(false);
        request.current = null;
      }
    }
  }

  return { config, input, mode, result, pending, error, changeInput, changeMode, execute };
}
