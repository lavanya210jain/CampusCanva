import { test, expect } from "@playwright/test";

test("MySQL UI: login, create, upload, refresh, delete, reports and mobile layout", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page
    .locator('input[type="email"]')
    .fill("student.demo@campuscanva.local");
  await page.locator('input[type="password"]').fill("CampusCanva123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: /Persona:/ })).toHaveCount(0);
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
    await urlInput.fill("");
    // URL imports still require a URL when no local file is selected.
    await expect(urlInput).toHaveJSProperty("required", true);
    expect(await urlInput.evaluate((input) => input.checkValidity())).toBe(
      false,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    await upload.locator("input[type=file]").setInputFiles({
      name: "browser-memory.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(urlInput).toHaveValue("");
    await expect(urlInput).toHaveJSProperty("required", false);
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

test("private visibility and local profile photo controls work in the UI", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page
    .locator('input[type="email"]')
    .fill("student.demo@campuscanva.local");
  await page.locator('input[type="password"]').fill("CampusCanva123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Welcome back, Demo/ }),
  ).toBeVisible();
  const outsiderContext = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  const outsider = await outsiderContext.newPage();
  let spaceId;
  const original = await (await page.request.get("/api/auth/me")).json();
  try {
    await page.getByRole("button", { name: "New Space", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Create memory space" });
    await create.locator("#space-visibility").selectOption("Private");
    const title = `Private browser ${Date.now()}`;
    await create
      .getByPlaceholder("e.g. Moksha 2026, Manali Trip, Batch of 2025")
      .fill(title);
    await create
      .getByRole("button", { name: "Create Space", exact: true })
      .click();
    await expect(page).toHaveURL(/\/spaces\/\d+$/);
    spaceId = Number(new URL(page.url()).pathname.split("/").at(-1));
    await outsider.goto("/login");
    await outsider
      .locator('input[type="email"]')
      .fill("faculty.demo@campuscanva.local");
    await outsider.locator('input[type="password"]').fill("CampusCanva123!");
    await outsider
      .getByRole("button", { name: "Sign In", exact: true })
      .click();
    await expect(outsider).toHaveURL(/\/dashboard$/);
    await outsider.goto("/explore");
    await expect(outsider.getByText(title, { exact: true })).toHaveCount(0);
    expect(
      (await outsider.request.get(`/api/spaces/${spaceId}`)).status(),
    ).toBe(404);
    await page.getByRole("button", { name: "About Space & Spot" }).click();
    await page.getByRole("button", { name: "Edit space details" }).click();
    await page.getByLabel("Space visibility").selectOption("Public");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText("Visibility: Public", { exact: true }),
    ).toBeVisible();
    expect(
      (await outsider.request.get(`/api/spaces/${spaceId}`)).status(),
    ).toBe(200);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Edit Profile" }).click();
    const phone = page.locator("#profile-phone");
    await phone.fill("12345");
    expect(await phone.evaluate((input) => input.checkValidity())).toBe(false);
    await phone.fill("+91 98765 43210");
    expect(await phone.evaluate((input) => input.checkValidity())).toBe(true);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    await page.locator("#avatar-file").setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: png,
    });
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    await expect(page.locator("#avatar-file")).toHaveCount(0);
    const result = await (await page.request.get("/api/auth/me")).json();
    expect(result.avatar_url).toMatch(/^\/api\/avatars\//);
    expect(result.phone).toBe("9876543210");
    await page.reload();
    await expect(
      page.locator(`img[src="${result.avatar_url}"]`).first(),
    ).toBeVisible();
    await page.goto("/register");
    await page.getByPlaceholder("Your full name").fill("Example Member");
    await expect(page.locator("#register-phone")).toBeVisible();
    await page.locator("#register-phone").fill("12345");
    expect(
      await page
        .locator("#register-phone")
        .evaluate((input) => input.checkValidity()),
    ).toBe(false);
  } finally {
    await page.request.patch("/api/users/1", {
      data: { avatar_url: original.avatar_url, phone: original.phone || "" },
    });
    if (spaceId) await page.request.delete(`/api/spaces/${spaceId}`);
    await outsiderContext.close();
  }
});

test("an unlocked capsule appears in notifications without refreshing the browser", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .locator('input[type="email"]')
    .fill("student.demo@campuscanva.local");
  await page.locator('input[type="password"]').fill("CampusCanva123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const title = `Live capsule ${Date.now()}`;
  const response = await page.request.post("/api/spaces", {
    data: {
      title,
      description: "Automatic notification test",
      space_type: "General",
      visibility: "Private",
      is_time_locked: true,
      unlock_date: new Date(Date.now() + 2500).toISOString(),
    },
  });
  expect(response.status()).toBe(201);
  const s = await response.json();
  try {
    await page.goto("/notifications");
    await expect(
      page.getByText(`“${title}” is now open. View your memories.`, {
        exact: true,
      }),
    ).toBeVisible({ timeout: 12000 });
    await expect(
      page.getByText(`“${title}” is now open. View your memories.`, {
        exact: true,
      }),
    ).toHaveCount(1);
  } finally {
    await page.request.delete(`/api/spaces/${s.space_id}`);
  }
});

test("welcome and sign-in pages offer no passwordless evaluator access", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Evaluator Quick Access", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Demo Student", exact: false }),
  ).toHaveCount(0);
  await page.goto("/login");
  await expect(page.getByText("Lab Evaluator 1-Click Access")).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveValue("");
  await expect(page.locator('input[type="password"]')).toHaveValue("");
  expect(
    (
      await page.request.post("/api/auth/demo", { data: { userId: 1 } })
    ).status(),
  ).toBe(404);
  expect((await page.request.get("/api/auth/me")).status()).toBe(401);
});

test("feature previews respond to selection and theme persists across public and signed-in pages", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", {
      name: "College happens once. Keep the good parts.",
    }),
  ).toBeVisible();
  const capsules = page.getByRole("button", {
    name: /A gift to your future self/,
  });
  await capsules.click();
  await expect(capsules).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Send a memory to your future self." }),
  ).toBeVisible();
  const sharing = page.getByRole("button", {
    name: /Shared with the right people/,
  });
  await sharing.click();
  await expect(sharing).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", {
      name: "Some stories are just for your circle.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Switch to light mode", exact: true })
    .click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  expect(
    await page.evaluate(() => localStorage.getItem("campuscanva_theme")),
  ).toBe("light");
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await page.goto("/register");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.goto("/login");
  await page
    .locator('input[type="email"]')
    .fill("student.demo@campuscanva.local");
  await page.locator('input[type="password"]').fill("CampusCanva123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New Space", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create memory space" });
  await expect(dialog).toBeVisible();
  expect(
    await dialog
      .locator("form")
      .evaluate((form) => getComputedStyle(form.parentElement).backgroundColor),
  ).not.toBe("rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/dashboard",
    "/explore",
    "/profile",
    "/database-lab",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Switch to light mode", exact: true }),
    ).toBeVisible();
  }
});
