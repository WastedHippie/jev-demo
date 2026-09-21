# A 15-minute Jev walkthrough

The point to land: **a small model judgment can become an ordinary typed value in a program.** The example code is the centre of the demo.

## Before the room

- Run `bun install`, configure `.env`, and start `bun dev`.
- Open [localhost:3000](http://localhost:3000). Rehearse the three primary presets below in Live mode and inspect their raw answers.
- Check Recorded mode too. It replays actual captured API responses for the presets, with model and capture time shown.
- Have `src/examples/customer.ts` and `src/examples/pull-request.ts` open in your editor. Increase the font size enough to read from the back of the room.
- Keep a terminal ready. The commands at the end cover a browser failure; Recorded mode covers an unavailable API.

## The two-minute introduction

“Jev is a specialized language model for small, focused decisions. TypeSafe calls this System One and describes its training focus as calibrated decisions. Let's compare the interface with the generative LLMs we already use.”

| | Jev | A generative LLM |
| --- | --- | --- |
| Intended job | Bounded judgments over supplied evidence. | Generation, explanation, and open-ended reasoning. |
| Result | Choice, Noul, or Score, with answer probabilities. | Content, often with structured output and tool support. |
| Workflow | Independent questions in one call; code combines answers. | Code can also orchestrate calls and enforce typed outputs. |

“Structured output, probability information, and code orchestration are not unique to Jev. The interesting part is the specialization: focused questions and distributions are the primary API. We'll use those values directly. We are not measuring this against an LLM today.”

Avoid claims about different neural architectures or unmeasured speed and cost. The displayed elapsed time measures this Jev request only. [System One](https://docs.typesafe.ai/concepts/system-one) describes the intended model role.

## Run of show

| Time | Show | Say or do |
| --- | --- | --- |
| 0:00-2:00 | Introduction above | Set up the comparison, then introduce the fictional support history: “We want an owner and a few current service labels.” |
| 2:00-4:00 | **Still blocked**, Live mode | Read the short history, ask the room which labels they expect, then run once. Compare owner, label probabilities, and the friction score with the evidence. |
| 4:00-7:00 | `src/examples/customer.ts` | Walk through state, questions, and returned answers in `labelCustomer`. Explain the three primitive types below. Five independent questions share one request. |
| 7:00-9:00 | `customerLabels`, then the threshold control | Show the small filter that turns probabilities into labels. Move the threshold across an observed probability and watch a label change. The model is not called again. |
| 9:00-10:00 | **Resolved since then** | Read the newer resolution and run. Compare current service needs with the earlier case. The intended distinction is that an old problem and request for a person no longer describe an active need. Discuss the actual output if it disagrees. |
| 10:00-12:00 | PR **Small cleanup?**, then `src/examples/pull-request.ts` | Inspect the actual response-shape change and run. Walk through `labelPullRequest` and `pullRequestLabels`. It is the same programming pattern with different evidence and questions. |
| 12:00-14:00 | Raw response and the example code | Address the likely engineering questions below. If time permits, let someone edit one input and predict what changes before rerunning. |
| 14:00-15:00 | Questions | “The useful unit here is a typed judgment. We can test and change the rules that consume it.” Leave time for one question. |

## The code explanation

Use `labelCustomer` as the main walkthrough, in this order:

1. **State:** `interactions` is the evidence. The request contains the history needed to interpret the current situation.
2. **Choice:** `owner` selects one option, including `none` when nothing remains to route.
3. **Nouls:** `unresolved`, `repeatContact`, and `wantsHuman` are separate yes/no judgments. Multiple labels may apply.
4. **Score:** `friction` uses four defined levels from `0` to `3`; its value can sit between levels.
5. **Composition:** `customerLabels` compares the returned probabilities with a threshold. This rule is local TypeScript.

Show an inferred answer type in the editor if convenient. No generated prose needs to be parsed into the domain values. Each question must be understandable from the state and its own instructions; another question's answer is not input to it. The [primitives documentation](https://docs.typesafe.ai/primitives) explains this contract.

Keep `src/client.ts` to a brief glance for model and server-side configuration. Spend the code time on the two example files, not the interface or server setup.

## Questions to be ready for

- **“Is `0.8` an 80% severity?”** A Noul is the probability of yes for its question. Around `0.5` means uncertainty. Severity or degree belongs in a Score with a defined rubric.
- **“What does confidence guarantee?”** Choice and Score confidence summarizes how concentrated their distributions are. It does not prove the judgment is correct. Thresholds need evaluation on representative cases. See [confidence](https://docs.typesafe.ai/confidence).
- **“Could we do this with another model?”** Yes. The feature to inspect here is the interface: focused questions, inferred answer types, probabilities, and application rules that can reuse those answers.
- **“What would we test?”** Test the deterministic label rules normally. Evaluate model judgments separately against labelled examples, especially resolutions, ambiguous histories, and irrelevant wording.
- **“Why one request?”** These questions use the same evidence and do not depend on one another's answers. A later question that needs new evidence based on an earlier answer would need a further request.

This demo concerns service needs and code changes. A banking deployment would need domain evaluation and approved data handling; the demo uses fictional inputs and makes no decisions about customer eligibility.

## If something goes wrong

**API unavailable:** select Recorded mode and the same preset. Say: “This is a saved response from the API, captured at the time shown.” You can still inspect the source, raw answers, and local threshold behaviour. Edited inputs need a live request.

**Browser unavailable:** run the live terminal path:

```sh
bun demo customer 1
bun demo customer 2
bun demo pull-request 1
```

**Unexpected judgment:** leave it visible. Compare the exact evidence and question with the answer. Treat it as a useful evaluation case; do not call a prediction correct just because it matches the intended story.

## Optional swaps, not extra agenda

- **Different issues:** show why several contacts need not mean a repeat of the same unresolved issue.
- **Access control change:** show that security and migration labels can both apply.
- **Security in name only:** show that a documentation-only diff can contain alarming words without changing executable behaviour.

Use one of these instead of an existing case if it suits the audience. Keep the demo inside 15 minutes.
