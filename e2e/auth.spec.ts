import { test, expect } from "@playwright/test";

const PW = "playwright_test_123";

test.describe("Authentication", () => {
  test("login page visible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("unauthenticated user redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register then login then dashboard", async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;
    const resp = await page.request.post("/api/register", {
      data: { name: "E2E User", email, password: PW },
    });
    expect(resp.ok()).toBeTruthy();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});