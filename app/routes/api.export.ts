import { readDocumentsCsv } from "~/lib/csv-store.server";

// GET → the full working CSV, same columns/format as the original spreadsheet.
export async function loader() {
  return new Response(await readDocumentsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sba-documents.csv"`,
    },
  });
}
