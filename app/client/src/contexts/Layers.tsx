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
  surroundingsToggles: {
    usgsStreamgagesLayer: () => null,
  },
};

function reducer(state: LayersState, action: LayersAction): LayersState {
  switch (action.type) {
    case 'resetLayers': {
      return {
        ...state,
        layers: action.payload,
      };
    }
    case 'usgsStreamgagesLayer': {
      return {
        ...state,
        layers: {
          ...state.layers,
          usgsStreamgagesLayer: action.payload,
        },
      };
    }
    case 'usgsStreamgagesLayerReset': {
      return {
        ...state,
        resets: {
          ...state.resets,
          usgsStreamgagesLayer: action.payload,
        },
      };
    }
    case 'usgsStreamgagesLayerSurroundingsToggle': {
      return {
        ...state,
        surroundingsToggles: {
          ...state.surroundingsToggles,
          usgsStreamgagesLayer: action.payload,
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

export function useLayersActions() {
  const dispatch = useLayersDispatch();

  const dispatchers = useMemo(() => {
    return {
      setUsgsStreamgagesLayer: (layer: __esri.GroupLayer) =>
        dispatch({ type: 'usgsStreamgagesLayer', payload: layer }),
      setUsgsStreamgagesLayerReset: (reset: () => Promise<void>) =>
        dispatch({ type: 'usgsStreamgagesLayerReset', payload: reset }),
      setUsgsStreamgagesLayerSurroundingsToggle: (
        toggle: (visible: boolean) => void,
      ) =>
        dispatch({
          type: 'usgsStreamgagesLayerSurroundingsToggle',
          payload: toggle,
        }),
    };
  }, [dispatch]);

  return dispatchers;
}

// Returns state stored in `LayersProvider` context component.
function useLayersState() {
  const state = useContext(StateContext);
  if (state === undefined) {
    throw new Error('useLayersState must be called within a LayersProvider');
  }
  return state;
}

export function useLayersSurroundingsToggles() {
  const state = useLayersState();

  return state.surroundingsToggles;
}

function useLayersDispatch() {
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
    dispatch({ type: 'resetLayers', payload: state.layers });
  }, [dispatch, state]);

  return resetLayers;
}

/*
## Types
*/

type GroupLayerId = 'usgsStreamgagesLayer';

type LayerId = GroupLayerId;

type LayersState = {
  layers: {
    [G in GroupLayerId]: __esri.GroupLayer | null;
  };
  resets: {
    [L in LayerId]: () => Promise<void>;
  };
  surroundingsToggles: {
    [S in SurroundingsToggleLayerId]: (visible: boolean) => void;
  };
};

type LayersAction =
  | { type: 'resetLayers'; payload: LayersState['layers'] }
  | { type: 'usgsStreamgagesLayer'; payload: __esri.GroupLayer }
  | { type: 'usgsStreamgagesLayerReset'; payload: () => Promise<void> }
  | {
      type: 'usgsStreamgagesLayerSurroundingsToggle';
      payload: (visible: boolean) => void;
    };

type LayersProviderProps = {
  children: ReactNode;
};

type SurroundingsToggleLayerId = 'usgsStreamgagesLayer';
