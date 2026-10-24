import { PlusIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { FREQUENCY_LABELS, KIND_INFO, createRule } from "./schedule";
import { addRule } from "./store";
import type { AlertFrequency, AlertKind } from "./types";

const KINDS = Object.keys(KIND_INFO) as AlertKind[];

export function AddAlertDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AlertKind>("expiring-documents");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<AlertFrequency>("weekly");

  const reset = () => {
    setKind("expiring-documents");
    setName("");
    setFrequency("weekly");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const rule = createRule(kind, { name: name.trim() || KIND_INFO[kind].label, frequency });
    addRule(rule);
    toast.success(`Added "${rule.name}"`, { description: "You can fine-tune the day and time on its card." });
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Add alert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add an alert</DialogTitle>
            <DialogDescription>Pick what you want to hear about and how often.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="new-alert-kind">What to check</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as AlertKind)}>
              <SelectTrigger id="new-alert-kind" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_INFO[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{KIND_INFO[kind].description}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-alert-name">Name (optional)</Label>
            <Input
              id="new-alert-name"
              value={name}
              placeholder={KIND_INFO[kind].label}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-alert-frequency">How often</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as AlertFrequency)}>
              <SelectTrigger id="new-alert-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCY_LABELS) as AlertFrequency[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Daily and weekly alerts start at 9:00 AM (Mondays for weekly).</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add alert</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
