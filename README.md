# Jev demo

A 15-minute TypeScript and Bun demo for engineers: turn fictional bank support logs and pull request diffs into typed judgments, then apply a few ordinary code rules.

The main example labels current **service needs** from interaction history. The second applies the same pattern to PR labels. The model supplies judgments; TypeScript decides which labels to display.

## How is this different from a generative LLM?

Jev is a specialized language model for focused decisions, called a **System One** model by TypeSafe. Its documented training focus is calibrated decisions. Compare its programming interface and intended jobs:

| | Jev | A generative LLM |
| --- | --- | --- |
| Typical job | Choose an option, judge a condition, or score a defined dimension. | Generate content, explain, or reason through open-ended work. |
| Interface | `Choice`, `Noul`, and `Score`, with answer probabilities. | Generated content; many APIs also support structured output and tools. |
| Composition | Batch independent questions, then combine their answers in code. | Can also be orchestrated by code and return typed, constrained values. |

The distinction is specialization and API contract. A general LLM can classify and provide probability information too. This demo shows Jev's decision interface; it does not benchmark it against another model or establish a cost or latency advantage. Use an appropriate generative model when the output needs an explanation or open-ended reasoning. See [System One](https://docs.typesafe.ai/concepts/system-one).

## Run it

Install [Bun](https://bun.sh), then on a fresh clone:

```sh
bun install
cp .env.example .env
# Set TYPESAFE_API_KEY in .env if you want live requests.
bun dev
```

Open [localhost:3000](http://localhost:3000). Bun loads `.env` automatically; the SDK reads the key on the server. Restart the server after changing the key. `.env` is ignored by Git. `TYPESAFE_MODEL` defaults to `jev-1.13.0`.

**Recorded** mode uses saved responses from actual API calls and works without a key. The result identifies its mode, model, and capture time. Switching to recorded mode is explicit; a failed live call never silently becomes a recording. Recorded results cover the included presets.

Start with **Still blocked**, then **Resolved since then**. Follow with the PR preset **Small cleanup?**. See the [presenter guide](docs/presenter.md) for the full 15-minute walkthrough.

## What to demonstrate

| Example | The interesting part |
| --- | --- |
| Customer: Still blocked | Infer an owner and several service labels from a history of contacts. |
| Customer: Resolved since then | A later resolution changes the current state, including an earlier request for a person. |
| Customer: Different issues | Multiple contacts do not necessarily mean repeated contact about the same issue. |
| PR: Small cleanup? | An incompatible API response can matter despite a harmless title. |
| PR: Access control change | Independent security and migration labels can both apply. |
| PR: Security in name only | Evaluate what the diff changes, including when it only changes documentation. |

Run once, inspect the raw answers, then move the label threshold. The labels update from the existing answers without another API call. Editing the evidence requires a new run.

## Walk through these files

| File | What to explain |
| --- | --- |
| [src/examples/customer.ts](src/examples/customer.ts) | `labelCustomer`: one request, five questions. `customerLabels`: explicit threshold rules. |
| [src/examples/pull-request.ts](src/examples/pull-request.ts) | `labelPullRequest`: the same pattern over a title and diff. `pullRequestLabels`: independent labels. |
| [src/client.ts](src/client.ts) | SDK configuration and model selection. |
| [src/catalog.ts](src/catalog.ts) | The fictional inputs and preset cases. |
| [src/recordings.json](src/recordings.json) | Captured API responses used by recorded mode. |

The example files contain the SDK calls directly. Start there; the web interface is presentation scaffolding.

| Primitive | Meaning in this demo |
| --- | --- |
| `choice` | One owner from a fixed set, including `none`. |
| `noul` | Probability that an individual condition holds. Several conditions can be true. |
| `score` | Expected position on the example's ordered 0-3 rubric. |

Questions in a request share the input and are evaluated independently; they cannot read one another's answers. The SDK infers answer types from the question definitions. See the [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) and [primitives](https://docs.typesafe.ai/primitives).

A Noul of `0.5` signals uncertainty, not medium severity. A Score is a rubric position, not a probability. Choice and Score confidence describes concentration of their answer distributions, not guaranteed correctness. The default `0.8` label threshold is an illustration, not a threshold calibrated to bank policy. See [confidence](https://docs.typesafe.ai/confidence).

## Terminal and maintenance

```sh
bun demo customer 1
bun demo customer 2
bun demo pull-request 1
```

The terminal commands make live requests and print the answers and derived labels. Preset numbers are `1`, `2`, or `3` for either example.

| Command | Purpose |
| --- | --- |
| `bun dev` | Start the demo with automatic reload. |
| `bun run record` | Call the API for all six presets and replace the saved recordings. |
| `bun run check` | Check types and code style. |
| `bun test` | Test batching, label rules, replay, validation, and error handling without an API key. |
| `bun run build` | Verify the browser bundle. |
| `bun start` | Run the Bun server in production mode. |

A build is not required before starting the server. Refresh recordings after changing the questions or presets, then rehearse the outputs before presenting. Live probabilities and latency can vary; a recording is a captured result, not an accuracy or performance benchmark.

All fixtures are fictional. Live mode sends the selected inputs to TypeSafe. The demo does not connect to bank systems or apply labels on GitHub; it labels support needs and code changes, not customer worth, creditworthiness, or fraud propensity.
