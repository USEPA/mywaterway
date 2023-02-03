import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';
// utils
import { isFeatureLayer } from 'utils/mapFunctions';
// types
import type { Dispatch, ReactNode } from 'react';

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

export function useLayersActions() {
  const state = useLayersState();
  const dispatch = useLayersDispatch();

  const resetLayers = useCallback(async () => {
    await Promise.all([
      ...Object.values(state).map(async (layer) => {
        if (layer === null) return;
        if (isFeatureLayer(layer)) {
          const featureSet = await layer.queryFeatures();
          layer.applyEdits({
            deleteFeatures: featureSet.features,
          });
        }
      }),
    ]);
    dispatch({ type: 'resetLayers', payload: state });
  }, [dispatch, state]);

  const dispatchers = useMemo(() => {
    return {
      setUsgsStreamgagesLayer: (layer: __esri.FeatureLayer) =>
        dispatch({ type: 'usgsStreamgagesLayer', payload: layer }),
    };
  }, [dispatch]);

  return { resetLayers, ...dispatchers };
}

export type LayersState = {
  usgsStreamgagesLayer: __esri.FeatureLayer | null;
};

type LayersAction =
  | { type: 'resetLayers'; payload: LayersState }
  | { type: 'usgsStreamgagesLayer'; payload: __esri.FeatureLayer };

type LayersProviderProps = {
  children: ReactNode;
};
