// STUB — to be implemented.
import type { RouteHandle } from "~/components/app-header";
import { PageHeader } from "~/components/page-header";

export const handle: RouteHandle = { breadcrumb: "Dashboard" };

export default function Page() {
  return <PageHeader title="Dashboard" description="Coming soon." />;
}
