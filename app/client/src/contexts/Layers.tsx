import {
  createContext,
  MouseEventHandler,
  useCallback,
  useContext,
  useReducer,
} from 'react';
// classes
import {
  AllFeaturesLayer,
  AllGraphicsLayer,
} from 'classes/BoundariesToggleLayer';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: LayersState, action: Action): LayersState {
  switch (action.type) {
    case 'resetAll': {
      return {
        ...state,
        layers: action.payload,
      };
    }
    case 'layer': {
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: action.payload,
        },
      };
    }
    case 'reset': {
      return {
        ...state,
        resets: {
          ...state.resets,
          [action.id]: action.payload,
        },
      };
    }
    case 'boundariesToggle': {
      return {
        ...state,
        boundariesToggles: {
          ...state.boundariesToggles,
          [action.id]: action.payload,
        },
      };
    }
    case 'surroundingsVibility': {
      return {
        ...state,
        surroundingsVibilities: {
          ...state.surroundingsVibilities,
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

export function useLayers() {
  const state = useLayersState();

  return state.layers;
}

/*
## Hooks
*/

// Returns state stored in `LayersProvider` context component.
function useLayersState() {
  const state = useContext(StateContext);
  if (state === undefined) {
    throw new Error('useLayersState must be called within a LayersProvider');
  }
  return state;
}

export function useLayersBoundariesToggles() {
  const state = useLayersState();

  return state.boundariesToggles;
}

export function useLayersSurroundingsVisibilities() {
  const state = useLayersState();

  return state.surroundingsVibilities;
}

export function useLayersDispatch() {
  const dispatch = useContext(DispatchContext);
  if (dispatch === undefined) {
    throw new Error('useLayersDispatch must be used within a LayersProvider');
  }

  return dispatch;
}

export function useLayersReset() {
  const state = useLayersState();
  const dispatch = useLayersDispatch();

  const resetLayers = useCallback(async () => {
    await Promise.all([
      ...Object.values(state.resets).map(async (reset) => {
        await reset();
      }),
    ]);
    dispatch({ type: 'resetAll', payload: state.layers });
  }, [dispatch, state]);

  return resetLayers;
}

/*
## Utils
*/

function initialBoundariesToggle(_showSurroundings: boolean) {
  return () => {};
}

/*
## Constants
*/

// `placeholderLayer` is only present to keep TypeScript happy
// until we add an `AllGraphicsLayer` (if we ever do)
const layerIds = [
  'monitoringLocationsLayer',
  'placeholderLayer',
  'dischargersLayer',
  'usgsStreamgagesLayer',
];

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      resets: {
        ...state.resets,
        [layerId]: () => Promise.resolve(),
      },
      layers: {
        ...state.layers,
        [layerId]: null,
      },
      boundariesToggles: {
        ...state.boundariesToggles,
        [layerId]: initialBoundariesToggle,
      },
      surroundingsVibilities: {
        ...state.surroundingsVibilities,
        [layerId]: false,
      },
    };
  },
  { resets: {}, layers: {}, boundariesToggles: {}, surroundingsVibilities: {} },
) as LayersState;

/*
## Types
*/

type Action =
  | { type: 'resetAll'; payload: LayersState['layers'] }
  | {
      type: 'layer';
      id: LayerId;
      payload: Exclude<LayersState['layers'][LayerId], 'null'>;
    }
  | { type: 'reset'; id: LayerId; payload: () => Promise<void> }
  | {
      type: 'boundariesToggle';
      id: BoundariesToggleLayerId;
      payload: (showSurroundings: boolean) => MouseEventHandler<HTMLDivElement>;
    }
  | {
      type: 'surroundingsVibility';
      id: BoundariesToggleLayerId;
      payload: boolean;
    };

export type BoundariesToggleLayerId = AllFeaturesLayerId | AllGraphicsLayerId;

export type AllFeaturesLayerId =
  | 'usgsStreamgagesLayer'
  | 'monitoringLocationsLayer'
  | 'dischargersLayer';

type AllGraphicsLayerId = 'placeholderLayer';

type LayerId = keyof (typeof initialState)['layers'];

export type LayersState = {
  layers: {
    [F in AllFeaturesLayerId]: AllFeaturesLayer | null;
  } & {
    [G in AllGraphicsLayerId]: AllGraphicsLayer | null;
  };
  resets: {
    [L in LayerId]: () => Promise<void>;
  };
  boundariesToggles: {
    [B in BoundariesToggleLayerId]: (
      showSurroundings: boolean,
    ) => MouseEventHandler<HTMLDivElement>;
  };
  surroundingsVibilities: {
    [B in BoundariesToggleLayerId]: boolean;
  };
};

type ProviderProps = {
  children: ReactNode;
};
