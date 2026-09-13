import { afterEach, describe, expect, it } from "vitest";
import {
  resetWalletSendLocks,
  withSerializedWalletSend,
} from "@/lib/web3/wallet-send-lock";

afterEach(() => {
  resetWalletSendLocks();
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("withSerializedWalletSend", () => {
  it("runs same-wallet sends one after another", async () => {
    const order: string[] = [];
    const first = withSerializedWalletSend("wallet-a", 5_042_002, async () => {
      order.push("a-start");
      await delay(40);
      order.push("a-end");
      return 1;
    });
    const second = withSerializedWalletSend("wallet-a", 5_042_002, () => {
      order.push("b-start");
      order.push("b-end");
      return Promise.resolve(2);
    });

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(order).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });

  it("does not serialize different wallets", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let secondStarted = false;

    const first = withSerializedWalletSend("wallet-a", 5_042_002, async () => {
      await firstGate;
    });
    const second = withSerializedWalletSend("wallet-b", 5_042_002, () => {
      secondStarted = true;
      return Promise.resolve();
    });

    await delay(20);
    expect(secondStarted).toBe(true);
    releaseFirst();
    await Promise.all([first, second]);
  });

  it("still runs the next send when the previous send fails", async () => {
    const first = withSerializedWalletSend("wallet-a", 1, () =>
      Promise.reject(new Error("broadcast failed"))
    );
    const second = withSerializedWalletSend("wallet-a", 1, () =>
      Promise.resolve("ok")
    );

    await expect(first).rejects.toThrow("broadcast failed");
    await expect(second).resolves.toBe("ok");
  });
});
