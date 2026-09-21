export function Comparison() {
  return (
    <article className="comparison">
      <h2>Why use this instead of a generative LLM?</h2>
      <p>
        Both can classify text. Both can be used from ordinary code. Many LLM APIs also support
        structured JSON. Jev's difference is its focus on small decisions and their probability
        distributions.
      </p>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Jev</th>
            <th>Generative LLM</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Task</th>
            <td>A focused judgment over supplied context</td>
            <td>Writing, explanation, code, or open-ended reasoning</td>
          </tr>
          <tr>
            <th>Output</th>
            <td>Choice, Noul, or Score, with probabilities</td>
            <td>Generated text, including constrained JSON in many APIs</td>
          </tr>
          <tr>
            <th>Uncertainty</th>
            <td>
              Decision probabilities are part of the API; TypeSafe trains for calibrated decisions
            </td>
            <td>Varies by model and API; a prompted confidence number needs its own evaluation</td>
          </tr>
          <tr>
            <th>Composition</th>
            <td>Batch independent questions, then combine answers in code</td>
            <td>Can also be orchestrated in code and use tools</td>
          </tr>
        </tbody>
      </table>
      <h3>The three values in this demo</h3>
      <ul>
        <li>
          <code>Choice</code>: one support owner from a set, including <code>none</code>.
        </li>
        <li>
          <code>Noul</code>: probability that one condition is true. Several labels can apply.
        </li>
        <li>
          <code>Score</code>: expected position on an ordered rubric. Here, the range is 0 to 3.
        </li>
      </ul>
      <p>
        Questions in a batch cannot read each other's answers. Code controls the threshold and what
        to do with the results. Use a generative model when you need an explanation or a reply.
      </p>
      <p className="hint">
        These examples are not a comparative benchmark. The time shown is the duration of this Jev
        request. Typed output and high confidence do not guarantee a correct judgment.
      </p>
      <a href="https://docs.typesafe.ai/concepts/system-one" target="_blank" rel="noreferrer">
        TypeSafe's System One documentation
      </a>
    </article>
  );
}
