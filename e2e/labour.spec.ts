import { test, expect } from "@playwright/test";

const PW = "playwright_test_123";

async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Labour CRUD", () => {
  test("create labour via API and view in list", async ({ page }) => {
    const email = `e2e-labour-${Date.now()}@test.com`;
    await page.request.post("/api/register", {
      data: { name: "Labour Test", email, password: PW },
    });
    await login(page, email);

    const resp = await page.request.post("/api/labour", {
      data: { name: "E2E Mason", trade: "Mason" },
    });
    expect(resp.ok()).toBeTruthy();

    await page.goto("/dashboard/labour");
    await page.waitForTimeout(500);
    await expect(page.getByText("E2E Mason").first()).toBeVisible();
  });

  test("labour detail page", async ({ page }) => {
    const email = `e2e-labour2-${Date.now()}@test.com`;
    await page.request.post("/api/register", {
      data: { name: "Labour Detail", email, password: PW },
    });
    await login(page, email);

    const resp = await page.request.post("/api/labour", {
      data: { name: "Detail Mason", trade: "Carpenter" },
    });
    expect(resp.ok()).toBeTruthy();
    const labour = await resp.json();

    await page.goto(`/dashboard/labour/${labour.id}`);
    await page.waitForTimeout(1000);
    await expect(page.getByText("Detail Mason")).toBeVisible();
  });
});