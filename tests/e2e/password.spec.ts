import { expect, test } from "@playwright/test";

const FULL_HASH = "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8";

test("password check sends only a 5-character prefix", async ({ page }) => {
  const seen: string[] = [];
  page.on("request", (request) => {
    const blob = `${request.url()}\n${request.postData() ?? ""}`;
    expect(blob.toLowerCase()).not.toContain(FULL_HASH);
  });
  await page.route("https://api.pwnedpasswords.com/range/*", async (route) => {
    seen.push(route.request().url());
    expect(route.request().postData()).toBeNull();
    expect(route.request().headers()["add-padding"]).toBe("true");
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "1E4C9B93F3F0682250B6CF8331B7EE68FD8:3\n",
    });
  });
  await page.goto("/exposure");
  await page.getByRole("textbox", { name: "Password" }).fill("password");
  await page.getByRole("button", { name: "Check password" }).click();
  await expect(page.getByText("Seen 3 times in the Pwned Passwords corpus.")).toBeVisible();
  expect(seen).toEqual(["https://api.pwnedpasswords.com/range/5BAA6"]);
});

test("falls back to the prefix-only route when the browser is blocked", async ({ page }) => {
  const bodies: string[] = [];
  await page.route("https://api.pwnedpasswords.com/range/*", (route) => route.abort());
  await page.route("**/api/exposure/password-range", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ range: "1E4C9B93F3F0682250B6CF8331B7EE68FD8:9\n" }),
    });
  });
  await page.goto("/exposure");
  await page.getByRole("textbox", { name: "Password" }).fill("password");
  await page.getByRole("button", { name: "Check password" }).click();
  await expect(page.getByText("Seen 9 times in the Pwned Passwords corpus.")).toBeVisible();
  expect(JSON.parse(bodies[0])).toEqual({ prefix: "5BAA6" });
  expect(bodies[0].toLowerCase()).not.toContain(FULL_HASH);
  expect(bodies[0]).not.toContain("password");
});

test("falls back when the range response is not a hash list", async ({ page }) => {
  const bodies: string[] = [];
  await page.route("https://api.pwnedpasswords.com/range/*", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<html>blocked</html>" });
  });
  await page.route("**/api/exposure/password-range", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ range: "1E4C9B93F3F0682250B6CF8331B7EE68FD8:4\n" }),
    });
  });
  await page.goto("/exposure");
  await page.getByRole("textbox", { name: "Password" }).fill("password");
  await page.getByRole("button", { name: "Check password" }).click();
  await expect(page.getByText("Seen 4 times in the Pwned Passwords corpus.")).toBeVisible();
  expect(JSON.parse(bodies[0])).toEqual({ prefix: "5BAA6" });
});
