import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
// types
import type { Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: LayersState, action: Action): LayersState {
  switch (action.type) {
    case 'allErrored': {
      return {
        ...state,
        errored: action.payload,
      };
    }
    case 'allLayers': {
      return {
        ...state,
        layers: action.payload,
      };
    }
    case 'allVisible': {
      return {
        ...state,
        visible: {
          ...action.payload,
        },
      };
    }
    case 'errored': {
      return {
        ...state,
        errored: {
          ...state.errored,
          [action.id]: action.payload,
        },
      };
    }
    case 'layers': {
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.id]: action.payload,
        },
      };
    }
    case 'resetters': {
      return {
        ...state,
        resetters: {
          ...state.resetters,
          [action.id]: action.payload,
        },
      };
    }
    case 'visible': {
      return {
        ...state,
        visible: {
          ...state.visible,
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
  const dispatch = useContext(DispatchContext);

  if (state === undefined || dispatch === undefined) {
    throw new Error('useLayersState must be called within a LayersProvider');
  }

  const setLayer = useCallback(
    <L extends LayerId>(layerId: L, layer: LayersState['layers'][L]) => {
      dispatch({ type: 'layers', id: layerId, payload: layer });
    },
    [dispatch],
  );

  const flattenedLayers = useMemo(() => {
    return Object.values(state.layers).reduce<__esri.Layer[]>(
      (current, next) => {
        if (next === null) return current;
        else return [...current, next];
      },
      [],
    );
  }, [state]);

  const resetLayers = useCallback(async () => {
    await Promise.all([
      ...Object.values(state.resetters).map(async (reset) => {
        await reset();
      }),
    ]);
    dispatch({ type: 'allLayers', payload: state.layers });
  }, [dispatch, state]);

  const updateErroredLayers = useCallback(
    (updates = {}, merge = true) => {
      const newErroredLayers: LayersState['errored'] = {
        ...(merge ? state.errored : initialState.errored),
        ...updates,
      };
      if (JSON.stringify(newErroredLayers) !== JSON.stringify(state.errored)) {
        dispatch({ type: 'allErrored', payload: newErroredLayers });
      }
    },
    [dispatch, state],
  );

  const updateVisibleLayers = useCallback(
    (updates = {}, merge = true) => {
      const newVisibleLayers: LayersState['visible'] = {
        ...(merge ? state.visible : initialState.visible),
        ...updates,
      };
      if (JSON.stringify(newVisibleLayers) !== JSON.stringify(state.visible)) {
        dispatch({ type: 'allVisible', payload: newVisibleLayers });
      }
    },
    [dispatch, state],
  );

  return {
    ...state,
    flattenedLayers,
    resetLayers,
    setLayer,
    updateErroredLayers,
    updateVisibleLayers,
  };
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
  'allWaterbodiesLayer',
  'monitoringLocationsLayer',
  'dischargersLayer',
  'usgsStreamgagesLayer',
] as const;

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      errored: {
        ...state.errored,
        [layerId]: false,
      },
      layers: {
        ...state.layers,
        [layerId]: null,
      },
      resetters: {
        ...state.resetters,
        [layerId]: () => {},
      },
      visible: {
        ...state.visible,
        [layerId]: false,
      },
    };
  },
  {
    errored: {},
    layers: {},
    resetters: {},
    visible: {},
  },
) as LayersState;

/*
## Types
*/

type Action =
  | {
      type: 'allErrored';
      payload: LayersState['errored'];
    }
  | {
      type: 'allLayers';
      payload: LayersState['layers'];
    }
  | {
      type: 'allVisible';
      payload: LayersState['visible'];
    }
  | {
      type: 'errored';
      id: LayerId;
      payload: LayersState['errored'][LayerId];
    }
  | {
      type: 'layers';
      id: LayerId;
      payload: LayersState['layers'][LayerId];
    }
  | {
      type: 'resetters';
      id: LayerId;
      payload: LayersState['resetters'][LayerId];
    }
  | {
      type: 'visible';
      id: LayerId;
      payload: LayersState['visible'][LayerId];
    };

export type LayerId = (typeof layerIds)[number];

export type LayersState = {
  errored: {
    [L in LayerId]: boolean;
  };
  layers: {
    [L in LayerId]: __esri.GroupLayer | null;
  };
  resetters: {
    [L in LayerId]: (() => Promise<void>) | (() => void);
  };
  visible: {
    [L in LayerId]: boolean;
  };
};

type ProviderProps = {
  children: ReactNode;
};
