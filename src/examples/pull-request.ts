import { noul, type TypeSafeClient } from "@typesafe-ai/sdk";

export async function labelPullRequest(client: TypeSafeClient, title: string, diff: string) {
  const request = {
    model: client.defaultModel,
    state: { title, diff },
    questions: {
      breakingChange: noul("Does `diff` break the existing public API contract?", {
        true: "Removes or incompatibly changes an endpoint, response field, or accepted input",
        false: "Adds compatible optional data, refactors internally, or changes only documentation",
      }),
    },
  };

  const response = await client.systemOne(request);
  return { request, response };
}

export type PullRequestResponse = Awaited<ReturnType<typeof labelPullRequest>>["response"];

export function pullRequestLabels(answers: PullRequestResponse["answers"], threshold = 0.8) {
  return answers.breakingChange.noul >= threshold ? ["breaking-change"] : [];
}
