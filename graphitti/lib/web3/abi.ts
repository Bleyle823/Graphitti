const ERC20 = {
  balanceOf: "0x70a08231",
  transfer: "0xa9059cbb",
  approve: "0x095ea7b3",
  allowance: "0xdd62ed3e",
  decimals: "0x313ce567",
  symbol: "0x95d89b41",
} as const;

function strip0x(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

export function padAddress(address: string): string {
  return strip0x(address).toLowerCase().padStart(64, "0");
}

export function padUint(value: bigint | string | number): string {
  const asBigInt = typeof value === "bigint" ? value : BigInt(value);
  return asBigInt.toString(16).padStart(64, "0");
}

export function encodeBalanceOf(owner: string): string {
  return `${ERC20.balanceOf}${padAddress(owner)}`;
}

export function encodeTransfer(to: string, amount: bigint): string {
  return `${ERC20.transfer}${padAddress(to)}${padUint(amount)}`;
}

export function encodeApprove(spender: string, amount: bigint): string {
  return `${ERC20.approve}${padAddress(spender)}${padUint(amount)}`;
}

export function encodeAllowance(owner: string, spender: string): string {
  return `${ERC20.allowance}${padAddress(owner)}${padAddress(spender)}`;
}

export function encodeDecimals(): string {
  return ERC20.decimals;
}

export function encodeSymbol(): string {
  return ERC20.symbol;
}

export function decodeUint(hex: string): bigint {
  if (!hex || hex === "0x") {
    return BigInt(0);
  }
  return BigInt(hex);
}

export function decodeAddress(hex: string): string {
  const raw = strip0x(hex).slice(-40);
  return `0x${raw}`;
}
