import { test, expect, type Page } from "@playwright/test";

const userAEmail = "alice-e2e@example.com";
const userBEmail = "bob-e2e@example.com";

let groupUrl = "";
let joinCode = "";

async function signInAs(page: Page, email: string) {
  await page.goto("/api/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /e2e test login/i }).click();
  await page.waitForURL("/");
}

test.describe.serial("trip flow", () => {
  test("sign in, create a trip, see the join code", async ({ page }) => {
    await signInAs(page, userAEmail);

    await page.getByRole("link", { name: "New trip" }).click();
    await page.getByLabel("Trip name").fill("E2E Getaway");
    await page.getByRole("button", { name: "Create trip" }).click();

    await page.waitForURL(/\/groups\/c[^/]+$/); // cuid ids start with "c" — excludes /groups/new itself
    groupUrl = page.url();

    const code = page.getByText(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    await expect(code).toBeVisible();
    joinCode = (await code.textContent())?.trim() ?? "";
    expect(joinCode).toHaveLength(6);
  });

  test("a second user joins via the typed code and appears in the member list for both", async ({
    browser,
    page,
  }) => {
    const bobContext = await browser.newContext();
    const bobPage = await bobContext.newPage();
    await signInAs(bobPage, userBEmail);

    await bobPage.goto(`/join/${joinCode}`);
    await bobPage.getByRole("button", { name: "Join trip" }).click();
    await bobPage.waitForURL(groupUrl);
    await expect(bobPage.getByText(/bob-e2e/)).toBeVisible();

    await signInAs(page, userAEmail);
    await page.goto(groupUrl);
    await expect(page.getByText(/bob-e2e/)).toBeVisible();

    await bobContext.close();
  });

  test("adding expenses updates the feed and category totals", async ({ page }) => {
    await signInAs(page, userAEmail);
    await page.goto(`${groupUrl}/expenses`);

    await page.getByPlaceholder("What was it for?").fill("Dinner");
    await page.getByPlaceholder("Amount").fill("40");
    await page.getByRole("combobox").first().selectOption("food");
    await page.getByRole("button", { name: "Add expense" }).click();

    await expect(page.getByText("Dinner")).toBeVisible();
    await expect(page.getByText(/1 expense/)).toBeVisible();

    await page.goto(groupUrl);
    await expect(page.getByText(/food/i)).toBeVisible();
  });

  test("ending the trip nets balances down to a settlement list, and marking paid updates both sides", async ({
    page,
    browser,
  }) => {
    await signInAs(page, userAEmail);
    await page.goto(`${groupUrl}/settle`);

    await page.getByRole("button", { name: "End trip" }).click();
    await expect(page.getByText(/payment/)).toBeVisible();

    const markPaid = page.getByRole("button", { name: "Mark paid" });
    await expect(markPaid).toBeVisible();
    await markPaid.click();
    await expect(page.getByText("Paid")).toBeVisible();

    const bobContext = await browser.newContext();
    const bobPage = await bobContext.newPage();
    await signInAs(bobPage, userBEmail);
    await bobPage.goto(`${groupUrl}/settle`);
    await expect(bobPage.getByText("Paid")).toBeVisible();
    await bobContext.close();
  });

  test("unhappy path: a settled trip clearly rejects new expenses", async ({ page }) => {
    await signInAs(page, userAEmail);
    await page.goto(`${groupUrl}/expenses`);

    await expect(page.getByText(/settled.*no more expenses/i)).toBeVisible();
    await expect(page.getByPlaceholder("What was it for?")).toHaveCount(0);
  });
});
