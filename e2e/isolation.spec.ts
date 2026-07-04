import { test, expect } from "@playwright/test";

const PW = "playwright_test_123";

test.describe("Multi-tenant isolation", () => {
  test("User A creates client, User B sees nothing", async ({ browser }) => {
    // User A - register, login, create client
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();

    const emailA = `e2e-iso-a-${Date.now()}@test.com`;

    const regA = await pageA.request.post("/api/register", {
      data: { name: "User A", email: emailA, password: PW },
    });
    expect(regA.ok()).toBeTruthy();

    await pageA.goto("/login");
    await pageA.getByLabel("Email").fill(emailA);
    await pageA.getByLabel("Password").fill(PW);
    await pageA.getByRole("button", { name: "Sign in" }).click();
    await pageA.waitForURL(/\/dashboard/, { timeout: 10000 });

    const createResp = await pageA.request.post("/api/clients", {
      data: { name: "User A's Secret Client", phone: "123" },
    });
    expect(createResp.ok()).toBeTruthy();

    await pageA.goto("/dashboard/clients");
    await pageA.waitForTimeout(500);
    await expect(pageA.getByText("User A's Secret Client").first()).toBeVisible();

    // User B - new context (separate cookies/session)
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();

    const emailB = `e2e-iso-b-${Date.now()}@test.com`;

    const regB = await pageB.request.post("/api/register", {
      data: { name: "User B", email: emailB, password: PW },
    });
    expect(regB.ok()).toBeTruthy();

    await pageB.goto("/login");
    await pageB.getByLabel("Email").fill(emailB);
    await pageB.getByLabel("Password").fill(PW);
    await pageB.getByRole("button", { name: "Sign in" }).click();
    await pageB.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify User B sees empty list (no client card with that name)
    // Go directly to clients page
    await pageB.goto("/dashboard/clients");
    await pageB.waitForTimeout(500);

    // Check via page content that the clients list is empty for User B
    // Use the presence of the heading as signal the page loaded
    const pageBText = await pageB.textContent("main");
    // User B should NOT see User A's client name
    expect(pageBText).not.toContain("User A's Secret Client");

    // Back to User A - data still there
    await pageA.goto("/login");
    await pageA.getByLabel("Email").fill(emailA);
    await pageA.getByLabel("Password").fill(PW);
    await pageA.getByRole("button", { name: "Sign in" }).click();
    await pageA.waitForURL(/\/dashboard/, { timeout: 10000 });

    await pageA.goto("/dashboard/clients");
    await pageA.waitForTimeout(500);
    await expect(pageA.getByText("User A's Secret Client").first()).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});