import {
  Dispatch,
  ReactNode,
  createContext,
  useContext,
  useReducer,
} from 'react';
import type {
  Facility,
  FetchSuccessState,
  MonitoringLocationAttributes,
  UsgsStreamgageAttributes,
} from 'types';

const StateContext = createContext<FetchedDataState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<FetchedDataAction> | undefined>(
  undefined,
);

function reducer(
  state: FetchedDataState,
  action: FetchedDataAction,
): FetchedDataState {
  switch (action.type) {
    case 'reset': {
      return initialState;
    }
    case 'idle':
    case 'pending':
    case 'failure':
    case 'success': {
      return {
        ...state,
        [action.id]: buildNewDataState(action),
      };
    }
    default: {
      throw new Error(`Unhandled action type.`);
    }
  }
}

export function FetchedDataProvider({ children }: ProviderProps) {
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

/*
## Utils
*/

function buildNewDataState(action: FetchedDataAction) {
  switch (action.type) {
    case 'idle':
    case 'failure':
    case 'pending': {
      return { status: action.type, data: null };
    }
    case 'success': {
      return { status: action.type, data: action.payload };
    }
  }
}

/*
## Constants
*/

const dataKeys = [
  'monitoringLocations',
  'permittedDischargers',
  'usgsStreamgages',
  'localMonitoringLocations',
  'localPermittedDischargers',
  'localUsgsStreamgages',
];

const initialState = dataKeys.reduce((state, key) => {
  return {
    ...state,
    [key]: { status: 'pending', data: null },
  };
}, {}) as FetchedDataState;

/*
## Types
*/

type ProviderProps = {
  children: ReactNode;
};

type EmptyFetchStatus = Exclude<FetchStatus, 'success'>;

export type EmptyFetchState = {
  status: EmptyFetchStatus;
  data: null;
};

export type FetchState<T> = EmptyFetchState | FetchSuccessState<T>;

export type FetchedData = {
  monitoringLocations: MonitoringLocationAttributes[];
  permittedDischargers: Facility[];
  usgsStreamgages: UsgsStreamgageAttributes[];
  localMonitoringLocations: MonitoringLocationAttributes[];
  localPermittedDischargers: Facility[];
  localUsgsStreamgages: UsgsStreamgageAttributes[];
};

export type FetchedDataAction =
  | { type: 'reset' }
  | FetchedDataEmptyAction
  | FetchedDataSuccessAction;

type FetchedDataEmptyAction = {
  [E in EmptyFetchStatus]: {
    type: E;
    id: keyof FetchedDataState;
  };
}[EmptyFetchStatus];

export type FetchedDataState = {
  [D in keyof FetchedData]: FetchState<FetchedData[D]>;
};

export type FetchedDataSuccessAction = {
  [D in keyof FetchedDataState]: {
    type: 'success';
    id: D;
    payload: FetchedData[D];
  };
}[keyof FetchedDataState];

export type FetchStatus = 'idle' | 'pending' | 'failure' | 'success';
