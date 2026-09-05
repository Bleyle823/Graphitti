import { NETWORK_SELECT_OPTIONS } from "@/lib/web3/chains";
import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { Web3Icon } from "./icon";

const networkField = {
  key: "network",
  label: "Network",
  type: "select" as const,
  options: NETWORK_SELECT_OPTIONS,
  defaultValue: "ethereum",
  required: true,
};

const web3Plugin: IntegrationPlugin = {
  type: "web3",
  label: "Web3",
  description: "Read balances and contracts. Writes use your linked Privy wallet with gas sponsorship.",
  icon: Web3Icon,
  formFields: [],
  testConfig: {
    getTestFunction: async () => {
      const { testWeb3 } = await import("./test");
      return testWeb3;
    },
  },
  actions: [
    {
      slug: "check-balance",
      label: "Get native balance",
      description: "Get native token balance of any address",
      category: "Web3",
      stepFunction: "checkBalanceStep",
      stepImportPath: "balance",
      outputFields: [
        { field: "balance", description: "Human-readable balance" },
        { field: "balanceWei", description: "Balance in smallest units" },
        { field: "symbol", description: "Native symbol" },
      ],
      configFields: [
        networkField,
        {
          key: "address",
          label: "Address",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
      ],
    },
    {
      slug: "check-token-balance",
      label: "Get ERC-20 balance",
      description: "Get ERC-20 token balance of any address",
      category: "Web3",
      stepFunction: "checkTokenBalanceStep",
      stepImportPath: "balance",
      outputFields: [
        { field: "balance", description: "Human-readable token balance" },
        { field: "balanceRaw", description: "Raw token units" },
        { field: "symbol", description: "Token symbol" },
      ],
      configFields: [
        networkField,
        {
          key: "address",
          label: "Address",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
        {
          key: "tokenAddress",
          label: "Token address",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
      ],
    },
    {
      slug: "transfer-native",
      label: "Transfer native",
      description: "Send native tokens with Privy gas sponsorship",
      category: "Web3",
      stepFunction: "transferNativeStep",
      stepImportPath: "transfer",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
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
      slug: "transfer-token",
      label: "Transfer ERC-20",
      description: "Send ERC-20 tokens with Privy gas sponsorship",
      category: "Web3",
      stepFunction: "transferTokenStep",
      stepImportPath: "transfer",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
        networkField,
        {
          key: "tokenAddress",
          label: "Token address",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
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
          placeholder: "1.0",
          required: true,
        },
        {
          key: "decimals",
          label: "Decimals",
          type: "template-input",
          placeholder: "18",
          defaultValue: "18",
        },
      ],
    },
    {
      slug: "approve-token",
      label: "Approve ERC-20",
      description: "Approve a spender for an ERC-20 token",
      category: "Web3",
      stepFunction: "approveTokenStep",
      stepImportPath: "approve",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
        networkField,
        {
          key: "tokenAddress",
          label: "Token address",
          type: "template-input",
          required: true,
        },
        {
          key: "spender",
          label: "Spender",
          type: "template-input",
          required: true,
        },
        {
          key: "amount",
          label: "Amount",
          type: "template-input",
          required: true,
        },
        {
          key: "decimals",
          label: "Decimals",
          type: "template-input",
          defaultValue: "18",
        },
      ],
    },
    {
      slug: "check-allowance",
      label: "Check allowance",
      description: "Read ERC-20 allowance",
      category: "Web3",
      stepFunction: "checkAllowanceStep",
      stepImportPath: "approve",
      outputFields: [{ field: "allowance", description: "Human-readable allowance" }],
      configFields: [
        networkField,
        {
          key: "tokenAddress",
          label: "Token address",
          type: "template-input",
          required: true,
        },
        {
          key: "owner",
          label: "Owner",
          type: "template-input",
          required: true,
        },
        {
          key: "spender",
          label: "Spender",
          type: "template-input",
          required: true,
        },
        {
          key: "decimals",
          label: "Decimals",
          type: "template-input",
          defaultValue: "18",
        },
      ],
    },
    {
      slug: "read-contract",
      label: "Read contract",
      description: "eth_call with hex calldata",
      category: "Web3",
      stepFunction: "readContractStep",
      stepImportPath: "contract",
      outputFields: [{ field: "result", description: "Hex result" }],
      configFields: [
        networkField,
        {
          key: "contractAddress",
          label: "Contract",
          type: "template-input",
          required: true,
        },
        {
          key: "data",
          label: "Calldata",
          type: "template-textarea",
          placeholder: "0x...",
          required: true,
        },
      ],
    },
    {
      slug: "write-contract",
      label: "Write contract",
      description: "Send a contract transaction with Privy sponsorship",
      category: "Web3",
      stepFunction: "writeContractStep",
      stepImportPath: "contract",
      outputFields: [{ field: "hash", description: "Transaction hash" }],
      configFields: [
        networkField,
        {
          key: "contractAddress",
          label: "Contract",
          type: "template-input",
          required: true,
        },
        {
          key: "data",
          label: "Calldata",
          type: "template-textarea",
          required: true,
        },
        {
          key: "value",
          label: "Value (hex)",
          type: "template-input",
          placeholder: "0x0",
        },
      ],
    },
    {
      slug: "get-transaction",
      label: "Get transaction",
      description: "Fetch a transaction and its receipt",
      category: "Web3",
      stepFunction: "getTransactionStep",
      stepImportPath: "transaction",
      outputFields: [{ field: "transaction", description: "Transaction object" }],
      configFields: [
        networkField,
        {
          key: "txHash",
          label: "Transaction hash",
          type: "template-input",
          required: true,
        },
      ],
    },
    {
      slug: "query-logs",
      label: "Query logs",
      description: "Query event logs",
      category: "Web3",
      stepFunction: "queryLogsStep",
      stepImportPath: "transaction",
      outputFields: [{ field: "logs", description: "Matching logs" }],
      configFields: [
        networkField,
        {
          key: "address",
          label: "Contract",
          type: "template-input",
        },
        {
          key: "fromBlock",
          label: "From block",
          type: "template-input",
          placeholder: "latest",
        },
        {
          key: "toBlock",
          label: "To block",
          type: "template-input",
          placeholder: "latest",
        },
        {
          key: "topic0",
          label: "Topic 0",
          type: "template-input",
        },
      ],
    },
    {
      slug: "sign-typed-data",
      label: "Sign typed data",
      description: "Sign EIP-712 typed data with the linked Privy wallet",
      category: "Web3",
      stepFunction: "signTypedDataStep",
      stepImportPath: "sign",
      outputFields: [{ field: "signature", description: "Hex signature" }],
      configFields: [
        networkField,
        {
          key: "typedData",
          label: "Typed data JSON",
          type: "template-textarea",
          required: true,
        },
      ],
    },
  ],
};

registerIntegration(web3Plugin);
export default web3Plugin;
