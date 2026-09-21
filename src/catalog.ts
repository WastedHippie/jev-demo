import { z } from "zod";

const text = z.string().trim().min(1).max(12_000);

export const inputSchema = z.discriminatedUnion("demo", [
  z.object({ demo: z.literal("customer"), interactions: text }),
  z.object({ demo: z.literal("pull-request"), title: text, diff: text }),
]);

export const runSchema = z.object({ mode: z.enum(["live", "recorded"]), input: inputSchema });
export type DemoInput = z.infer<typeof inputSchema>;
export type DemoId = DemoInput["demo"];
export type Mode = z.infer<typeof runSchema>["mode"];

export const demos = {
  customer: {
    title: "Read between the interactions.",
    nav: "Customer signals",
    description: "A short support history becomes typed, reusable signals for your application.",
    questionCount: 5,
    takeaway: "One history. Five independent judgments. Your code decides which labels to apply.",
  },
  "pull-request": {
    title: "Read the change, not the title.",
    nav: "Pull request labels",
    description: "A small diff becomes a set of labels based on what the code actually changes.",
    questionCount: 4,
    takeaway:
      "Several labels can apply at once. Each Noul answers one independent yes/no question.",
  },
};

export const presets = {
  customer: [
    {
      label: "Still blocked",
      input: {
        demo: "customer",
        interactions: `Monday, 09:10 | Customer
I can't sign into the mobile app. It says my device isn't recognised.

Monday, 09:18 | Support
Please reinstall the app and register your device again.

Tuesday, 12:30 | Customer
I've reinstalled twice and tried registering again. Still the same error. I need to make a transfer today.

Wednesday, 08:45 | Customer
This is my third time contacting you about this. I'm still locked out. Can someone please call me instead of sending the same steps?`,
      },
    },
    {
      label: "Resolved since then",
      input: {
        demo: "customer",
        interactions: `Monday, 09:10 | Customer
I can't sign into the mobile app. Can someone call me?

Tuesday, 12:30 | Customer
I'm following up. Reinstalling didn't fix it.

Tuesday, 14:00 | Support
I called the customer, reset their device registration and stayed on the phone while they signed in successfully.

Tuesday, 14:10 | Customer
Thanks for the call! I'm back in and the transfer went through. All sorted now.`,
      },
    },
    {
      label: "Different issues",
      input: {
        demo: "customer",
        interactions: `Monday | Customer
Where can I download last month's statement?

Monday | Support
Open Accounts, then Statements, and choose the month.

Monday | Customer
Found it, thanks.

Friday | Customer
A new question: I see the same card purchase twice in my settled transactions. Could you check the duplicate charge?`,
      },
    },
  ],
  "pull-request": [
    {
      label: "Small cleanup?",
      input: {
        demo: "pull-request",
        title: "Small cleanup of the transfers endpoint",
        diff: `diff --git a/src/api/transfers.ts b/src/api/transfers.ts
--- a/src/api/transfers.ts
+++ b/src/api/transfers.ts
@@ -12,6 +12,5 @@ export function transferResponse(transfer: Transfer) {
   return {
     id: transfer.id,
-    amount: transfer.amountInCents,
-    currency: transfer.currency,
+    amount: { value: transfer.amountInCents, currency: transfer.currency },
   };
 }`,
      },
    },
    {
      label: "Access control change",
      input: {
        demo: "pull-request",
        title: "Simplify account access checks",
        diff: `diff --git a/src/middleware/authorize.ts b/src/middleware/authorize.ts
--- a/src/middleware/authorize.ts
+++ b/src/middleware/authorize.ts
@@ -4,5 +4,4 @@ export async function authorizeAccount(req: Request) {
   const session = await requireSession(req);
-  const membership = await findAccountMember(req.params.accountId, session.userId);
-  if (!membership) throw new ForbiddenError();
+  if (!session.userId) throw new ForbiddenError();
   return session;
 }
diff --git a/migrations/042_members.sql b/migrations/042_members.sql
new file mode 100644
--- /dev/null
+++ b/migrations/042_members.sql
@@ -0,0 +1,2 @@
+ALTER TABLE account_members ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';
+UPDATE account_members SET role = 'owner' WHERE is_owner = TRUE;`,
      },
    },
    {
      label: "Security in name only",
      input: {
        demo: "pull-request",
        title: "Document breaking changes, security and database migrations",
        diff: `diff --git a/docs/contributing.md b/docs/contributing.md
--- a/docs/contributing.md
+++ b/docs/contributing.md
@@ -8,1 +8,7 @@ Pull request guidelines
 Keep changes focused.
+
+## Review checklist
+Mention any breaking changes in the PR description.
+Ask the security team to review authentication changes.
+Include a rollback plan for database migrations.
+Add a test for the behavior you are changing.`,
      },
    },
  ],
} satisfies Record<DemoId, { label: string; input: DemoInput }[]>;
