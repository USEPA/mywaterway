import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import {
  AttainsImpairmentField,
  AttainsUseField,
  CharacteristicGroupMappings,
  ExtremeWeatherConfig,
  ServicesData,
} from 'types';

type Props = {
  children: ReactNode;
};

export type ConfigFiles = {
  attainsTribeMapping: any;
  characteristicGroupMappings: CharacteristicGroupMappings;
  cyanMetadata: number[];
  dataPage: any;
  documentOrder: any;
  educators: any;
  extremeWeather: ExtremeWeatherConfig;
  glossary: {
    [term: string]: {
      term: string;
      definition: string;
    };
  };
  impairmentFields: AttainsImpairmentField[];
  layerProps: any;
  notifications: any;
  NARS: any;
  parameters: any;
  reportStatusMapping: any;
  services: ServicesData;
  stateNationalUses: any;
  surveyMapping: any;
  useFields: AttainsUseField[];
  usgsStaParameters: any;
  waterTypeOptions: any;
  wqxTribeMapping: any;
};

type State =
  | { status: 'idle'; data: Record<string, never> }
  | { status: 'pending'; data: Record<string, never> }
  | { status: 'success'; data: ConfigFiles }
  | { status: 'failure'; data: Record<string, never> };

export type Action =
  | { type: 'FETCH_CONFIG_REQUEST' }
  | {
      type: 'FETCH_CONFIG_SUCCESS';
      payload: ConfigFiles;
    }
  | { type: 'FETCH_CONFIG_FAILURE' };

export const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_CONFIG_REQUEST': {
      return {
        status: 'pending',
        data: {},
      };
    }

    case 'FETCH_CONFIG_SUCCESS': {
      return {
        status: 'success',
        data: action.payload,
      };
    }

    case 'FETCH_CONFIG_FAILURE': {
      return {
        status: 'failure',
        data: {},
      };
    }

    default: {
      const message = `Unhandled action type: ${action}`;
      throw new Error(message);
    }
  }
}

export function ConfigFilesProvider({ children }: Readonly<Props>) {
  const initialState: State = {
    status: 'idle',
    data: {},
  };

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
 * Returns state stored in `ConfigFilesProvider` context component.
 */
export function useConfigFilesState() {
  const context = useContext(StateContext);
  if (context === undefined) {
    const message =
      'useConfigFilesState must be called within a ConfigFilesProvider';
    throw new Error(message);
  }
  return context;
}

/**
 * Returns `dispatch` method for dispatching actions to update state stored in
 * `ConfigFilesProvider` context component.
 */
export function useConfigFilesDispatch() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    const message =
      'useConfigFilesDispatch must be used within a ConfigFilesProvider';
    throw new Error(message);
  }
  return context;
}
