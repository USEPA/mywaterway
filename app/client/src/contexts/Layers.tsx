import { createContext, useContext, useReducer } from 'react';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: LayersState, action: Action): LayersState {
  switch (action.type) {
    case 'layer': {
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: action.payload,
        },
      };
    }
    default: {
      throw new Error(`Unhandled action type: ${action}`);
    }
  }
}

export function LayersProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

/*
## Hooks
*/

export function useLayers() {
  const state = useLayersState();

  return state.layers;
}

// Returns state stored in `LayersProvider` context component.
export function useLayersState() {
  const state = useContext(StateContext);
  if (state === undefined) {
    throw new Error('useLayersState must be called within a LayersProvider');
  }
  return state;
}

export function useLayersDispatch() {
  const dispatch = useContext(DispatchContext);
  if (dispatch === undefined) {
    throw new Error('useLayersDispatch must be used within a LayersProvider');
  }

  return dispatch;
}

/*
## Constants
*/

const layerIds = [
  'waterbodyLayer',
  'monitoringLocationsLayer',
  'dischargersLayer',
  'usgsStreamgagesLayer',
] as const;

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      layers: {
        ...state.layers,
        [layerId]: null,
      },
    };
  },
  {
    layers: {},
  },
) as LayersState;

/*
## Types
*/

type Action = {
  type: 'layer';
  id: LayerId;
  payload: LayersState['layers'][LayerId];
};

export type LayerId = (typeof layerIds)[number];

export type LayersState = {
  layers: {
    [L in LayerId]: __esri.GroupLayer | null;
  };
};

type ProviderProps = {
  children: ReactNode;
};
