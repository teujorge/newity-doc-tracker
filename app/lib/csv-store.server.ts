// The CSV file *is* the database. Server-only: loaders/actions call these, never components.
//
// - Seed: the sample CSV in /docs, bundled at build time via `?raw` so it works anywhere.
// - Working copy: data/documents.csv locally (git-ignored), /tmp on read-only hosts (Vercel).
//   On Vercel the /tmp copy is per-instance and ephemeral — fine for a demo, not for production.
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import seedCsv from "../../docs/NEWITY_Sample_Data_A_Document_Checklist.csv?raw";
import {
  type DocumentRecord,
  type DocumentUpdate,
  applyDocumentUpdate,
  isDocumentStatus,
  normalizeDate,
  toCsvDate,
} from "./domain";

const CSV_COLUMNS = [
  "application_id",
  "business_name",
  "borrower_name",
  "loan_amount",
  "application_date",
  "assigned_processor",
  "document_type",
  "document_status",
  "date_received",
  "expiration_date",
  "notes",
] as const;
type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

const DATA_FILE =
  process.env.DATA_FILE ??
  (process.env.VERCEL ? "/tmp/documents.csv" : path.resolve(process.cwd(), "data", "documents.csv"));

export function documentId(applicationId: string, documentType: string) {
  return `${applicationId}::${documentType}`;
}

function fromCsvRow(row: CsvRow): DocumentRecord {
  const status = row.document_status.trim();
  return {
    id: documentId(row.application_id.trim(), row.document_type.trim()),
    applicationId: row.application_id.trim(),
    businessName: row.business_name.trim(),
    borrowerName: row.borrower_name.trim(),
    loanAmount: Number(row.loan_amount) || 0,
    applicationDate: normalizeDate(row.application_date) ?? "",
    processor: row.assigned_processor.trim(),
    documentType: row.document_type.trim(),
    // Unknown statuses fall back to Pending so a bad cell never hides a document.
    status: isDocumentStatus(status) ? status : "Pending",
    dateReceived: normalizeDate(row.date_received),
    expirationDate: normalizeDate(row.expiration_date),
    notes: row.notes?.trim() ?? "",
  };
}

function toCsvRow(doc: DocumentRecord): CsvRow {
  return {
    application_id: doc.applicationId,
    business_name: doc.businessName,
    borrower_name: doc.borrowerName,
    loan_amount: String(doc.loanAmount),
    application_date: toCsvDate(doc.applicationDate),
    assigned_processor: doc.processor,
    document_type: doc.documentType,
    document_status: doc.status,
    date_received: toCsvDate(doc.dateReceived),
    expiration_date: toCsvDate(doc.expirationDate),
    notes: doc.notes,
  };
}

export function parseDocumentsCsv(csv: string): DocumentRecord[] {
  const result = Papa.parse<CsvRow>(csv.trim(), { header: true, skipEmptyLines: true });
  return result.data.filter((r) => r.application_id && r.document_type).map(fromCsvRow);
}

export function serializeDocumentsCsv(docs: DocumentRecord[]): string {
  return Papa.unparse(docs.map(toCsvRow), { columns: [...CSV_COLUMNS], newline: "\n" }) + "\n";
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, seedCsv, "utf8");
  }
}

/** Read every document row from the working CSV (seeding it on first use). */
export async function readDocuments(): Promise<DocumentRecord[]> {
  await ensureDataFile();
  return parseDocumentsCsv(await fs.readFile(DATA_FILE, "utf8"));
}

export async function readApplicationDocuments(applicationId: string): Promise<DocumentRecord[]> {
  return (await readDocuments()).filter((d) => d.applicationId === applicationId);
}

// Serialize writes within this process so two quick edits can't clobber each other.
let writeQueue: Promise<unknown> = Promise.resolve();
function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => {});
  return run;
}

async function writeDocuments(docs: DocumentRecord[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, serializeDocumentsCsv(docs), "utf8");
}

/** Update one document (by id) and persist. Returns the saved record, or null if not found. */
export function updateDocument(id: string, update: DocumentUpdate, asOf: string): Promise<DocumentRecord | null> {
  return enqueueWrite(async () => {
    const docs = await readDocuments();
    const index = docs.findIndex((d) => d.id === id);
    if (index === -1) return null;
    docs[index] = applyDocumentUpdate(docs[index], update, asOf);
    await writeDocuments(docs);
    return docs[index];
  });
}

/** Restore the working CSV to the original sample data. */
export function resetDocuments(): Promise<void> {
  return enqueueWrite(async () => {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, seedCsv, "utf8");
  });
}

/** Raw CSV text of the working copy (for download). */
export async function readDocumentsCsv(): Promise<string> {
  return serializeDocumentsCsv(await readDocuments());
}
