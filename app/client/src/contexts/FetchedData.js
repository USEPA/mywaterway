// @flow

import {
  Dispatch,
  ReactNode,
  createContext,
  useContext,
  useReducer,
} from 'react';

type Props = {
  children: ReactNode,
};

type State = {
  usgsDailyAverages:
    | { status: 'idle', data: {} }
    | { status: 'pending', data: {} }
    | { status: 'success', data: Object }
    | { status: 'failure', data: {} },
};

export type Action =
  | { type: 'RESET_FETCHED_DATA' }
  | { type: 'USGS_DAILY_AVERAGES/FETCH_REQUEST' }
  | {
      type: 'USGS_DAILY_AVERAGES/FETCH_SUCCESS',
      payload: Object,
    }
  | { type: 'USGS_DAILY_AVERAGES/FETCH_FAILURE' };

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

const initialState: State = {
  usgsDailyAverages: { status: 'idle', data: {} },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'RESET_FETCHED_DATA': {
      return initialState;
    }

    case 'USGS_DAILY_AVERAGES/FETCH_REQUEST': {
      return {
        ...state,
        usgsDailyAverages: { status: 'pending', data: {} },
      };
    }

    case 'USGS_DAILY_AVERAGES/FETCH_SUCCESS': {
      const data = action.payload;
      return {
        ...state,
        usgsDailyAverages: { status: 'success', data },
      };
    }

    case 'USGS_DAILY_AVERAGES/FETCH_FAILURE': {
      return {
        ...state,
        usgsDailyAverages: { status: 'failure', data: {} },
      };
    }

    default: {
      throw new Error(`Unhandled action type: ${action}`);
    }
  }
}

export function FetchedDataProvider({ children }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

/**
 * Returns state stored in `FetchedDataProvider` context component.
 */
export function useFetchedDataState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error(
      'useFetchedDataState must be called within a FetchedDataProvider',
    );
  }
  return context;
}

/**
 * Returns `dispatch` method for dispatching actions to update state stored in
 * `FetchedDataProvider` context component.
 */
export function useFetchedDataDispatch() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error(
      'useFetchedDataDispatch must be used within a FetchedDataProvider',
    );
  }
  return context;
}
