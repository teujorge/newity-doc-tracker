import { ChartColumnIcon, FileClockIcon, HourglassIcon } from "lucide-react";
import type { AlertKind } from "./types";

export const KIND_ICONS: Record<AlertKind, typeof FileClockIcon> = {
  "expiring-documents": FileClockIcon,
  "stalled-applications": HourglassIcon,
  "weekly-summary": ChartColumnIcon,
};
