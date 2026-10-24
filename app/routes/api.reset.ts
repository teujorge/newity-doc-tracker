import { data } from "react-router";
import { resetDocuments } from "~/lib/csv-store.server";

// POST → restore the original sample data.
export async function action() {
  await resetDocuments();
  return data({ ok: true });
}
