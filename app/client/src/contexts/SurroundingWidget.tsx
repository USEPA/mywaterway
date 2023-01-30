import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';

type State = {};
export type Action = null;

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

const initialState: State = {};

function reducer(state: State, action: Action): State {
  return {};
}

type Props = {
  children: ReactNode;
};

export function SurroundingWidgetProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Returns state stored in `SurroundingWidgetProvider` context component.
export function useSurroundingWidgetState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useFetchedDataState must be called within a FetchedDataProvider',
    );
  }
  return context;
}

export function useSurroundingWidgetDispatch() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error(
      'useFetchedDataDispatch must be used within a FetchedDataProvider',
    );
  }
  return context;
}
