import { useRouteLoaderData } from "react-router";
import { DEFAULT_AS_OF } from "~/lib/domain";
import type { loader } from "~/routes/_layout";

/** The current "as of" date (ISO), from the app-shell loader. Usable from any component. */
export function useAsOf(): string {
  return useRouteLoaderData<typeof loader>("routes/_layout")?.asOf ?? DEFAULT_AS_OF;
}
