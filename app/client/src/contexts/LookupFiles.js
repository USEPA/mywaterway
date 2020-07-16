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
  documentOrder: LookupFile,
  setDocumentOrder: Function,
  introText: LookupFile,
  setIntroText: Function,
  reportStatusMapping: LookupFile,
  setReportStatusMapping: Function,
  stateNationalUses: LookupFile,
  setStateNationalUses: Function,
  surveyMapping: LookupFile,
  setSurveyMapping: Function,
  waterTypeOptions: LookupFile,
  setWaterTypeOptions: Function,
};

const LookupFilesContext: Object = React.createContext<LookupFiles>({
  documentOrder: { status: 'none', data: null },
  setDocumentOrder: () => {},
  introText: { status: 'none', data: null },
  setIntroText: () => {},
  reportStatusMapping: { status: 'none', data: null },
  setReportStatusMapping: () => {},
  stateNationalUses: { status: 'none', data: null },
  setStateNationalUses: () => {},
  surveyMapping: { status: 'none', data: null },
  setSurveyMapping: () => {},
  waterTypeOptions: { status: 'none', data: null },
  setWaterTypeOptions: () => {},
});

type Props = {
  children: Node,
};

function LookupFilesProvider({ children }: Props) {
  const [documentOrder, setDocumentOrder] = React.useState({
    status: 'none',
    data: {},
  });
  const [introText, setIntroText] = React.useState({
    status: 'none',
    data: {},
  });
  const [reportStatusMapping, setReportStatusMapping] = React.useState({
    status: 'none',
    data: {},
  });
  const [stateNationalUses, setStateNationalUses] = React.useState({
    status: 'none',
    data: [],
  });
  const [surveyMapping, setSurveyMapping] = React.useState({
    status: 'none',
    data: [],
  });
  const [waterTypeOptions, setWaterTypeOptions] = React.useState({
    status: 'none',
    data: {},
  });

  return (
    <LookupFilesContext.Provider
      value={{
        documentOrder,
        setDocumentOrder,
        introText,
        setIntroText,
        reportStatusMapping,
        setReportStatusMapping,
        stateNationalUses,
        setStateNationalUses,
        surveyMapping,
        setSurveyMapping,
        waterTypeOptions,
        setWaterTypeOptions,
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

// Custom hook for the introText.json lookup file.
let introTextInitialized = false; // global var for ensuring fetch only happens once
function useIntroTextContext() {
  const { introText, setIntroText } = React.useContext(LookupFilesContext);

  // fetch the lookup file if necessary
  if (!introTextInitialized) {
    introTextInitialized = true;
    getLookupFile('state/introText.json', setIntroText);
  }

  return introText;
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

export {
  LookupFilesProvider,
  useDocumentOrderContext,
  useIntroTextContext,
  useReportStatusMappingContext,
  useStateNationalUsesContext,
  useSurveyMappingContext,
  useWaterTypeOptionsContext,
};
