# Jev demo

A 15-minute TypeScript and Bun demo for engineers. Two small examples each ask **one question**:

- **Customer label:** choose the reason for a fictional customer's contact.
- **PR label:** judge whether a diff breaks a public API contract.

The workbench keeps the input, actual request, response, and source available to inspect.

## Run it

Install [Bun](https://bun.sh), then on a fresh clone:

```sh
bun install
cp .env.example .env
# Set TYPESAFE_API_KEY in .env for live requests.
bun dev
```

Open [localhost:3000](http://localhost:3000). Bun loads `.env` automatically; the SDK reads the key on the server. Restart after changing the key. `.env` is ignored by Git. `TYPESAFE_MODEL` defaults to `jev-1.13.0`.

Choose a scenario, then **Run example**. Use **Demo** for the input and result, **Request & response** for the JSON, **Source** for the example code, and **Jev vs LLM** for the comparison.

**Recorded** mode uses saved results from actual API calls and works without a key. Each result identifies its mode, model, and capture time. There is no automatic fallback from a failed live call to a recording. Recordings cover the included scenarios; edited inputs require Live mode.

Start with **Replace a card**, then **Rename a response field**. The [presenter guide](docs/presenter.md) covers the 15-minute walkthrough.

## The two examples

| Example | Question | Typed result |
| --- | --- | --- |
| Customer | What is the reason for this contact? | A `Choice`: `card_replacement`, `payment_query`, `online_banking`, or `other`. |
| Pull request | Does this diff introduce a backward-incompatible public API change? | A `Noul`: the probability of yes, from `0` to `1`. |

Customer scenarios are **Replace a card**, **Question a charge**, and **Access the app**. Each has one intent. The chosen reason becomes the customer label directly.

PR scenarios are **Rename a response field**, **Add an optional field**, and **Documentation only**. They contrast a removed contract field, a compatible addition, and words in documentation. A local comparison applies `breaking-change` when the probability meets the threshold, initially `0.8`.

Changing the PR threshold reuses the existing answer without another request. Customer labels do not use that threshold. Changing the input or scenario requires a fresh run.

## Walk through the code

| File | What to explain |
| --- | --- |
| [src/examples/customer.ts](src/examples/customer.ts) | `labelCustomer`: state, one `choice` question, and one SDK call. |
| [src/examples/pull-request.ts](src/examples/pull-request.ts) | `labelPullRequest`: one `noul` question. `pullRequestLabels`: one probability comparison. |
| [src/client.ts](src/client.ts) | Model selection and server-side SDK configuration. |
| [src/catalog.ts](src/catalog.ts) | The fictional inputs and scenario definitions. |
| [src/recordings.json](src/recordings.json) | The captured results for Recorded mode. |

Both example functions build a `request` object, pass it to `client.systemOne(request)`, and return `{ request, response }`. The **Request & response** view shows that actual SDK input, including `model`, `state`, and `questions`, alongside its response. The API key stays on the server.

The SDK infers answer types from the question definitions. Inspect `response.answers.reason.choice` for the customer and `response.answers.breakingChange.noul` for the PR. See the [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) and [primitives](https://docs.typesafe.ai/primitives).

A Noul near `0.5` means uncertainty, not a moderately breaking change. Choice confidence summarizes concentration of the option probabilities, not guaranteed correctness. The PR's `0.8` threshold is illustrative and needs evaluation for a real workflow. See [confidence](https://docs.typesafe.ai/confidence).

## How does Jev differ from a generative LLM?

TypeSafe calls Jev a **System One** model and describes its training focus as calibrated decisions.

| | Jev | A generative LLM |
| --- | --- | --- |
| Intended job | Focused judgments over supplied evidence. | Generation, explanation, and open-ended reasoning. |
| Interface | Choice, Noul, and Score, with answer probabilities. | Content; many APIs also support structured output and tools. |
| Application code | Consumes typed judgments and controls what happens next. | Can also enforce typed outputs and orchestrate a workflow. |

General LLMs can classify and provide probability information too. Jev's distinction is its specialization and decision interface. This demo uses Choice and Noul; Score is another primitive, outside the walkthrough. It does not benchmark models or establish a speed or cost advantage. See [System One](https://docs.typesafe.ai/concepts/system-one).

## Terminal and maintenance

```sh
bun demo customer 1
bun demo pull-request 1
bun demo pull-request 2
```

The terminal commands make live requests. Scenario numbers are `1`, `2`, or `3` for either example.

| Command | Purpose |
| --- | --- |
| `bun dev` | Start the demo with automatic reload. |
| `bun run record` | Call the API for all six scenarios and replace the saved recordings. |
| `bun run check` | Check types and code style. |
| `bun test` | Run the local tests without an API key. |
| `bun run build` | Verify the browser bundle. |
| `bun start` | Run the Bun server in production mode. |

A build is not required before starting the server. Refresh recordings after changing the questions or scenarios, then rehearse before presenting. Live probabilities and elapsed times can vary.

All fixtures are fictional. Live mode sends the selected inputs to TypeSafe. The demo does not connect to bank systems or apply GitHub labels. Customer labels describe contact reasons, not customer eligibility or risk.
