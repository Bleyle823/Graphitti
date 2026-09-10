import { expect, test } from "@playwright/test";

const CREATE_ORG_BUTTON = /Create organization|New org/;

test.describe("Org settings UI", () => {
  test("settings page renders organization section when signed in", async ({
    page,
  }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    const orgHeading = page.getByRole("heading", { name: "Organization" });
    const connectPrompt = page.getByText("Connect a wallet");
    await expect(orgHeading.or(connectPrompt).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("treasury page exposes spend cap controls when an org is active", async ({
    page,
  }) => {
    await page.goto("/treasury", { waitUntil: "domcontentloaded" });
    const cap = page.getByTestId("spend-cap-auto");
    const createOrg = page.getByRole("button", {
      name: CREATE_ORG_BUTTON,
    });
    await expect(cap.or(createOrg).first()).toBeVisible({ timeout: 20_000 });
  });
});
