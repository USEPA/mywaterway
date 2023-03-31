import { createContext, useContext, useReducer } from 'react';
// types
import type { Dispatch, KeyboardEvent, MouseEvent, ReactNode } from 'react';

const StateContext = createContext<SurroundingsState | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

function reducer(state: SurroundingsState, action: Action): SurroundingsState {
  switch (action.type) {
    case 'resetAll': {
      return initialState;
    }
    case 'reset': {
      return {
        togglers: {
          ...state.togglers,
          [action.id]: initialToggler,
        },
        disabled: {
          ...state.disabled,
          [action.id]: false,
        },
        updating: {
          ...state.updating,
          [action.id]: false,
        },
        visible: {
          ...state.visible,
          [action.id]: false,
        },
      };
    }
    case 'togglers': {
      return {
        ...state,
        togglers: {
          ...state.togglers,
          [action.id]: action.payload,
        },
      };
    }
    case 'disabled': {
      return {
        ...state,
        disabled: {
          ...state.disabled,
          [action.id]: action.payload,
        },
      };
    }
    case 'updating': {
      return {
        ...state,
        updating: {
          ...state.updating,
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

export function SurroundingsProvider({ children }: ProviderProps) {
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

// Returns state stored in `LayersProvider` context component.
export function useSurroundingsState() {
  const state = useContext(StateContext);
  if (state === undefined) {
    throw new Error(
      'useSurroundingsState must be called within a SurroundingsProvider',
    );
  }
  return state;
}

export function useSurroundingsDispatch() {
  const dispatch = useContext(DispatchContext);
  if (dispatch === undefined) {
    throw new Error(
      'useSurroundingsDispatch must be used within a SurroundingsProvider',
    );
  }

  return dispatch;
}

/*
## Utils
*/

function initialToggler(_showSurroundings: boolean) {
  return () => {};
}

export function isSurroundingFeaturesLayerId(
  layerId: string,
): layerId is SurroundingFeaturesLayerId {
  return (layerIds as readonly string[]).includes(layerId);
}

/*
## Constants
*/

const layerIds = [
  'allWaterbodiesLayer',
  'surroundingMonitoringLocationsLayer',
  'surroundingDischargersLayer',
  'surroundingUsgsStreamgagesLayer',
] as const;

const initialState = layerIds.reduce(
  (state, layerId) => {
    return {
      togglers: {
        ...state.togglers,
        [layerId]: initialToggler,
      },
      disabled: {
        ...state.disabled,
        [layerId]: false,
      },
      updating: {
        ...state.updating,
        [layerId]: false,
      },
      visible: {
        ...state.visible,
        [layerId]: false,
      },
    };
  },
  {
    togglers: {},
    disabled: {},
    updating: {},
    visible: {},
  },
) as SurroundingsState;

/*
## Types
*/

type Action =
  | { type: 'resetAll' }
  | { type: 'reset'; id: SurroundingFeaturesLayerId }
  | {
      type: 'togglers';
      id: SurroundingFeaturesLayerId;
      payload: (
        showSurroundings: boolean,
      ) => (ev: KeyboardEvent | MouseEvent) => void;
    }
  | {
      type: 'disabled';
      id: SurroundingFeaturesLayerId;
      payload: boolean;
    }
  | {
      type: 'updating';
      id: SurroundingFeaturesLayerId;
      payload: boolean;
    }
  | {
      type: 'visible';
      id: SurroundingFeaturesLayerId;
      payload: boolean;
    };

export type SurroundingFeaturesLayerId = (typeof layerIds)[number];

export type SurroundingsState = {
  togglers: {
    [B in SurroundingFeaturesLayerId]: (
      showSurroundings: boolean,
    ) => (ev: KeyboardEvent | MouseEvent) => void;
  };
  disabled: {
    [B in SurroundingFeaturesLayerId]: boolean;
  };
  updating: {
    [B in SurroundingFeaturesLayerId]: boolean;
  };
  visible: {
    [B in SurroundingFeaturesLayerId]: boolean;
  };
};

type ProviderProps = {
  children: ReactNode;
};
