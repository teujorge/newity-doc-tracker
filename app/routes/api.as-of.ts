import { data } from "react-router";
import { asOfCookie } from "~/lib/as-of.server";
import { normalizeDate } from "~/lib/domain";
import type { Route } from "./+types/api.as-of";

// POST asOf=yyyy-MM-dd → sets the as-of cookie; React Router then revalidates all loaders.
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const asOf = normalizeDate(String(form.get("asOf") ?? ""));
  if (!asOf) return data({ ok: false, error: "Invalid date" }, { status: 400 });
  return data({ ok: true, asOf }, { headers: { "Set-Cookie": await asOfCookie.serialize(asOf) } });
}
