import { useEffect, useId, useRef, useState } from "react";
import "@/web/DiffInput.css";

type Props = { value: string; onChange: (value: string) => void; readOnly: boolean };

function lineType(line: string) {
  if (/^(diff |index |--- |\+\+\+ |new file |deleted file |rename |similarity )/.test(line)) {
    return "metadata";
  }
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "addition";
  if (line.startsWith("-")) return "removal";
  return "context";
}

export function DiffInput({ value, onChange, readOnly }: Props) {
  const [editing, setEditing] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const labelId = useId();
  const contentId = useId();
  const isEditing = editing && !readOnly;

  useEffect(() => {
    if (isEditing) textarea.current?.focus();
  }, [isEditing]);

  return (
    <div className="field diff-field">
      <div className="diff-heading">
        <span id={labelId}>Diff</span>
        {!readOnly ? (
          <button type="button" aria-controls={contentId} onClick={() => setEditing(!editing)}>
            {isEditing ? "View diff" : "Edit diff"}
          </button>
        ) : null}
      </div>
      {isEditing ? (
        <textarea
          id={contentId}
          ref={textarea}
          className="diff-input"
          aria-labelledby={labelId}
          value={value}
          maxLength={12000}
          spellCheck={false}
          onChange={(event) => {
            if (event.target.value !== value) onChange(event.target.value);
          }}
        />
      ) : (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll long diff lines.
        <section id={contentId} className="diff-preview" aria-labelledby={labelId} tabIndex={0}>
          <pre>
            <code>
              {value.split(/(?<=\n)/).map((line, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: These stateless rows represent positions in the displayed diff.
                <span key={index} className={`diff-line diff-${lineType(line)}`}>
                  {line}
                </span>
              ))}
            </code>
          </pre>
        </section>
      )}
    </div>
  );
}
