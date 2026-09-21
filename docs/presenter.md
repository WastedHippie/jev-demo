# A 15-minute Jev walkthrough

Two examples, one question each. Show the input, run the question, inspect the request and response, then read the small function that connects them.

## Before the room

- Run `bun install`, configure `.env`, and start `bun dev`.
- Open [localhost:3000](http://localhost:3000). Rehearse **Replace a card**, **Rename a response field**, and **Add an optional field** in Live mode.
- Check Recorded mode too. It shows actual saved API results with their model and capture time.
- Open `src/examples/customer.ts` and `src/examples/pull-request.ts` in your editor. Increase the font size for the room.
- Keep a terminal ready using the commands at the end.

## The two-minute introduction

“Jev is a specialized language model for focused decisions. TypeSafe calls this System One and describes its training focus as calibrated decisions. Here's how the interface compares with a generative LLM.”

| | Jev | A generative LLM |
| --- | --- | --- |
| Intended job | A bounded judgment about supplied evidence. | Generation, explanation, and open-ended reasoning. |
| Result | A Choice, Noul, or Score with answer probabilities. | Content, often with structured output and tool support. |
| Our code | Uses those values to decide what happens next. | Can also enforce typed outputs and control a workflow. |

“Structured output, probability information, and code orchestration are not unique to Jev. The distinction is specialization: focused questions and distributions are the primary API. We'll look at two tiny examples, using Choice and Noul.”

This is an interface demonstration, not a model benchmark. Avoid claims about different neural architectures or unmeasured speed and cost. See [System One](https://docs.typesafe.ai/concepts/system-one).

## Run of show

| Time | Show | Say or do |
| --- | --- | --- |
| 0:00-2:00 | **Jev vs LLM** | Give the introduction above. Establish that both examples ask one question. |
| 2:00-4:00 | Customer **Replace a card**, **Demo** | Read the fictional contact. Ask which reason the audience expects, then **Run example**. Inspect the selected reason and option probabilities. |
| 4:00-6:00 | Customer **Source** | Read `labelCustomer` in order: evidence, one `choice` question, available reasons, and the SDK call. Show the inferred answer type. |
| 6:00-8:00 | **Request & response** | Point to `model`, `state.interactions`, and `questions.reason`. Find `response.answers.reason.choice` and its probabilities. This is the actual request object passed to the SDK, alongside the returned response. |
| 8:00-10:00 | PR **Rename a response field**, then **Add an optional field** | Inspect the diff before running each. Removing `name` changes the existing contract; adding `avatarUrl` retains it. Compare the returned yes probabilities. |
| 10:00-12:00 | PR **Source** | Read the single `breakingChange` question and its yes/no criteria. Show `pullRequestLabels`: a probability comparison produces `breaking-change` or no label. |
| 12:00-13:00 | PR threshold | Move the threshold. This reuses the answer; no inference runs again. Clear cases may keep the same label across the available range. |
| 13:00-15:00 | Questions | “We supplied evidence, asked one focused question, and used the typed result in ordinary code.” Take questions. |

## Keep the code explanation small

For the customer example, follow four steps:

1. `state` contains the contact to classify.
2. `choice` defines one question and four allowed reasons, including `other`.
3. `client.systemOne(request)` returns an answer whose type follows those options.
4. `response.answers.reason.choice` is the displayed label. There is no customer threshold rule.

For the PR, change only the concept being introduced: `noul` answers whether the supplied diff breaks the public contract. `response.answers.breakingChange.noul` feeds a simple threshold comparison.

Both functions return `{ request, response }`, so the workbench can show what went in and what came back. The API key is server-side and is not part of the displayed request object. The [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) documents the call.

Keep server setup and interface code out of the walkthrough. Score and batching exist, but are optional discussion topics after the two examples.

## Questions to be ready for

- **“Is `0.5` a moderately breaking change?”** No. A Noul near `0.5` means uncertainty about yes versus no. It does not measure severity.
- **“What does Choice confidence tell us?”** It summarizes how concentrated the option probabilities are. It does not prove the answer correct. See [confidence](https://docs.typesafe.ai/confidence).
- **“Why `0.8`?”** It is an illustrative PR label threshold. Choose a real threshold using labelled examples and the consequences of errors.
- **“Could another LLM do this?”** Yes. We are inspecting Jev's specialized decision interface, not claiming classification is unique to it.
- **“What would we test?”** Test the deterministic threshold rule normally. Evaluate the model separately using labelled contacts and diffs.

## If something goes wrong

**API unavailable:** select Recorded mode and the same scenario. Say: “This is an actual API result saved at the time shown.” You can still inspect the source, request, response, and PR threshold. Edited inputs need a live request.

**Browser unavailable:** use the live terminal path:

```sh
bun demo customer 1
bun demo pull-request 1
bun demo pull-request 2
```

**Unexpected judgment:** keep it visible. Compare the input and question with the result. Treat it as an evaluation case, rather than changing the story to call it correct.

The other scenarios are optional swaps: **Question a charge**, **Access the app**, and PR **Documentation only**. The last demonstrates that mentioning breaking changes in docs does not itself alter an API contract. Keep the primary walkthrough inside 15 minutes.
