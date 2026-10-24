import { useEffect, useRef } from "react";
import { type FetcherWithComponents, useFetcher } from "react-router";
import type { action } from "~/routes/application-detail";

export const UPDATE_DOCUMENT_INTENT = "update-document";

/**
 * One fetcher per document, shared (via `key`) by the inline status select and the edit dialog,
 * so the row shows the optimistic status no matter where the change was made.
 */
export function useDocumentFetcher(documentId: string) {
  return useFetcher<typeof action>({ key: `update-document:${documentId}` });
}

export type DocumentFetcher = ReturnType<typeof useDocumentFetcher>;
type FetcherData = DocumentFetcher extends FetcherWithComponents<infer D> ? D : never;

/** Calls `onSettled` once each time a submission finishes (after revalidation). */
export function useOnFetcherSettled(fetcher: DocumentFetcher, onSettled: (data: NonNullable<FetcherData>) => void) {
  const previous = useRef(fetcher.state);
  const callback = useRef(onSettled);
  callback.current = onSettled;

  useEffect(() => {
    if (previous.current !== "idle" && fetcher.state === "idle" && fetcher.data) callback.current(fetcher.data);
    previous.current = fetcher.state;
  }, [fetcher.state, fetcher.data]);
}

/** First error message from a failed save, if any. */
export function firstError(data: NonNullable<FetcherData>): string | undefined {
  return data.ok ? undefined : Object.values(data.errors).find(Boolean);
}
