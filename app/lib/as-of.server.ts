// "As of" date: every expiration / stalled calculation is relative to this date.
// Stored in a cookie so server loaders see the same date the user picked in the header.
import { createCookie } from "react-router";
import { DEFAULT_AS_OF, normalizeDate } from "./domain";

export const asOfCookie = createCookie("as-of", {
  path: "/",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
});

export async function getAsOf(request: Request): Promise<string> {
  const value = await asOfCookie.parse(request.headers.get("Cookie"));
  return (typeof value === "string" && normalizeDate(value)) || DEFAULT_AS_OF;
}
