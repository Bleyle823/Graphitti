/**
 * Approve Arc USDC and deposit it into Circle Gateway Wallet.
 *
 * Usage (from graphitti/):
 *   pnpm deposit-gateway
 *   pnpm deposit-gateway -- --amount 1
 *   pnpm deposit-gateway -- --testnet
 *
 * Uses PRIVATE_KEY from .env.local. Do not ERC-20 transfer to the Gateway
 * contract; only deposit() credits a nanopayment balance.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import {
  Contract,
  formatUnits,
  JsonRpcProvider,
  parseUnits,
  Wallet,
} from "ethers";

const ARC_USDC = "0x3600000000000000000000000000000000000000";
const GAS = {
  maxFeePerGas: parseUnits("20", "gwei"),
  maxPriorityFeePerGas: parseUnits("20", "gwei"),
};
const NETWORKS = {
  arc: {
    gatewayWallet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE",
    rpcUrl: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
  },
  "arc-testnet": {
    gatewayWallet: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
    rpcUrl: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
  },
} as const;

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
];
const GATEWAY_ABI = ["function deposit(address token, uint256 value)"];

function loadEnv() {
  const files = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "graphitti", ".env.local"),
  ];
  for (const file of files) {
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return;
  }
  return process.argv[index + 1];
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function wait(provider: JsonRpcProvider, hash: string) {
  const receipt = await provider.waitForTransaction(hash);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Transaction failed: ${hash}`);
  }
  return receipt;
}

async function main() {
  loadEnv();
  const privateKey = process.env.PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error("Set PRIVATE_KEY in .env.local first.");
  }
  const amountHuman = argValue("--amount") || "1";
  const amount = parseUnits(amountHuman, 6);
  const network = process.argv.includes("--testnet")
    ? NETWORKS["arc-testnet"]
    : NETWORKS.arc;
  const provider = new JsonRpcProvider(network.rpcUrl);
  const wallet = new Wallet(privateKey, provider);
  const usdc = new Contract(ARC_USDC, ERC20_ABI, wallet);
  const gateway = new Contract(network.gatewayWallet, GATEWAY_ABI, wallet);

  const [native, tokenBalance, allowance] = await Promise.all([
    provider.getBalance(wallet.address),
    usdc.balanceOf(wallet.address) as Promise<bigint>,
    usdc.allowance(wallet.address, network.gatewayWallet) as Promise<bigint>,
  ]);

  if (native === BigInt(0)) {
    throw new Error(
      `No Arc native gas on ${wallet.address}. Native gas is USDC on Arc.`
    );
  }
  if (tokenBalance < amount) {
    throw new Error(
      `Need ${amountHuman} Arc ERC-20 USDC (${ARC_USDC}) on ${wallet.address}. Wallet has ${formatUnits(tokenBalance, 6)}.`
    );
  }

  let approveHash: string | null = null;
  if (allowance < amount) {
    const approveTx = await usdc.approve(network.gatewayWallet, amount, GAS);
    approveHash = approveTx.hash as string;
    await wait(provider, approveHash);
  }

  const depositTx = await gateway.deposit(ARC_USDC, amount, GAS);
  const depositHash = depositTx.hash as string;
  await wait(provider, depositHash);

  printJson({
    ok: true,
    payer: wallet.address,
    amountUsdc: amountHuman,
    token: ARC_USDC,
    gatewayWallet: network.gatewayWallet,
    approveTx: approveHash,
    depositTx: depositHash,
    explorer: `${network.explorer}/tx/${depositHash}`,
    next: "Wait ~0.5s, then pnpm pay-listing -- <listing-call-url>",
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
