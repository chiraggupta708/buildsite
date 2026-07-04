import { test, expect } from "@playwright/test";

const PW = "playwright_test_123";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  // After clicking sign in, wait until dashboard heading or URL changes
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Clients CRUD", () => {
  test("create client via dialog", async ({ page }) => {
    const email = `e2e-client-${Date.now()}@test.com`;
    const resp = await page.request.post("/api/register", {
      data: { name: "Client Test", email, password: PW },
    });
    expect(resp.ok()).toBeTruthy();

    await login(page, email);

    await page.goto("/dashboard/clients");
    await page.waitForTimeout(300);

    // The DialogTrigger wraps Button creating nested buttons, use first match
    await page.getByRole("button", { name: /Add Client/i }).first().click();
    await page.getByLabel("Name").first().fill("E2E Client");
    await page.getByLabel("Phone").first().fill("9999999999");
    await page.getByLabel("Email").first().fill(email);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(1500);

    await expect(page.getByText("E2E Client")).toBeVisible();
  });

  test("view client detail with sites section", async ({ page }) => {
    const email = `e2e-client2-${Date.now()}@test.com`;
    await page.request.post("/api/register", {
      data: { name: "Detail Test", email, password: PW },
    });

    await login(page, email);

    const clientResp = await page.request.post("/api/clients", {
      data: { name: "Detail Client", phone: "1111111111", email },
    });
    expect(clientResp.ok()).toBeTruthy();
    const client = await clientResp.json();

    await page.goto(`/dashboard/clients/${client.id}`);
    await page.waitForTimeout(1000);
    await expect(page.getByText("Detail Client").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sites" })).toBeVisible();
  });
});