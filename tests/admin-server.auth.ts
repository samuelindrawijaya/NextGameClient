import { test, expect } from "@playwright/test";

test.afterAll(async ({ request }) => {
  await request.get("http://127.0.0.1:3501/shutdown");
});

test("additional admin signs in; disable and password reset revoke existing sessions", async ({
  page,
  browser,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Email").fill("operator@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-operator-password-123");
  await page.getByRole("button", { name: "Masuk admin" }).click();
  await expect(
    page.getByRole("heading", { name: "Your library. Under control." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Admin Accounts", exact: true }).click();
  await page.getByRole("button", { name: "Add Admin" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email").fill("second@example.test");
  await dialog
    .getByLabel("Temporary password")
    .fill("second-admin-password-123");
  await dialog.getByRole("button", { name: "Tambah record" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("tbody")).toContainText("second@example.test");
  await page.screenshot({
    path: ".artifacts/admin-accounts.png",
    fullPage: true,
  });
  const second = await browser.newContext({ baseURL: "http://localhost:3001" });
  const other = await second.newPage();
  try {
    const login = async (password: string) => {
      await other.goto("/admin");
      await other.getByLabel("Email").fill("second@example.test");
      await other.getByLabel("Password", { exact: true }).fill(password);
      await other.getByRole("button", { name: "Masuk admin" }).click();
    };
    await login("second-admin-password-123");
    await expect(
      other.getByRole("heading", { name: "Your library. Under control." }),
    ).toBeVisible();
    expect(
      (
        await second.request.patch("/api/admin/admins", {
          headers: { origin: "http://localhost:3001" },
          data: { id: "1", data: { is_active: false } },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.post("/api/admin/admins", {
          headers: { origin: "http://localhost:3001" },
          data: {
            data: {
              email: "operator@example.test",
              password: "another-test-password",
            },
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await page.request.patch("/api/admin/admins", {
          headers: { origin: "http://localhost:3001" },
          data: { id: "1", data: { is_active: false } },
        })
      ).status(),
    ).toBe(200);
    expect((await second.request.get("/api/admin/games")).status()).toBe(401);
    await page.request.patch("/api/admin/admins", {
      headers: { origin: "http://localhost:3001" },
      data: { id: "1", data: { is_active: true } },
    });
    expect((await second.request.get("/api/admin/games")).status()).toBe(401);
    await login("second-admin-password-123");
    await expect(
      other.getByRole("heading", { name: "Your library. Under control." }),
    ).toBeVisible();
    await page.request.patch("/api/admin/admins", {
      headers: { origin: "http://localhost:3001" },
      data: { id: "1", data: { password: "new-admin-password-123" } },
    });
    expect((await second.request.get("/api/admin/games")).status()).toBe(401);
    await login("second-admin-password-123");
    await expect(other.locator("main").getByRole("alert")).toContainText(
      "tidak sesuai",
    );
    await other
      .getByLabel("Password", { exact: true })
      .fill("new-admin-password-123");
    await other.getByRole("button", { name: "Masuk admin" }).click();
    await expect(
      other.getByRole("heading", { name: "Your library. Under control." }),
    ).toBeVisible();
    expect(
      await (await second.request.get("/api/admin/admins")).text(),
    ).not.toContain("password_hash");
    expect(
      (
        await second.request.delete("/api/admin/admins", {
          headers: { origin: "http://localhost:3001" },
          data: { id: "1", confirm: true },
        })
      ).status(),
    ).toBe(403);
  } finally {
    await second.close();
  }
});

test("production operator login protects mutations and hashes user passwords on server", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await request.get("/api/admin/games")).status()).toBe(401);
  await page.getByLabel("Email").fill("operator@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Masuk admin" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "tidak sesuai",
  );
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-operator-password-123");
  await page.getByRole("button", { name: "Masuk admin" }).click();
  await expect(
    page.getByRole("heading", { name: "Your library. Under control." }),
  ).toBeVisible();
  const cookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === "nextgame_admin",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Strict");
  await page.goto("/admin/games");
  await expect(page.locator("tbody")).toContainText("ELDEN RING");
  for (const query of ["elden", "1245620"]) {
    const result = await page.request.get(`/api/admin/games?q=${query}`);
    expect(result.status()).toBe(200);
    expect((await result.json()).rows[0].app_id).toBe("1245620");
    const lookup = await page.request.get(
      `/api/admin/games?lookup=true&q=${query}`,
    );
    expect(lookup.status()).toBe(200);
    expect((await lookup.json()).pageSize).toBe(8);
  }
  const missing = await page.request.get("/api/admin/games?q=999999");
  expect((await missing.json()).rows).toHaveLength(0);
  const available = await page.request.get(
    "/api/admin/games?lookup=true&assets_only=true&q=1245620",
  );
  expect(available.status()).toBe(200);
  expect((await available.json()).rows[0].app_id).toBe("1245620");
  const absent = await page.request.get(
    "/api/admin/games?lookup=true&assets_only=true&q=999999",
  );
  expect((await absent.json()).rows).toHaveLength(0);
  const blockedGrant = await page.request.post("/api/admin/libraries", {
    headers: { origin: "http://localhost:3001" },
    data: { data: { user_id: "1", app_id_buy: "999999" } },
  });
  expect(blockedGrant.status()).toBe(409);
  expect((await blockedGrant.json()).error).toContain("belum memiliki asset");
  expect((await page.request.get("/api/admin/games?q=el")).status()).toBe(400);
  const timedOut = await page.request.get("/api/admin/games?q=timeout");
  expect(timedOut.status()).toBe(502);
  expect((await timedOut.json()).error).toContain("migration 004");
  await page.getByRole("button", { name: "Edit 1" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Updated from server");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator("tbody")).toContainText("Updated from server");
  const csrf = await page.request.patch("/api/admin/games", {
    headers: { origin: "https://attacker.example" },
    data: { id: "1", data: { name: "Rejected" } },
  });
  expect(csrf.status()).toBe(400);
  const user = await page.request.post("/api/admin/users", {
    headers: { origin: "http://localhost:3001" },
    data: {
      data: {
        email: "user@example.test",
        password: "test-user-password-123",
        access_role_code: 1,
        access_role_name: "user",
        is_verified: false,
        free_claim_game: 0,
      },
    },
  });
  expect(user.status()).toBe(403);
  const edited = await page.request.patch("/api/admin/users", {
    headers: { origin: "http://localhost:3001" },
    data: { id: "1", data: { password: "test-user-password-123" } },
  });
  expect(edited.status()).toBe(200);
  expect(await user.text()).not.toContain("password");
  const check = await request.get("http://127.0.0.1:3501/checks");
  expect(await check.json()).toEqual({ credentialCheck: true, changed: true });
  await page.goto("/admin/users");
  await expect(page.getByRole("button", { name: "Add User" })).toHaveCount(0);
  await page.goto("/admin/libraries");
  await page.getByRole("button", { name: "Add Library" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Updated from server" }),
  ).toBeVisible();
  await page.screenshot({ path: ".artifacts/library-redesign-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: ".artifacts/library-redesign-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "user@example.test" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Updated from server" })
    .click();
  await page.getByLabel("Sumber game").selectOption("purchase");
  await page.getByLabel("Invoice pembelian").selectOption("1");
  await page.getByRole("button", { name: "Tambahkan ke library" }).click();
  await expect(page.locator("tbody")).toContainText("INV-MANUAL");
  const invoices = await page.request.get("/api/admin/transactions");
  expect((await invoices.json()).rows[0]).toMatchObject({
    is_processed: false,
    is_invoice_used: false,
  });
  await page.goto("/admin/transactions");
  await page.getByRole("button", { name: "Edit 1", exact: true }).click();
  await page.getByLabel("Processed", { exact: true }).check();
  await page.getByLabel("Invoice used", { exact: true }).check();
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator("tbody")).toContainText("Processed");
  const html = await page.content();
  expect(html).not.toContain("test-service-role");
  expect(html).not.toContain("test-secret-for-admin-session");
  await page.screenshot({
    path: ".artifacts/admin-live-fixture.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Logout admin" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/users")).status()).toBe(401);
  await page.context().addCookies([
    {
      name: "nextgame_admin",
      value: `${cookie!.value}tampered`,
      url: "http://localhost:3001",
    },
  ]);
  expect((await page.request.get("/api/admin/users")).status()).toBe(401);
});
