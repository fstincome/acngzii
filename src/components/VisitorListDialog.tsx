import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users } from "lucide-react";

export interface VisitorListItem {
  id: string;
  name: string;
  subtitle?: string;
  badge?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: VisitorListItem[];
  onItemClick?: (item: VisitorListItem) => void;
}

export function VisitorListDialog({ open, onOpenChange, title, description, items, onItemClick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {title}
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {items.length}
            </span>
          </DialogTitle>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">No data available.</p>
        ) : (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onItemClick?.(it)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                <span className="font-medium text-foreground truncate flex-1">{it.name}</span>
                {it.subtitle && <span className="text-xs text-muted-foreground shrink-0">{it.subtitle}</span>}
                {it.badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary shrink-0">
                    {it.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
