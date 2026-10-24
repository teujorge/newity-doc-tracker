// STUB — to be implemented.
import type { RouteHandle } from "~/components/app-header";
import { PageHeader } from "~/components/page-header";

export const handle: RouteHandle = { breadcrumb: "Application" };

export default function Page() {
  return <PageHeader title="Application" description="Coming soon." />;
}
