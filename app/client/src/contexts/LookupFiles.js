// @flow

import React from 'react';
import type { Node } from 'react';
// utilities
import { lookupFetch } from 'utils/fetchUtils';

// Common function for setting the context/state of lookup files.
function getLookupFile(filename: string, setVariable: Function) {
  setVariable({ status: 'fetching', data: null });

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
  status: 'none' | 'fetching' | 'success' | 'failure',
  data: Object,
};

type LookupFiles = {
  surveyMapping: LookupFile,
  setSurveyMapping: Function,
  waterTypeOptions: LookupFile,
  setWaterTypeOptions: Function,
  notifications: LookupFile,
  setNotifications: Function,
};

const LookupFilesContext: Object = React.createContext<LookupFiles>({
  surveyMapping: { status: 'none', data: null },
  setSurveyMapping: () => {},
  waterTypeOptions: { status: 'none', data: null },
  setWaterTypeOptions: () => {},
  notifications: { status: 'fetching', data: null },
  setNotifications: () => {},
});

type Props = {
  children: Node,
};

function LookupFilesProvider({ children }: Props) {
  const [surveyMapping, setSurveyMapping] = React.useState({
    status: 'none',
    data: [],
  });
  const [waterTypeOptions, setWaterTypeOptions] = React.useState({
    status: 'none',
    data: [],
  });
  const [notifications, setNotifications] = React.useState({
    status: 'fetching',
    data: [],
  });

  return (
    <LookupFilesContext.Provider
      value={{
        surveyMapping,
        setSurveyMapping,
        waterTypeOptions,
        setWaterTypeOptions,
        notifications,
        setNotifications,
      }}
    >
      {children}
    </LookupFilesContext.Provider>
  );
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
  useSurveyMappingContext,
  useWaterTypeOptionsContext,
  useNotificationsContext,
};
