import { test, expect } from "@playwright/test";

test("desktop preview cycles, pauses and opens Discord information", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".desktop-preview");
  await preview.scrollIntoViewIfNeeded();
  const title = preview.locator(".dp-feature-copy h4");
  const first = await title.textContent();
  await expect(title).not.toHaveText(first!, { timeout: 8000 });
  await preview.getByRole("button", { name: "Jeda slideshow" }).click();
  const pausedTitle = await title.textContent();
  await page.waitForTimeout(5500);
  await expect(title).toHaveText(pausedTitle!);
  await preview.getByRole("button", { name: "Game berikutnya" }).click();
  await expect(title).not.toHaveText(pausedTitle!);
  await preview.locator(".dp-sidebar").hover();
  await expect
    .poll(() =>
      preview
        .locator(".dp-sidebar")
        .evaluate((el) => el.getBoundingClientRect().width),
    )
    .toBeGreaterThan(150);
  await preview
    .getByRole("button", { name: "Lihat game", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .locator("#request-game")
    .getByRole("button", { name: "Undangan Discord segera tersedia" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "channel Request Game di Discord",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Undangan Discord tersedia nanti",
  );
});

test("reduced-motion mobile stays usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "70.000+ Game. Satu Library." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka menu" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Buka menu" })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("actual catalog filters, details and honest availability", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "70.000+ Game. Satu Library." }),
  ).toBeVisible();
  await expect(page.locator(".game-shell")).toHaveCount(8);
  await page
    .getByRole("combobox", { name: "Filter genre" })
    .selectOption("Indie");
  await expect(page.locator(".game-shell")).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "Filter genre" })
    .selectOption("all");
  await page.getByRole("searchbox", { name: "Cari game" }).fill("cyberpunk");
  await expect(page.locator(".game-shell")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Cari game" })
    .fill("game-yang-tidak-ada");
  await expect(
    page.getByRole("heading", { name: "Tidak ada judul yang cocok" }),
  ).toBeVisible();
  await page
    .locator(".empty-state")
    .getByRole("button", { name: "Request Game" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "channel Request Game di Discord",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Hapus semua filter" }).click();
  await page
    .locator(".game-shell")
    .filter({ hasText: "Cyberpunk 2077" })
    .getByRole("button", { name: "Buka detail Cyberpunk 2077", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Cyberpunk 2077" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lihat di Steam" }),
  ).toHaveAttribute("href", "https://store.steampowered.com/app/1091500/");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".coming-badge")).toHaveCount(3);
  await page.locator(".nav-download").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Tautan unduhan aplikasi belum tersedia",
  );
  await page.keyboard.press("Escape");
  await page
    .locator("#akses")
    .getByRole("button", { name: "Get Steam Access" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Harga dan tautan pembelian belum tersedia",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Notify Me" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Pendaftaran notifikasi belum tersedia",
  );
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Lihat Katalog" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Support via Discord" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "channel Support Center di Discord",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Undangan Discord tersedia nanti",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".faq-item")).toHaveCount(18);
  await page
    .getByRole("button", { name: "Apakah semua game Steam tersedia?" })
    .click();
  await expect(page.locator("#faq-answer-5")).toContainText(
    "Hanya game yang sudah tersedia dan didukung",
  );
  await expect(page.locator("main")).not.toContainText("120K+");
  expect(errors).toEqual([]);
});

test("mobile navigation, accordion and viewport fit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Buka menu" }).click();
  await expect(
    page.getByRole("button", { name: "Tutup menu" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#mobile-menu")
    .getByRole("link", { name: "Platforms" })
    .click();
  await expect(page.getByRole("button", { name: "Buka menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".coming-badge")).toHaveCount(3);
  await page
    .getByRole("button", {
      name: "Apakah EA sudah tersedia?",
    })
    .click();
  await expect(page.locator("#faq-answer-10")).toBeVisible();
  await expect(page.locator("#faq-answer-10")).toContainText("Coming Soon");
  await page
    .getByRole("button", {
      name: "Bagaimana saya mengikuti penanganan support?",
    })
    .click();
  await expect(page.locator("#faq-answer-17")).toContainText(
    "channel support Discord",
  );
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fits).toBe(true);
});

test("visual review captures and local artwork", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: ".artifacts/desktop-hero.png" });
  await page.locator("#fitur").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".artifacts/desktop-featured.png" });
  await page.locator("#katalog").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".artifacts/desktop-catalog.png" });
  await page.locator("#platform").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".artifacts/desktop-access.png" });
  await page.locator("#request-game").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".artifacts/desktop-request-support.png" });
  await page.locator("#akses").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: ".artifacts/desktop-pricing.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".artifacts/mobile-hero.png" });
  await page.locator("#platform").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".artifacts/mobile-access.png" });
  await page.locator("#support").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".artifacts/mobile-support.png" });
  await page.locator("#akses").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: ".artifacts/mobile-pricing.png" });
  const broken = await page
    .locator("img")
    .evaluateAll((imgs) =>
      imgs.flatMap((img) =>
        img instanceof HTMLImageElement &&
        img.complete &&
        img.naturalWidth === 0
          ? [img.src]
          : [],
      ),
    );
  expect(broken).toEqual([]);
});
