import { MailIcon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      <PrinterIcon data-icon="inline-start" />
      Print / Save as PDF
    </Button>
  );
}

/** Copies a plain-text version of the report so it can be pasted straight into an email. */
export function CopyAsEmailButton({ getText }: { getText: () => string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(getText());
      toast.success("Summary copied", { description: "Paste it into a new email to leadership." });
    } catch {
      toast.error("Couldn't copy to the clipboard", {
        description: "Your browser blocked it. Try Print / Save as PDF instead.",
      });
    }
  }
  return (
    <Button type="button" size="sm" onClick={copy}>
      <MailIcon data-icon="inline-start" />
      Copy as email
    </Button>
  );
}
