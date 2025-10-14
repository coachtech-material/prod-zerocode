declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react';

  export function createPortal(children: ReactNode, container: Element | DocumentFragment, key?: null | string): ReactPortal;
  export function useFormStatus(): { pending: boolean; data: FormData | null; method?: string };
  export function useFormState<State, Payload>(
    action: (state: State, payload: Payload) => State | Promise<State>,
    initialState: State,
  ): [State, (payload: Payload) => void];
}
