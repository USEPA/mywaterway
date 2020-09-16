// @flow

import React from 'react';
import type { Node } from 'react';
// utilities
import { lookupFetch } from 'utils/fetchUtils';

// Common function for setting the context/state of lookup files.
function getLookupFile(filename: string, setVariable: Function) {
  // fetch the lookup file
  lookupFetch(filename)
    .then((data) => {
      setVariable({ status: 'success', data });
    })
    .catch((err) => {
      console.error(err);
      setVariable({ status: 'failure', data: err });
    });
}

// --- components ---
type LookupFile = {
  status: 'fetching' | 'success' | 'failure',
  data: Object,
};

type LookupFiles = {
  documentOrder: LookupFile,
  setDocumentOrder: Function,
  reportStatusMapping: LookupFile,
  setReportStatusMapping: Function,
  stateNationalUses: LookupFile,
  setStateNationalUses: Function,
  surveyMapping: LookupFile,
  setSurveyMapping: Function,
  waterTypeOptions: LookupFile,
  setWaterTypeOptions: Function,
  nars: LookupFile,
  setNars: Function,
  notifications: LookupFile,
  setNotifications: Function,
};

const LookupFilesContext: Object = React.createContext<LookupFiles>({
  documentOrder: { status: 'fetching', data: null },
  setDocumentOrder: () => {},
  reportStatusMapping: { status: 'fetching', data: null },
  setReportStatusMapping: () => {},
  stateNationalUses: { status: 'fetching', data: null },
  setStateNationalUses: () => {},
  surveyMapping: { status: 'fetching', data: null },
  setSurveyMapping: () => {},
  waterTypeOptions: { status: 'fetching', data: null },
  setWaterTypeOptions: () => {},
  nars: { status: 'fetching', data: null },
  setNars: () => {},
  notifications: { status: 'fetching', data: null },
  setNotifications: () => {},
});

type Props = {
  children: Node,
};

function LookupFilesProvider({ children }: Props) {
  const [documentOrder, setDocumentOrder] = React.useState({
    status: 'fetching',
    data: {},
  });
  const [reportStatusMapping, setReportStatusMapping] = React.useState({
    status: 'fetching',
    data: {},
  });
  const [stateNationalUses, setStateNationalUses] = React.useState({
    status: 'fetching',
    data: [],
  });
  const [surveyMapping, setSurveyMapping] = React.useState({
    status: 'fetching',
    data: [],
  });
  const [waterTypeOptions, setWaterTypeOptions] = React.useState({
    status: 'fetching',
    data: {},
  });
  const [nars, setNars] = React.useState({
    status: 'fetching',
    data: {},
  });
  const [notifications, setNotifications] = React.useState({
    status: 'fetching',
    data: [],
  });

  return (
    <LookupFilesContext.Provider
      value={{
        documentOrder,
        setDocumentOrder,
        reportStatusMapping,
        setReportStatusMapping,
        stateNationalUses,
        setStateNationalUses,
        surveyMapping,
        setSurveyMapping,
        waterTypeOptions,
        setWaterTypeOptions,
        nars,
        setNars,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </LookupFilesContext.Provider>
  );
}

// Custom hook for the documentOrder.json lookup file.
let documentOrderInitialized = false; // global var for ensuring fetch only happens once
function useDocumentOrderContext() {
  const { documentOrder, setDocumentOrder } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!documentOrderInitialized) {
    documentOrderInitialized = true;
    getLookupFile('state/documentOrder.json', setDocumentOrder);
  }

  return documentOrder;
}

// Custom hook for the reportStatusMapping.json lookup file.
let reportStatusMappingInitialized = false; // global var for ensuring fetch only happens once
function useReportStatusMappingContext() {
  const { reportStatusMapping, setReportStatusMapping } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!reportStatusMappingInitialized) {
    reportStatusMappingInitialized = true;
    getLookupFile('state/reportStatusMapping.json', setReportStatusMapping);
  }

  return reportStatusMapping;
}

// Custom hook for the stateNationalUses.json lookup file.
let stateNationalUsesInitialized = false; // global var for ensuring fetch only happens once
function useStateNationalUsesContext() {
  const { stateNationalUses, setStateNationalUses } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!stateNationalUsesInitialized) {
    stateNationalUsesInitialized = true;
    getLookupFile('state/stateNationalUses.json', setStateNationalUses);
  }

  return stateNationalUses;
}

// Custom hook for the surveyMapping.json lookup file.
let surveyMappingInitialized = false; // global var for ensuring fetch only happens once
function useSurveyMappingContext() {
  const { surveyMapping, setSurveyMapping } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!surveyMappingInitialized) {
    surveyMappingInitialized = true;
    getLookupFile('state/surveyMapping.json', setSurveyMapping);
  }

  return surveyMapping;
}

// Custom hook for the waterTypeOptions.json lookup file.
let waterTypeOptionsInitialized = false; // global var for ensuring fetch only happens once
function useWaterTypeOptionsContext() {
  const { waterTypeOptions, setWaterTypeOptions } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!waterTypeOptionsInitialized) {
    waterTypeOptionsInitialized = true;
    getLookupFile('state/waterTypeOptions.json', setWaterTypeOptions);
  }

  return waterTypeOptions;
}

// Custom hook for the waterTypeOptions.json lookup file.
let narsInitialized = false; // global var for ensuring fetch only happens once
function useNarsContext() {
  const { nars, setNars } = React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!narsInitialized) {
    narsInitialized = true;
    getLookupFile('national/NARS.json', setNars);
  }

  return nars;
}

// Custom hook for the messages.json file.
let notificationsInitialized = false; // global var for ensuring fetch only happens once
function useNotificationsContext() {
  const { notifications, setNotifications } = React.useContext(
    LookupFilesContext,
  );

  // fetch the lookup file if necessary
  if (!notificationsInitialized) {
    notificationsInitialized = true;
    getLookupFile('notifications/messages.json', setNotifications);
  }

  return notifications;
}

export {
  LookupFilesProvider,
  useDocumentOrderContext,
  useReportStatusMappingContext,
  useStateNationalUsesContext,
  useSurveyMappingContext,
  useWaterTypeOptionsContext,
  useNarsContext,
  useNotificationsContext,
};
