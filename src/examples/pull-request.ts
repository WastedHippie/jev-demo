import { noul, score, type TypeSafeClient } from "@typesafe-ai/sdk";

export function labelPullRequest(client: TypeSafeClient, title: string, diff: string) {
  return client.systemOne({
    state: { title, diff },
    questions: {
      breaking: noul("Does `diff` introduce a backward-incompatible change for API consumers?", {
        true: "An existing endpoint, response field, or accepted input is removed or changed incompatibly",
        false: "An additive compatible change, internal refactor, or documentation-only change",
      }),
      security: noul("Does `diff` change security-sensitive runtime behavior?", {
        true: "Changes authentication, authorization, or handling of secrets or sensitive data",
        false: "Only mentions security in docs/tests, or changes unrelated runtime behavior",
      }),
      migration: noul("Does `diff` require a database schema migration or stored-data backfill?", {
        true: "Changes persisted schema or data representation requiring migration of existing data",
        false: "No persisted schema change or data backfill is needed",
      }),
      blastRadius: score(
        "How broadly could a regression in the executable changes in `diff` affect users?",
        [
          "No executable behavior changes; documentation, comments, or tests only",
          "A local optional feature or isolated presentation behavior",
          "A core feature or public endpoint used by a subset of workflows",
          "Cross-cutting authentication, authorization, or transaction integrity across workflows",
        ],
      ),
    },
  });
}

export type PullRequestResponse = Awaited<ReturnType<typeof labelPullRequest>>;

export function pullRequestLabels(answers: PullRequestResponse["answers"], threshold = 0.8) {
  return [
    { label: "breaking-change", probability: answers.breaking.noul },
    { label: "security-sensitive", probability: answers.security.noul },
    { label: "needs-migration", probability: answers.migration.noul },
  ].filter(({ probability }) => probability >= threshold);
}
