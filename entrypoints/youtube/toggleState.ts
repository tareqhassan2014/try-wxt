export type ToggleListener = (open: boolean) => void;

export interface ToggleState {
  get(): boolean;
  set(value: boolean): void;
  toggle(): void;
  subscribe(listener: ToggleListener): () => void;
}

export function createToggleState(initial = false): ToggleState {
  let open = initial;
  const listeners = new Set<ToggleListener>();
  const emit = () => listeners.forEach((listener) => listener(open));

  return {
    get: () => open,
    set(value) {
      open = value;
      emit();
    },
    toggle() {
      open = !open;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
