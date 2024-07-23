import {
  Dispatch,
  ReactNode,
  createContext,
  useContext,
  useReducer,
} from 'react';
import type {
  CyanWaterbodyAttributes,
  DischargerAttributes,
  FetchSuccessState,
  MonitoringLocationAttributes,
  UsgsStreamgageAttributes,
} from 'types';
import { fetchCheck } from 'utils/fetchUtils';
import { useConfigFilesState } from './ConfigFiles';

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

export function FetchedDataProvider({ children }: Readonly<ProviderProps>) {
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

// Custom hook for the services.json file.
let organizationsInitialized = false; // global var for ensuring fetch only happens once
export function useOrganizationsData() {
  const configFiles = useConfigFilesState();
  const { organizations } = useFetchedDataState();
  const fetchedDataDispatch = useFetchedDataDispatch();

  if (
    !organizationsInitialized &&
    ['idle', 'pending'].includes(organizations.status)
  ) {
    organizationsInitialized = true;

    // fetch the lookup file
    const outFields = ['organizationid', 'orgtype', 'reportingcycle', 'state'];
    fetchCheck(
      `${
        configFiles.data.services.waterbodyService.controlTable
      }/query?where=1%3D1&outFields=${outFields.join('%2C')}&f=json`,
    )
      .then((data) => {
        fetchedDataDispatch({
          type: 'success',
          id: 'organizations',
          payload: data.features.map((feat: __esri.Graphic) => feat.attributes),
        });
      })
      .catch((err) => {
        console.error(err);
        fetchedDataDispatch({
          type: 'failure',
          id: 'organizations',
        });
      });
  }

  return organizations;
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
  'cyanWaterbodies',
  'dischargers',
  'monitoringLocations',
  'organizations',
  'usgsStreamgages',
  'surroundingCyanWaterbodies',
  'surroundingMonitoringLocations',
  'surroundingDischargers',
  'surroundingUsgsStreamgages',
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
  cyanWaterbodies: CyanWaterbodyAttributes[];
  dischargers: DischargerAttributes[];
  monitoringLocations: MonitoringLocationAttributes[];
  organizations: {
    organizationid: string;
    orgtype: string;
    reportingcycle: number;
    state: string;
  }[];
  usgsStreamgages: UsgsStreamgageAttributes[];
  surroundingCyanWaterbodies: CyanWaterbodyAttributes[];
  surroundingMonitoringLocations: MonitoringLocationAttributes[];
  surroundingDischargers: DischargerAttributes[];
  surroundingUsgsStreamgages: UsgsStreamgageAttributes[];
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
