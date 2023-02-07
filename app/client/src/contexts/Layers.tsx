import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
// types
import type { ChangeEvent, Dispatch, ReactNode } from 'react';

const StateContext = createContext<LayersState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<LayersAction> | undefined>(
  undefined,
);

const initialState: LayersState = {
  usgsStreamgagesLayer: null,
};

function reducer(state: LayersState, action: LayersAction): LayersState {
  switch (action.type) {
    case 'resetLayers': {
      return action.payload;
    }
    case 'usgsStreamgagesLayer': {
      return {
        ...state,
        usgsStreamgagesLayer: action.payload,
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

export function useLayersReset() {
  const state = useLayersState();
  const dispatch = useLayersDispatch();

  const resetLayers = useCallback(async () => {
    await Promise.all([
      ...Object.values(state).map(async (layer) => {
        if (layer === null) return;
        if (isAllFeaturesLayer(layer)) {
          await layer.reset();
        }
      }),
    ]);
    dispatch({ type: 'resetLayers', payload: state });
  }, [dispatch, state]);

  return resetLayers;
}

export function useLayersActions() {
  const dispatch = useLayersDispatch();

  const dispatchers = useMemo(() => {
    return {
      setUsgsStreamgagesLayer: (layer: AllFeaturesLayer) =>
        dispatch({ type: 'usgsStreamgagesLayer', payload: layer }),
    };
  }, [dispatch]);

  return { ...dispatchers };
}

/*
## Utils
*/
function isAllFeaturesLayer(
  layer: __esri.Layer | AllFeaturesLayer,
): layer is AllFeaturesLayer {
  return (
    layer.hasOwnProperty('layer') &&
    layer.hasOwnProperty('toggleSurroundings') &&
    layer.hasOwnProperty('reset')
  );
}

/*
## Types
*/

type AllFeaturesLayer = {
  layer: __esri.GroupLayer;
  toggleSurroundings: (ev: ChangeEvent<HTMLInputElement>) => void;
  reset: () => Promise<void>;
};

type LayersState = {
  usgsStreamgagesLayer: AllFeaturesLayer | null;
};

type LayersAction =
  | { type: 'resetLayers'; payload: LayersState }
  | { type: 'usgsStreamgagesLayer'; payload: AllFeaturesLayer };

type LayersProviderProps = {
  children: ReactNode;
};
