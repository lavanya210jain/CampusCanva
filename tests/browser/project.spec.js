import { test, expect } from "@playwright/test";

test("MySQL UI: login, create, upload, refresh, delete, reports and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const title = `Browser check ${Date.now()}`;
  let spaceId;
  try {
    await page.getByRole("button", { name: "New Space", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Create memory space" });
    await create
      .getByPlaceholder("e.g. Moksha 2026, Manali Trip, Batch of 2025")
      .fill(title);
    await create
      .getByPlaceholder("What makes this campus moment special?")
      .fill("UI-to-MySQL persistence check");
    await create
      .getByRole("button", { name: "Create Space", exact: true })
      .click();
    await expect(page).toHaveURL(/\/spaces\/\d+$/);
    spaceId = Number(new URL(page.url()).pathname.split("/").at(-1));
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Add Memory/i })
      .first()
      .click();
    const upload = page.getByRole("dialog", { name: "Add campus memory" });
    await expect(upload.locator("select")).toHaveValue(String(spaceId));
    const urlInput = upload.locator('input[type="url"]');
    await urlInput.fill('');
    // URL imports still require a URL when no local file is selected.
    await expect(urlInput).toHaveJSProperty('required', true);
    expect(await urlInput.evaluate(input => input.checkValidity())).toBe(false);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    await upload
      .locator("input[type=file]")
      .setInputFiles({
        name: "browser-memory.png",
        mimeType: "image/png",
        buffer: png,
      });
    await expect(urlInput).toHaveValue('');
    await expect(urlInput).toHaveJSProperty('required', false);
    await expect(urlInput).toBeDisabled();
    await upload
      .getByPlaceholder("Who was there? What was the moment about?")
      .fill("Browser uploaded memory");
    await upload
      .getByRole("button", { name: "Add Memory", exact: true })
      .click();
    await expect(upload).not.toBeVisible();
    await expect(page.getByAltText("Browser uploaded memory")).toBeVisible();
    await page.getByAltText("Browser uploaded memory").click();
    const lightbox = page.getByRole("dialog", { name: "Campus memory" });
    await expect(lightbox).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await lightbox.getByTitle("Delete media item").click();
    await expect(lightbox).not.toBeVisible();
    await expect(page.getByAltText("Browser uploaded memory")).toHaveCount(0);
    const media = await page.request.get(`/api/spaces/${spaceId}/media`);
    expect(await media.json()).toHaveLength(0);
    await page.goto("/database-lab");
    await expect(page.locator("section")).toHaveCount(4);
    await page.locator("summary").first().click();
    await expect(page.locator("pre").first()).toContainText(
      "vw_space_analytics",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/dashboard", "/explore", "/database-lab"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  } finally {
    if (spaceId) await page.request.delete(`/api/spaces/${spaceId}`);
  }
});
