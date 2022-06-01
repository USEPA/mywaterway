import {
  Dispatch,
  ReactNode,
  createContext,
  useContext,
  useReducer,
} from 'react';

type Props = {
  children: ReactNode;
};

type UsgsStreamgagesData = {
  value: {
    name: string,
    properties: {
      active: boolean,
      agency: string,
      agencyCode: string,
      hydrologicUnit: string,
      monitoringLocationName: string,
      monitoringLocationNumber: string,
      monitoringLocationType: string,
      monitoringLocationUrl: string,
    },
    Locations: {
      location: {
        coordinates: [number, number],
        type: 'Point',
      },
    }[],
    Datastreams: {
      description: string,
      properties: {
        ParameterCode: string,
        WebDescription: string,
      },
      unitOfMeasurement: {
        name: string,
        symbol: string,
      },
      Observations: {
        phenomenonTime: string, // ISO format datetime
        result: string, // number
      }[],
    }[],
  }[],
};

type UsgsPrecipitationData = {
  declaredType: 'org.cuahsi.waterml.TimeSeriesResponseType',
  globalScope: true,
  name: 'ns1:timeSeriesResponseType',
  nil: false,
  scope: 'javax.xml.bind.JAXBElement$GlobalScope',
  typeSubstituted: false,
  value: {
    queryInfo: Object,
    timeSeries: {
      name: string,
      sourceInfo: {
        siteName: string,
        siteCode: [
          {
            agencyCode: string,
            network: string,
            value: string, // number
          },
        ],
        timeZoneInfo: Object,
        geoLocation: Object,
        note: [],
        siteType: [],
        siteProperty: Object[],
      },
      values: {
        censorCode: [],
        method: [Object],
        offset: [],
        qualifier: [Object],
        qualityControlLevel: [],
        sample: [],
        source: [],
        value: [
          {
            dateTime: string, // ISO format datetime
            qualifiers: ['P'],
            value: string, // number
          },
        ],
      }[],
      variable: Object,
    }[],
  },
};

type UsgsDailyAveragesData = {
  allParamsMean: Object,
  precipitationSum: Object,
};

type State = {
  usgsStreamgages:
    | { status: 'idle', data: {} }
    | { status: 'pending', data: {} }
    | { status: 'success', data: UsgsStreamgagesData }
    | { status: 'failure', data: {} },
  usgsPrecipitation:
    | { status: 'idle', data: {} }
    | { status: 'pending', data: {} }
    | { status: 'success', data: UsgsPrecipitationData }
    | { status: 'failure', data: {} },
  usgsDailyAverages:
    | { status: 'idle', data: {} }
    | { status: 'pending', data: {} }
    | { status: 'success', data: UsgsDailyAveragesData }
    | { status: 'failure', data: {} },
};

export type Action =
  | { type: 'RESET_FETCHED_DATA' }
  | { type: 'USGS_STREAMGAGES/FETCH_REQUEST' }
  | {
      type: 'USGS_STREAMGAGES/FETCH_SUCCESS',
      payload: UsgsStreamgagesData,
    }
  | { type: 'USGS_STREAMGAGES/FETCH_FAILURE' }
  | { type: 'USGS_PRECIPITATION/FETCH_REQUEST' }
  | {
      type: 'USGS_PRECIPITATION/FETCH_SUCCESS',
      payload: UsgsPrecipitationData,
    }
  | { type: 'USGS_PRECIPITATION/FETCH_FAILURE' }
  | { type: 'USGS_DAILY_AVERAGES/FETCH_REQUEST' }
  | {
      type: 'USGS_DAILY_AVERAGES/FETCH_SUCCESS',
      payload: UsgsDailyAveragesData,
    }
  | { type: 'USGS_DAILY_AVERAGES/FETCH_FAILURE' };

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

const initialState: State = {
  usgsStreamgages: { status: 'idle', data: {} },
  usgsPrecipitation: { status: 'idle', data: {} },
  usgsDailyAverages: { status: 'idle', data: {} },
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'RESET_FETCHED_DATA': {
      return initialState;
    }

    case 'USGS_STREAMGAGES/FETCH_REQUEST': {
      return {
        ...state,
        usgsStreamgages: { status: 'pending', data: {} },
      };
    }

    case 'USGS_STREAMGAGES/FETCH_SUCCESS': {
      const data = action.payload;
      return {
        ...state,
        usgsStreamgages: { status: 'success', data },
      };
    }

    case 'USGS_STREAMGAGES/FETCH_FAILURE': {
      return {
        ...state,
        usgsStreamgages: { status: 'failure', data: {} },
      };
    }

    case 'USGS_PRECIPITATION/FETCH_REQUEST': {
      return {
        ...state,
        usgsPrecipitation: { status: 'pending', data: {} },
      };
    }

    case 'USGS_PRECIPITATION/FETCH_SUCCESS': {
      const data = action.payload;
      return {
        ...state,
        usgsPrecipitation: { status: 'success', data },
      };
    }

    case 'USGS_PRECIPITATION/FETCH_FAILURE': {
      return {
        ...state,
        usgsPrecipitation: { status: 'failure', data: {} },
      };
    }

    case 'USGS_DAILY_AVERAGES/FETCH_REQUEST': {
      return {
        ...state,
        usgsDailyAverages: { status: 'pending', data: {} },
      };
    }

    case 'USGS_DAILY_AVERAGES/FETCH_SUCCESS': {
      const data = action.payload;
      return {
        ...state,
        usgsDailyAverages: { status: 'success', data },
      };
    }

    case 'USGS_DAILY_AVERAGES/FETCH_FAILURE': {
      return {
        ...state,
        usgsDailyAverages: { status: 'failure', data: {} },
      };
    }

    default: {
      throw new Error(`Unhandled action type: ${action}`);
    }
  }
}

export function FetchedDataProvider({ children }: Props) {
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
