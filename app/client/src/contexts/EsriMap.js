// @flow

import React from 'react';
import type { Node } from 'react';

const EsriMapContext: Object = React.createContext();

type Props = { children: Node };

function EsriMapProvider({ children }: Props) {
  // (placeholder)

  return (
    <EsriMapContext.Provider value={{}}>{children}</EsriMapContext.Provider>
  );
}

export { EsriMapContext, EsriMapProvider };
