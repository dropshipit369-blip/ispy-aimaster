import { appOrigin } from "./billing.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}
const withOrigin = (origin?: string) =>
  new Request("https://example.supabase.co/functions/v1/create-checkout", { method: "POST", headers: origin ? { origin } : {} });

Deno.test("returns to the production app when APP_URL still points at the legacy domain", () => {
  Deno.env.set("APP_URL", "https://ispy-profit-tool.vercel.app");
  Deno.env.delete("APP_ALLOWED_ORIGINS");
  assertEquals(appOrigin(withOrigin("https://ispy-ai1-main.vercel.app")), "https://ispy-ai1-main.vercel.app", "allowlisted production origin");
});

Deno.test("never returns to an unapproved origin", () => {
  Deno.env.set("APP_URL", "https://ispy-ai1-main.vercel.app");
  Deno.env.delete("APP_ALLOWED_ORIGINS");
  assertEquals(appOrigin(withOrigin("https://evil.example")), "https://ispy-ai1-main.vercel.app", "foreign origin falls back to APP_URL");
  assertEquals(appOrigin(withOrigin("http://ispy-ai1-main.vercel.app")), "https://ispy-ai1-main.vercel.app", "http downgrade rejected");
  assertEquals(appOrigin(withOrigin("https://ispy-ai1-main.vercel.app.evil.example")), "https://ispy-ai1-main.vercel.app", "suffix spoof rejected");
});

Deno.test("defaults to the production app when APP_URL is unset", () => {
  Deno.env.delete("APP_URL");
  Deno.env.delete("APP_ALLOWED_ORIGINS");
  assertEquals(appOrigin(), "https://ispy-ai1-main.vercel.app", "default origin");
});

Deno.test("honours extra approved origins such as a future custom domain", () => {
  Deno.env.delete("APP_URL");
  Deno.env.set("APP_ALLOWED_ORIGINS", "https://ispy.ai, not a url");
  assertEquals(appOrigin(withOrigin("https://ispy.ai")), "https://ispy.ai", "custom domain");
});
