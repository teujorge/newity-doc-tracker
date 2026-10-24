// STUB — to be implemented.
import type { RouteHandle } from "~/components/app-header";
import { PageHeader } from "~/components/page-header";

export const handle: RouteHandle = { breadcrumb: "Applications" };

export default function Page() {
  return <PageHeader title="Applications" description="Coming soon." />;
}
