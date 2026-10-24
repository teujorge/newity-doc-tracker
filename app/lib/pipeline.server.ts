// One call for loaders: read the CSV, derive statuses for the current as-of date, roll up.
import { getAsOf } from "./as-of.server";
import { readDocuments } from "./csv-store.server";
import { deriveDocuments, summarizeApplications, summarizePipeline } from "./domain";

export async function loadPipeline(request: Request) {
  const asOf = await getAsOf(request);
  const documents = deriveDocuments(await readDocuments(), asOf);
  const applications = summarizeApplications(documents, asOf);
  const summary = summarizePipeline(documents, applications, asOf);
  return { asOf, documents, applications, summary };
}
