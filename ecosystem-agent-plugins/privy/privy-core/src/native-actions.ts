import { validatePrivyCredentials } from "./credentials.js";
import { fail, ok } from "./http.js";
import {
  createPrivyKeyQuorum,
  createPrivyPolicy,
  createPrivyRpcIntent,
  createPrivyTransferIntent,
  createPrivyWallet,
  getPrivyIntent,
  getPrivyKeyQuorum,
  getPrivyPolicy,
  getPrivyUser,
  getPrivyWallet,
  getPrivyWalletBalance,
  getPrivyWalletByAddress,
  getPrivyWalletTransaction,
  listPrivyIntents,
  listPrivyWallets,
  privyWalletSwap as requestWalletSwap,
  privyWalletTransfer as requestWalletTransfer,
  searchPrivyUsers,
  type WalletTransferRequest,
} from "./privy-client.js";
import { parseUnits, requireChain } from "./chains.js";
import {
  personalSign,
  sendSponsoredTransaction,
  signTypedDataV4,
} from "./privy-signer.js";
import { isRecord, strParam } from "./shared.js";
import type { ExecuteParams, PrivyCredentials, ToolResult } from "./types.js";
import { randomUUID } from "node:crypto";

function requireCreds(credentials: PrivyCredentials) {
  const validated = validatePrivyCredentials(credentials);
  if (!validated.ok) {
    return fail(validated.error);
  }
  return validated;
}

function isAuthError(
  auth: ReturnType<typeof requireCreds>
): auth is { success: false; error: string } {
  return "success" in auth;
}

function transferBody(params: ExecuteParams): WalletTransferRequest | ToolResult {
  const destinationAddress =
    strParam(params, "destination_address") ?? strParam(params, "destinationAddress");
  const amount = strParam(params, "amount");
  const sourceChain = strParam(params, "source_chain") ?? strParam(params, "sourceChain");
  const sourceAsset = strParam(params, "source_asset") ?? strParam(params, "sourceAsset");
  if (!(destinationAddress && amount && sourceChain && sourceAsset)) {
    return fail("destination_address, amount, source_chain, and source_asset are required");
  }
  return {
    source: { chain: sourceChain, asset: sourceAsset },
    destination: {
      address: destinationAddress,
      ...(strParam(params, "destination_chain")
        ? { chain: strParam(params, "destination_chain") }
        : {}),
      ...(strParam(params, "destination_asset")
        ? { asset: strParam(params, "destination_asset") }
        : {}),
    },
    amount,
    amount_type: "exact_input",
    nonce: randomUUID(),
    reference_id: randomUUID(),
  };
}

export async function privyGetUser(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const userId = strParam(params, "privy_user_id") ?? strParam(params, "privyUserId");
  if (!userId) {
    return fail("privy_user_id is required");
  }
  try {
    const user = await getPrivyUser(userId, credentials);
    return ok({
      id: user.id,
      linked_accounts: user.linked_accounts ?? [],
      wallets: user.wallets ?? [],
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyListUsers(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const query = strParam(params, "query") ?? strParam(params, "search") ?? "";
  if (!query) {
    return fail("query is required");
  }
  try {
    const result = await searchPrivyUsers(query, credentials);
    return ok({ users: result.data, count: result.data.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyListWallets(
  _params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  try {
    const result = await listPrivyWallets(credentials);
    return ok({ wallets: result.data, count: result.data.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyCreateWallet(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  try {
    const wallet = await createPrivyWallet(
      credentials,
      strParam(params, "chain_type") ?? strParam(params, "chainType") ?? "ethereum"
    );
    return ok({ id: wallet.id, address: wallet.address, chain_type: wallet.chain_type });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetWallet(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  if (!walletId) {
    return fail("wallet_id is required");
  }
  try {
    const wallet = await getPrivyWallet(walletId, credentials);
    return ok({ id: wallet.id, address: wallet.address, chain_type: wallet.chain_type });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetWalletByAddress(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const address = strParam(params, "address");
  if (!address) {
    return fail("address is required");
  }
  try {
    const result = await getPrivyWalletByAddress(address, credentials);
    return ok({ wallets: result.data, count: result.data.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetBalance(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  if (!walletId) {
    return fail("wallet_id is required");
  }
  try {
    const balance = await getPrivyWalletBalance(
      walletId,
      credentials,
      strParam(params, "asset") ?? "eth"
    );
    return ok({ balance, wallet_id: walletId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetTransaction(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const transactionId =
    strParam(params, "transaction_id") ?? strParam(params, "transactionId");
  if (!(walletId && transactionId)) {
    return fail("wallet_id and transaction_id are required");
  }
  try {
    const transaction = await getPrivyWalletTransaction(
      walletId,
      transactionId,
      credentials
    );
    return ok({ transaction });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privySignMessage(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const message = strParam(params, "message");
  const network = strParam(params, "network") ?? "ethereum";
  if (!(walletId && message)) {
    return fail("wallet_id and message are required");
  }
  try {
    const { signature } = await personalSign({
      walletId,
      message,
      chain: requireChain(network),
      credentials,
    });
    return ok({ signature });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privySignTypedData(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const typedDataRaw = strParam(params, "typed_data") ?? strParam(params, "typedData");
  const network = strParam(params, "network") ?? "ethereum";
  if (!(walletId && typedDataRaw)) {
    return fail("wallet_id and typed_data are required");
  }
  try {
    const typedData = JSON.parse(typedDataRaw) as unknown;
    const { signature } = await signTypedDataV4({
      walletId,
      typedData,
      chain: requireChain(network),
      credentials,
    });
    return ok({ signature });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privySendTransaction(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const to = strParam(params, "to");
  const network = strParam(params, "network") ?? "ethereum";
  if (!(walletId && to)) {
    return fail("wallet_id and to are required");
  }
  try {
    const chain = requireChain(network);
    const valueRaw = strParam(params, "value") ?? "0";
    const value = valueRaw.startsWith("0x")
      ? valueRaw
      : `0x${parseUnits(valueRaw, chain.nativeDecimals).toString(16)}`;
    const { hash, gasMode } = await sendSponsoredTransaction({
      walletId,
      chain,
      to,
      data: strParam(params, "data") ?? "0x",
      value,
      credentials,
    });
    return ok({ hash, to, gas_mode: gasMode, explorer: `${chain.explorerUrl}/tx/${hash}` });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyTransfer(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const to = strParam(params, "to");
  const amount = strParam(params, "amount");
  const network = strParam(params, "network") ?? "ethereum";
  if (!(walletId && to && amount)) {
    return fail("wallet_id, to, and amount are required");
  }
  try {
    const chain = requireChain(network);
    const value = `0x${parseUnits(amount, chain.nativeDecimals).toString(16)}`;
    const { hash, gasMode } = await sendSponsoredTransaction({
      walletId,
      chain,
      to,
      value,
      credentials,
    });
    return ok({ hash, to, amount, gas_mode: gasMode, explorer: `${chain.explorerUrl}/tx/${hash}` });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyWalletTransfer(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  if (!walletId) {
    return fail("wallet_id is required");
  }
  const body = transferBody(params);
  if (!isRecord(body) || "success" in body) {
    return body as ToolResult;
  }
  try {
    const action = await requestWalletTransfer(walletId, body, credentials);
    return ok({
      id: action.id,
      status: action.status,
      transaction_hash: action.transaction_hash,
      mode: "direct",
      note: "Direct Privy USDC wallet transfer. For listed Graphitti payroll flows use privy_call_workflow.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyWalletSwap(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const fromAsset = strParam(params, "from_asset") ?? strParam(params, "fromAsset");
  const toAsset = strParam(params, "to_asset") ?? strParam(params, "toAsset");
  const amount = strParam(params, "amount");
  if (!(walletId && fromAsset && toAsset && amount)) {
    return fail("wallet_id, from_asset, to_asset, and amount are required");
  }
  try {
    const action = await requestWalletSwap(
      walletId,
      {
        chain: strParam(params, "chain") ?? "base_sepolia",
        from_asset: fromAsset,
        to_asset: toAsset,
        amount,
        nonce: randomUUID(),
        reference_id: randomUUID(),
      },
      credentials
    );
    return ok({
      id: action.id,
      status: action.status,
      transaction_hash: action.transaction_hash,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyCreatePolicy(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const name = strParam(params, "name");
  const rulesJson = strParam(params, "rules_json") ?? strParam(params, "rulesJson");
  if (!(name && rulesJson)) {
    return fail("name and rules_json are required");
  }
  try {
    const rules = JSON.parse(rulesJson) as Record<string, unknown>[];
    const policy = await createPrivyPolicy(credentials, {
      name,
      chainType: strParam(params, "chain_type") ?? "ethereum",
      rules,
      ownerId: strParam(params, "owner_id") ?? strParam(params, "ownerId"),
    });
    return ok({ id: policy.id, name: policy.name });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetPolicy(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const policyId = strParam(params, "policy_id") ?? strParam(params, "policyId");
  if (!policyId) {
    return fail("policy_id is required");
  }
  try {
    const policy = await getPrivyPolicy(policyId, credentials);
    return ok({ policy });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyCreateKeyQuorum(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const displayName =
    strParam(params, "display_name") ?? strParam(params, "displayName");
  const threshold =
    strParam(params, "authorization_threshold") ??
    strParam(params, "authorizationThreshold");
  if (!(displayName && threshold)) {
    return fail("display_name and authorization_threshold are required");
  }
  try {
    const userIdsJson = strParam(params, "user_ids_json") ?? strParam(params, "userIdsJson");
    const quorum = await createPrivyKeyQuorum(credentials, {
      displayName,
      authorizationThreshold: Number.parseInt(threshold, 10),
      userIds: userIdsJson ? (JSON.parse(userIdsJson) as string[]) : undefined,
    });
    return ok({ id: quorum.id, display_name: quorum.display_name });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetKeyQuorum(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const quorumId = strParam(params, "quorum_id") ?? strParam(params, "quorumId");
  if (!quorumId) {
    return fail("quorum_id is required");
  }
  try {
    const quorum = await getPrivyKeyQuorum(quorumId, credentials);
    return ok({ quorum });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyCreateTransferIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  if (!walletId) {
    return fail("wallet_id is required");
  }
  const body = transferBody(params);
  if (!isRecord(body) || "success" in body) {
    return body as ToolResult;
  }
  try {
    const intent = await createPrivyTransferIntent(walletId, body, credentials);
    return ok({ intent_id: intent.intent_id, status: intent.status });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyCreateRpcIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
  const rpcBodyRaw = strParam(params, "rpc_body") ?? strParam(params, "rpcBody");
  if (!(walletId && rpcBodyRaw)) {
    return fail("wallet_id and rpc_body are required");
  }
  try {
    const rpcBody = JSON.parse(rpcBodyRaw) as Record<string, unknown>;
    const intent = await createPrivyRpcIntent(walletId, rpcBody, credentials);
    return ok({ intent_id: intent.intent_id, status: intent.status });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyGetIntent(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  const intentId = strParam(params, "intent_id") ?? strParam(params, "intentId");
  if (!intentId) {
    return fail("intent_id is required");
  }
  try {
    const intent = await getPrivyIntent(intentId, credentials);
    return ok(intent);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function privyListIntents(
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const auth = requireCreds(credentials);
  if (isAuthError(auth)) {
    return auth;
  }
  try {
    const walletId = strParam(params, "wallet_id") ?? strParam(params, "walletId");
    const result = await listPrivyIntents(credentials, walletId);
    return ok({ intents: result.data, count: result.data.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
