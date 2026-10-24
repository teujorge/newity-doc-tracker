import { BellRingIcon, MonitorSmartphoneIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getDesktopPermission, requestDesktopPermission, type DesktopPermission } from "./run-rule";

/** Optional: let alerts also pop up as system notifications (only while the app is open). */
export function DesktopNotificationsButton() {
  // Read after mount; the server can't know the browser's permission.
  const [permission, setPermission] = useState<DesktopPermission | null>(null);
  useEffect(() => setPermission(getDesktopPermission()), []);

  if (permission === null || permission === "unsupported") return null;

  if (permission === "granted") {
    return (
      <Badge variant="secondary" className="h-8 gap-1.5 px-3">
        <MonitorSmartphoneIcon /> Desktop notifications on
      </Badge>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Desktop notifications are blocked. You can allow them in your browser's site settings.
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={async () => {
        const result = await requestDesktopPermission();
        setPermission(result);
        if (result === "granted") toast.success("Desktop notifications turned on");
      }}
    >
      <BellRingIcon /> Enable desktop notifications
    </Button>
  );
}
