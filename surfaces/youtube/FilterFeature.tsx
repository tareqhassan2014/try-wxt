import { ShadowPopover } from '@/components/overlay/ShadowPopover';
import { Button } from '@/components/ui/button';

export function FilterFeature() {
  return (
    <ShadowPopover.Root>
      <ShadowPopover.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label="Filter">
          Filter
        </Button>
      </ShadowPopover.Trigger>
      <ShadowPopover.Content
        role="dialog"
        aria-label="Filter panel"
        align="start"
        sideOffset={8}
      >
        <header className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">My Panel</span>
        </header>
        <div className="min-h-24" />
      </ShadowPopover.Content>
    </ShadowPopover.Root>
  );
}
