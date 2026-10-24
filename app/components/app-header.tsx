import { Fragment, type ReactNode } from "react";
import { Link, useMatches } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";

/**
 * Routes opt into the header breadcrumb with:
 *   export const handle: RouteHandle = { breadcrumb: "Applications" }
 * or a function of loader data for dynamic titles.
 */
export interface RouteHandle {
  breadcrumb?: string | ((data: any) => string);
}

export function AppHeader({ children }: { children?: ReactNode }) {
  const matches = useMatches();
  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle | undefined)?.breadcrumb)
    .map((m) => {
      const b = (m.handle as RouteHandle).breadcrumb!;
      return { to: m.pathname, label: typeof b === "function" ? b(m.loaderData) : b };
    });

  return (
    <header data-slot="app-header" className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={crumb.to}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="truncate">
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
