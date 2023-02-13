import { createContext, useCallback, useContext, useReducer } from 'react';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<LayersAction> | undefined>(
  undefined,
);

const initialState: LayersState = {
  resets: {
    usgsStreamgagesLayer: () => Promise.resolve(),
  },
  layers: {
    usgsStreamgagesLayer: null,
  },
  boundariesToggles: {
    usgsStreamgagesLayer: () => null,
  },
  surroundingsVibilities: {
    usgsStreamgagesLayer: false,
  },
};

function reducer(state: LayersState, action: LayersAction): LayersState {
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

export function LayersProvider({ children }: LayersProviderProps) {
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

export function isBoundariesToggleLayerId(
  id: string,
): id is BoundariesToggleLayerId {
  return Object.keys(initialState['boundariesToggles']).includes(id);
}

/*
## Types
*/

type GroupLayerId = 'usgsStreamgagesLayer';

type LayerId = GroupLayerId;

export type LayersState = {
  layers: {
    [G in GroupLayerId]: __esri.GroupLayer | null;
  };
  resets: {
    [L in LayerId]: () => Promise<void>;
  };
  boundariesToggles: {
    [B in BoundariesToggleLayerId]: () => void;
  };
  surroundingsVibilities: {
    [B in BoundariesToggleLayerId]: boolean;
  };
};

type LayersAction =
  | { type: 'resetAll'; payload: LayersState['layers'] }
  | { type: 'layer'; id: 'usgsStreamgagesLayer'; payload: __esri.GroupLayer }
  | { type: 'reset'; id: 'usgsStreamgagesLayer'; payload: () => Promise<void> }
  | {
      type: 'boundariesToggle';
      id: 'usgsStreamgagesLayer';
      payload: () => void;
    }
  | {
      type: 'surroundingsVibility';
      id: 'usgsStreamgagesLayer';
      payload: boolean;
    };

type LayersProviderProps = {
  children: ReactNode;
};

export type BoundariesToggleLayerId = 'usgsStreamgagesLayer';
