import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { PrivyIcon } from "../privy/icon";

const treasuryPlugin: IntegrationPlugin = {
  type: "treasury",
  label: "Treasury",
  description: "Organization treasury helpers for payroll and funding workflows",
  icon: PrivyIcon,
  formFields: [],
  actions: [
    {
      slug: "get-org-wallet",
      label: "Get org wallet",
      description: "Resolve the active Privy treasury wallet for the workflow organization",
      category: "Treasury",
      stepFunction: "getOrgWalletStep",
      stepImportPath: "org-wallet",
      outputFields: [
        { field: "walletId", description: "Privy wallet ID" },
        { field: "address", description: "Treasury address" },
        { field: "autoSpendCapUsdc", description: "Auto spend cap in USDC" },
        { field: "dailySpendCapUsdc", description: "Daily spend cap in USDC" },
      ],
      configFields: [],
    },
    {
      slug: "list-payees",
      label: "List payees",
      description: "List organization payees from the treasury payee book",
      category: "Treasury",
      stepFunction: "listPayeesStep",
      stepImportPath: "payees",
      outputFields: [
        { field: "payees", description: "Payee records" },
        { field: "count", description: "Number of payees" },
      ],
      configFields: [],
    },
    {
      slug: "get-personal-wallet",
      label: "Get personal wallet",
      description:
        "Resolve the workflow owner's Privy embedded wallet for funding flows",
      category: "Treasury",
      stepFunction: "getPersonalWalletStep",
      stepImportPath: "personal-wallet",
      outputFields: [
        { field: "walletId", description: "Privy embedded wallet ID" },
        { field: "address", description: "Wallet address" },
        { field: "chainType", description: "Chain type" },
      ],
      configFields: [],
    },
  ],
};

registerIntegration(treasuryPlugin);
export default treasuryPlugin;
