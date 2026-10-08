import { test, expect } from "@playwright/test";

test("game CRUD preserves bigint App IDs and protects duplicates", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/games");
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.getByRole("button", { name: "Add Game" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Steam App ID").fill("9223372036854775806");
  await dialog.getByLabel("Name", { exact: true }).fill("Bigint test game");
  await dialog.getByRole("button", { name: "Tambah record" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("tbody")).toContainText("9223372036854775806");
  await page.reload();
  const row = page.locator("tbody tr").filter({ hasText: "Bigint test game" });
  await row.getByRole("button", { name: /Edit/ }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Edited game");
  await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator("tbody")).toContainText("Edited game");
  await page.getByRole("button", { name: "Add Game" }).click();
  await dialog.getByLabel("Steam App ID").fill("9223372036854775806");
  await dialog.getByLabel("Name", { exact: true }).fill("Duplicate");
  await dialog.getByRole("button", { name: "Tambah record" }).click();
  await expect(dialog.getByRole("alert")).toContainText("sudah ada");
  await page.keyboard.press("Escape");
  await page
    .locator("tbody tr")
    .filter({ hasText: "Edited game" })
    .getByRole("button", { name: /Delete/ })
    .click();
  await dialog
    .getByRole("button", { name: "Hapus record", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  await page.screenshot({
    path: ".artifacts/admin-games-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("CSV validates before import; insert only preserves existing metadata", async ({
  page,
}) => {
  await page.goto("/admin/import-games");
  await page.getByText("Atau paste isi CSV").click();
  await page.getByRole("textbox", { name: "Isi CSV" }).fill("game_id\n730");
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "membutuhkan app_id",
  );
  await page
    .getByRole("textbox", { name: "Isi CSV" })
    .fill(
      'app_id,name,description,genre\n1245620,Overwrite,Description,RPG\n99999999,"CSV, game","Line one\nLine two",Action|RPG',
    );
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await page.getByRole("button", { name: "Jalankan import" }).click();
  await expect(page.getByRole("status")).toContainText("Import selesai");
  await page.screenshot({
    path: ".artifacts/admin-import-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin/games");
  await expect(page.locator("tbody")).toContainText("ELDEN RING");
  await expect(page.locator("tbody")).toContainText("CSV, game");
  await page.goto("/admin/import-games");
  await page.getByText("Atau paste isi CSV").click();
  await page
    .getByRole("textbox", { name: "Isi CSV" })
    .fill("app_id,name\n1245620,Updated by CSV");
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await page.getByLabel("Mode import").selectOption("UPSERT");
  await page.getByRole("button", { name: "Jalankan import" }).click();
  await expect(page.getByRole("status")).toContainText("Import selesai");
  await page.goto("/admin/games");
  await expect(page.locator("tbody")).toContainText("Updated by CSV");
});

test("asset deletion is explicit and requires confirmation", async ({
  page,
}) => {
  await page.goto("/admin/import-assets");
  await page.getByText("Atau paste isi CSV").click();
  const csv = page.getByRole("textbox", { name: "Isi CSV" });
  await csv.fill("game_id,lua_data\n1245620,");
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "action eksplisit",
  );
  await csv.fill(
    "game_id,action,lua_data,metadata,encryption\n1245620,INSERT,\\x0123,\\x4567,v1",
  );
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await page.getByRole("button", { name: "Jalankan import" }).click();
  await expect(page.getByRole("status")).toContainText("Import selesai");
  await page.goto("/admin/assets");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("ELDEN RING");
  await page.getByRole("button", { name: /Edit/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan perubahan" })
    .click();
  await expect(
    page.locator("tbody tr").getByText("Yes", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: /Edit/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: /Hapus Encrypted Lua/ })
    .check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan perubahan" })
    .click();
  await expect(
    page.locator("tbody tr").getByText("Yes", { exact: true }),
  ).toHaveCount(1);
  await expect(
    page.locator("tbody tr").getByText("No", { exact: true }),
  ).toHaveCount(1);
  await page.goto("/admin/import-assets");
  await page.getByText("Atau paste isi CSV").click();
  await csv.fill("game_id,action\n1245620,DELETE");
  await page.getByRole("button", { name: "Validasi CSV" }).click();
  await expect(
    page.getByRole("button", { name: "Jalankan import" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Jalankan import" }).click();
  await expect(page.getByRole("status")).toContainText("Import selesai");
  await page.goto("/admin/assets");
  await expect(
    page.getByRole("heading", { name: "Belum ada record." }),
  ).toBeVisible();
});

test("user support actions and versions work without storing passwords", async ({
  page,
}) => {
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Add User" }).click();
  const createDialog = page.getByRole("dialog");
  await createDialog.getByLabel("Email", { exact: true }).fill("support@example.test");
  await createDialog.getByLabel("New password").fill("temporary-password-123");
  await createDialog.getByLabel("Machine info").fill("machine-A");
  await createDialog.getByRole("button", { name: "Tambah record" }).click();
  await expect(createDialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Add User" })).toBeVisible();
  await expect(page.locator("tbody")).toContainText("support@example.test");
  await page.getByRole("button", { name: "View 1" }).click();
  await page.getByRole("button", { name: "Verify user" }).click();
  await expect(page.locator("tbody")).toContainText("Yes");
  await page.getByRole("button", { name: "View 1" }).click();
  await page.getByRole("button", { name: "Reset machine binding" }).click();
  await expect(page.getByRole("dialog").getByLabel("Machine info")).toHaveValue(
    "",
  );
  await page.getByRole("dialog").getByLabel("Role code").fill("7");
  await page.getByRole("dialog").getByLabel("Role name").fill("support");
  await page
    .getByRole("dialog")
    .getByLabel("New password")
    .fill("replacement-password-123");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(page.locator("tbody")).not.toContainText("machine-A");
  const saved = await page.evaluate(() =>
    localStorage.getItem("nextgame-admin-preview-v1"),
  );
  expect(saved).not.toContain("password");
  expect(saved).not.toContain("private");
  await page.goto("/admin/versions");
  await page.getByRole("button", { name: "Add Version" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Version", { exact: true })
    .fill("1.2.3");
  await page.getByRole("button", { name: "Tambah record" }).click();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "1.2.3" })).toBeVisible();
  await page.screenshot({
    path: ".artifacts/admin-dashboard-desktop.png",
    fullPage: true,
  });
  await page.goto("/admin/audit");
  await expect(page.locator("tbody")).toContainText("UPDATE");
  await page.getByRole("button", { name: /View/ }).first().click();
  await expect(page.getByRole("dialog")).not.toContainText("password_hash");
});

test("admin mobile navigation, empty states, and unauthenticated API boundaries", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/admin");
  await page.getByRole("button", { name: "Buka menu admin" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Buka menu admin" }),
  ).toBeFocused();
  await page.screenshot({
    path: ".artifacts/admin-dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const section of [
    "libraries",
    "transactions",
    "sync",
    "games",
    "assets",
    "users",
    "versions",
    "audit",
    "import-games",
    "import-assets",

  ]) {
    await page.goto(`/admin/${section}`);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/admin/transactions");
  await expect(page.getByRole("button", { name: /Delete/ })).toHaveCount(0);
  const response = await request.get("/api/admin/users");
  expect(response.status()).toBe(401);
  const mutation = await request.patch("/api/admin/games", {
    data: { id: "1", data: { name: "Unauthorized" } },
  });
  expect(mutation.status()).toBe(401);
  const login = await request.post("/api/admin/session", {
    headers: { origin: "https://attacker.example" },
    data: { email: "x", password: "x" },
  });
  expect(login.status()).toBe(400);
  expect(errors).toEqual([]);
});
