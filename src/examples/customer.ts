import { choice, type TypeSafeClient } from "@typesafe-ai/sdk";

export async function labelCustomer(client: TypeSafeClient, interactions: string) {
  const request = {
    model: client.defaultModel,
    state: { interactions },
    questions: {
      reason: choice("What is the customer's main reason for contacting the bank?", {
        card_replacement: "Getting a replacement for a lost, stolen, damaged, or expired card",
        payment_query: "Asking about a charge, card transaction, or transfer",
        online_banking: "Getting help accessing the banking app or website",
        other: "A different reason, or no clear reason is given",
      }),
    },
  };

  const response = await client.systemOne(request);
  return { request, response };
}

export type CustomerResponse = Awaited<ReturnType<typeof labelCustomer>>["response"];
