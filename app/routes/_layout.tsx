import { Outlet } from "react-router";
import { AppHeader } from "~/components/app-header";
import { AppSidebar } from "~/components/app-sidebar";
import { AsOfPicker } from "~/components/as-of-picker";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AlertsBell } from "~/features/alerts/alerts-bell";
import { AlertsScheduler } from "~/features/alerts/alerts-scheduler";
import { loadPipeline } from "~/lib/pipeline.server";
import type { Route } from "./+types/_layout";

export async function loader({ request }: Route.LoaderArgs) {
  const { asOf, summary } = await loadPipeline(request);
  return { asOf, stalledCount: summary.stalledApplications };
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar stalledCount={loaderData.stalledCount} />
      <SidebarInset className="min-w-0">
        <AppHeader>
          <AsOfPicker asOf={loaderData.asOf} />
          <AlertsBell />
        </AppHeader>
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <AlertsScheduler />
    </SidebarProvider>
  );
}
