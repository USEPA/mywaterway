import {
  Dispatch,
  ReactNode,
  createContext,
  useContext,
  useReducer,
} from 'react';
import type {
  FetchState,
  MonitoringLocationsData,
  UsgsDailyAveragesData,
  UsgsPrecipitationData,
  UsgsStreamgagesData,
} from 'types';

const StateContext = createContext<FetchedDataState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<FetchedDataAction> | undefined>(
  undefined,
);

const initialState: FetchedDataState = {
  monitoringLocations: { status: 'idle', data: null },
  usgsStreamgages: { status: 'idle', data: null },
  usgsPrecipitation: { status: 'idle', data: null },
  usgsDailyAverages: { status: 'idle', data: null },
};

function reducer(
  state: FetchedDataState,
  action: FetchedDataAction,
): FetchedDataState {
  switch (action.type) {
    case 'reset': {
      return initialState;
    }
    case 'pending':
    case 'failure':
    case 'success': {
      return {
        ...state,
        [action.id]: buildNewDataState(action),
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action}`);
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
## Types
*/

type ProviderProps = {
  children: ReactNode;
};

type FetchedData = {
  monitoringLocations: MonitoringLocationsData;
  usgsStreamgages: UsgsStreamgagesData;
  usgsPrecipitation: UsgsPrecipitationData;
  usgsDailyAverages: UsgsDailyAveragesData;
};

type FetchedDataState = {
  [D in keyof FetchedData]: FetchState<FetchedData[D]>;
};

type FetchedDataSuccessAction = {
  [D in keyof FetchedDataState]: {
    type: 'success';
    id: D;
    payload: FetchedData[D];
  };
}[keyof FetchedDataState];

export type FetchedDataAction =
  | { type: 'reset' }
  | { type: 'pending'; id: keyof FetchedDataState }
  | { type: 'failure'; id: keyof FetchedDataState }
  | FetchedDataSuccessAction;
