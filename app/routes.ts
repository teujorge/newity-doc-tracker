import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // App shell: sidebar + header wrap every page.
  layout("routes/_layout.tsx", [
    index("routes/dashboard.tsx"),
    route("applications", "routes/applications.tsx"),
    route("applications/:applicationId", "routes/application-detail.tsx"),
    route("documents", "routes/documents.tsx"),
    route("reports/weekly", "routes/weekly-summary.tsx"),
    route("alerts", "routes/alerts.tsx"),
  ]),

  // Resource routes (no UI): our small JSON/CSV "API".
  ...prefix("api", [
    route("as-of", "routes/api.as-of.ts"),
    route("export", "routes/api.export.ts"),
    route("reset", "routes/api.reset.ts"),
    route("alerts", "routes/api.alerts.ts"),
  ]),
] satisfies RouteConfig;
