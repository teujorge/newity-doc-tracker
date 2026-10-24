import {
  BellIcon,
  DownloadIcon,
  FileTextIcon,
  FolderOpenIcon,
  LayoutDashboardIcon,
  NewspaperIcon,
  RotateCcwIcon,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useFetcher, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "~/components/ui/sidebar";

interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  badge?: number;
}

export function AppSidebar({ stalledCount }: { stalledCount: number }) {
  const { pathname } = useLocation();
  const reset = useFetcher();

  const workItems: NavItem[] = [
    { title: "Dashboard", to: "/", icon: LayoutDashboardIcon },
    { title: "Applications", to: "/applications", icon: FolderOpenIcon, badge: stalledCount || undefined },
    { title: "Documents", to: "/documents", icon: FileTextIcon },
  ];
  const reportItems: NavItem[] = [
    { title: "Weekly Summary", to: "/reports/weekly", icon: NewspaperIcon },
    { title: "Alerts", to: "/alerts", icon: BellIcon },
  ];

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                <NavLink to={item.to} prefetch="intent">
                  <item.icon />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
              {item.badge !== undefined && (
                <SidebarMenuBadge title={`${item.badge} stalled`} className="text-status-expired">
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  DT
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Doc Tracker</span>
                  <span className="truncate text-xs text-muted-foreground">SBA loan documents</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Work", workItems)}
        {renderGroup("Reporting", reportItems)}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Download all data (CSV)">
              <a href="/api/export" download>
                <DownloadIcon />
                <span>Download all data</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Reset demo data"
              disabled={reset.state !== "idle"}
              onClick={() => {
                if (confirm("Reset all documents back to the original sample data? Your edits will be lost.")) {
                  reset.submit(null, { method: "post", action: "/api/reset" });
                }
              }}
            >
              <RotateCcwIcon />
              <span>{reset.state !== "idle" ? "Resetting…" : "Reset demo data"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
