import { choice, noul, score, type TypeSafeClient } from "@typesafe-ai/sdk";

export function labelCustomer(client: TypeSafeClient, interactions: string) {
  // One request. Each question independently reads the same interaction history.
  return client.systemOne({
    state: { interactions },
    questions: {
      owner: choice("Which team owns the latest unresolved issue in `interactions`?", {
        digital_banking: "Mobile app, online banking, login, or authentication problems",
        payments: "Card transactions, transfers, payment delays, or duplicate charges",
        account_support: "Account details, statements, fees, or general account servicing",
        none: "No unresolved issue, or none of these teams fits",
      }),
      unresolved: noul(
        "Is the customer's latest issue still unresolved at the end of `interactions`?",
      ),
      repeatContact: noul(
        "Has the customer contacted support more than once about the SAME issue?",
      ),
      wantsHuman: noul("Is there an outstanding request to speak to a human in `interactions`?", {
        true: "The customer requests a person, and that request has not yet been fulfilled",
        false: "No request for a person, or the requested human contact already happened",
      }),
      friction: score("How much effort has resolving the latest issue taken this customer?", [
        "A routine interaction with no problem to resolve",
        "A first support contact or one straightforward step, without repeated failed attempts",
        "Several contacts or troubleshooting steps, with progress or a usable workaround",
        "Repeated contacts and unsuccessful steps, with the customer still blocked",
      ]),
    },
  });
}

export type CustomerResponse = Awaited<ReturnType<typeof labelCustomer>>;

export function customerLabels(answers: CustomerResponse["answers"], threshold = 0.8) {
  // Probabilities become labels through a policy we can change without another API call.
  return [
    { label: "Unresolved issue", probability: answers.unresolved.noul },
    { label: "Repeat contact", probability: answers.repeatContact.noul },
    { label: "Human requested", probability: answers.wantsHuman.noul },
  ].filter(({ probability }) => probability >= threshold);
}
