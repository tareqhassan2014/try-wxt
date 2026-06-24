import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { useShadowRoot } from './ShadowRootContext';
import { shouldPreventDismiss } from './dismissGuard';

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Anchor = PopoverPrimitive.Anchor;

const Content = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 8, onInteractOutside, ...props }, ref) => {
  const { container, host } = useShadowRoot();
  return (
    <PopoverPrimitive.Portal container={container ?? undefined}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onInteractOutside={(event) => {
          // Centralized PR #2433 workaround: an interaction crossing our shadow
          // host is really inside the UI — keep the overlay open.
          if (shouldPreventDismiss(event.composedPath(), host)) {
            event.preventDefault();
          }
          onInteractOutside?.(event);
        }}
        className={cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
Content.displayName = 'ShadowPopoverContent';

export const ShadowPopover = Object.assign(Root, {
  Root,
  Trigger,
  Anchor,
  Content,
});
