import { type DemoInput, type Mode, presets } from "@/catalog";
import { DiffInput } from "@/web/DiffInput";

type Props = {
  input: DemoInput;
  mode: Mode;
  pending: boolean;
  ready: boolean;
  onChange: (input: DemoInput) => void;
  onRun: () => void;
};

export function InputPanel({ input, mode, pending, ready, onChange, onRun }: Props) {
  const options = presets[input.demo];
  const selected = options.findIndex(
    (preset) => JSON.stringify(preset.input) === JSON.stringify(input),
  );
  const recorded = mode === "recorded";
  const valid =
    input.demo === "customer" ? input.interactions.trim() : input.title.trim() && input.diff.trim();

  return (
    <section className="pane input-pane" aria-labelledby="input-heading">
      <div className="pane-heading">
        <h2 id="input-heading">Input</h2>
        <span>
          {input.demo === "customer" ? "Synthetic support history" : "Example pull request"}
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRun();
        }}
      >
        <div className="run-controls">
          <label htmlFor="scenario">
            Scenario
            <select
              id="scenario"
              value={selected}
              onChange={(event) => {
                const preset = options[Number(event.target.value)];
                if (preset) onChange(preset.input);
              }}
            >
              {selected === -1 ? <option value={-1}>Custom input</option> : null}
              {options.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="primary" disabled={!ready || !valid || pending}>
            {pending ? "Running…" : recorded ? "Replay" : "Run example"}
          </button>
        </div>

        {input.demo === "customer" ? (
          <label className="field" htmlFor="interactions">
            Interaction history
            <textarea
              id="interactions"
              className="context-input"
              value={input.interactions}
              readOnly={recorded}
              maxLength={12000}
              spellCheck={false}
              onChange={(event) => onChange({ ...input, interactions: event.target.value })}
            />
          </label>
        ) : (
          <>
            <label className="field" htmlFor="pr-title">
              Title
              <input
                id="pr-title"
                value={input.title}
                readOnly={recorded}
                maxLength={12000}
                onChange={(event) => onChange({ ...input, title: event.target.value })}
              />
            </label>
            <DiffInput
              value={input.diff}
              readOnly={recorded}
              onChange={(diff) => onChange({ ...input, diff })}
            />
          </>
        )}
        <p className="hint">
          {recorded
            ? "Recorded inputs are read-only. Switch to Live to edit."
            : "Edit the input and run again to compare the judgments."}
        </p>
      </form>
    </section>
  );
}
