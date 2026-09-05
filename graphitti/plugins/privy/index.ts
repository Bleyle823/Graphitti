import { NETWORK_SELECT_OPTIONS } from "@/lib/web3/chains";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { PrivyIcon } from "./icon";

const networkField = {
  key: "network",
  label: "Network",
  type: "select" as const,
  options: NETWORK_SELECT_OPTIONS,
  defaultValue: "ethereum",
  required: true,
};

const walletIdField = {
  key: "walletId",
  label: "Wallet ID",
  type: "template-input" as const,
  placeholder: "wallet_... or {{NodeName.id}}",
  example: "wallet_abc123",
  required: true,
};

const privyPlugin: IntegrationPlugin = {
  type: "privy",
  label: "Privy",
  description:
    "Manage Privy users and wallets. Sign messages and send gas-sponsored transactions.",
  icon: PrivyIcon,
  formFields: [
    {
      id: "appId",
      label: "App ID",
      type: "text",
      placeholder: "Your Privy app ID",
      configKey: "appId",
      envVar: "PRIVY_APP_ID",
      helpText: "Get your App ID from ",
      helpLink: {
        text: "dashboard.privy.io",
        url: "https://dashboard.privy.io",
      },
    },
    {
      id: "appSecret",
      label: "App Secret",
      type: "password",
      placeholder: "Your Privy app secret",
      configKey: "appSecret",
      envVar: "PRIVY_APP_SECRET",
      helpText: "Get your App Secret from ",
      helpLink: {
        text: "dashboard.privy.io",
        url: "https://dashboard.privy.io",
      },
    },
  ],
  testConfig: {
    getTestFunction: async () => {
      const { testPrivy } = await import("./test");
      return testPrivy;
    },
  },
  actions: [
    {
      slug: "get-user",
      label: "Get user",
      description: "Fetch a Privy user by ID",
      category: "Privy",
      stepFunction: "getUserStep",
      stepImportPath: "users",
      outputFields: [
        { field: "id", description: "Privy user ID" },
        { field: "linked_accounts", description: "Linked accounts" },
        { field: "wallets", description: "User wallets" },
      ],
      configFields: [
        {
          key: "privyUserId",
          label: "Privy user ID",
          type: "template-input",
          placeholder: "did:privy:... or {{NodeName.id}}",
          example: "did:privy:abc123",
          required: true,
        },
      ],
    },
    {
      slug: "list-wallets",
      label: "List wallets",
      description: "List wallets in the Privy app",
      category: "Privy",
      stepFunction: "listWalletsStep",
      stepImportPath: "wallets",
      outputFields: [{ field: "wallets", description: "Wallets" }],
      configFields: [],
    },
    {
      slug: "create-wallet",
      label: "Create wallet",
      description: "Create a new Privy server wallet",
      category: "Privy",
      stepFunction: "createWalletStep",
      stepImportPath: "wallets",
      outputFields: [
        { field: "id", description: "Wallet ID" },
        { field: "address", description: "Wallet address" },
        { field: "chain_type", description: "Chain type" },
      ],
      configFields: [
        {
          key: "chainType",
          label: "Chain type",
          type: "select",
          options: [
            { value: "ethereum", label: "Ethereum" },
            { value: "solana", label: "Solana" },
          ],
          defaultValue: "ethereum",
          required: true,
        },
      ],
    },
    {
      slug: "get-wallet",
      label: "Get wallet",
      description: "Fetch a Privy wallet by ID",
      category: "Privy",
      stepFunction: "getWalletStep",
      stepImportPath: "wallets",
      outputFields: [
        { field: "id", description: "Wallet ID" },
        { field: "address", description: "Wallet address" },
        { field: "chain_type", description: "Chain type" },
      ],
      configFields: [walletIdField],
    },
    {
      slug: "send-sponsored-transaction",
      label: "Send sponsored transaction",
      description: "Send a gas-sponsored transaction from a Privy wallet",
      category: "Privy",
      stepFunction: "sendSponsoredTransactionStep",
      stepImportPath: "sign-send",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
        walletIdField,
        networkField,
        {
          key: "to",
          label: "To",
          type: "template-input",
          placeholder: "0x...",
          example: "0x0000000000000000000000000000000000000000",
          required: true,
        },
        {
          key: "data",
          label: "Calldata",
          type: "template-textarea",
          placeholder: "0x",
          example: "0x",
        },
        {
          key: "value",
          label: "Value",
          type: "template-input",
          placeholder: "0x0 or 0.01",
          example: "0x0",
        },
      ],
    },
    {
      slug: "sign-message",
      label: "Sign message",
      description: "Sign a message with a Privy wallet",
      category: "Privy",
      stepFunction: "signMessageStep",
      stepImportPath: "sign-send",
      outputFields: [{ field: "signature", description: "Hex signature" }],
      configFields: [
        walletIdField,
        networkField,
        {
          key: "message",
          label: "Message",
          type: "template-textarea",
          placeholder: "Message to sign",
          example: "Hello from Privy",
          required: true,
        },
      ],
    },
    {
      slug: "sign-typed-data",
      label: "Sign typed data",
      description: "Sign EIP-712 typed data with a Privy wallet",
      category: "Privy",
      stepFunction: "signTypedDataStep",
      stepImportPath: "sign-send",
      outputFields: [{ field: "signature", description: "Hex signature" }],
      configFields: [
        walletIdField,
        networkField,
        {
          key: "typedData",
          label: "Typed data JSON",
          type: "template-textarea",
          placeholder: '{"domain":{},"types":{},"primaryType":"","message":{}}',
          required: true,
        },
      ],
    },
    {
      slug: "transfer",
      label: "Transfer",
      description: "Transfer native tokens with Privy gas sponsorship",
      category: "Privy",
      stepFunction: "transferStep",
      stepImportPath: "sign-send",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
        walletIdField,
        networkField,
        {
          key: "to",
          label: "Recipient",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
        {
          key: "amount",
          label: "Amount",
          type: "template-input",
          placeholder: "0.01",
          required: true,
        },
      ],
    },
    {
      slug: "get-transaction",
      label: "Get transaction",
      description: "Fetch a Privy wallet transaction by ID",
      category: "Privy",
      stepFunction: "getTransactionStep",
      stepImportPath: "wallets",
      outputFields: [
        { field: "transaction", description: "Transaction object" },
      ],
      configFields: [
        walletIdField,
        {
          key: "transactionId",
          label: "Transaction ID",
          type: "template-input",
          placeholder: "tx_... or {{NodeName.hash}}",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(privyPlugin);
export default privyPlugin;
