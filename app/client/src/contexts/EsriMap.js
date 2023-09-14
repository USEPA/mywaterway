// @flow

import React, { createContext, useMemo } from 'react';
import type { Node } from 'react';

const EsriMapContext: Object = createContext();

type Props = { children: Node };

function EsriMapProvider({ children }: Props) {
  // (placeholder)

  const state = useMemo(() => ({}), []);

  return (
    <EsriMapContext.Provider value={state}>{children}</EsriMapContext.Provider>
  );
}

export { EsriMapContext, EsriMapProvider };
