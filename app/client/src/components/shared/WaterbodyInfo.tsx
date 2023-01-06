import Extent from '@arcgis/core/geometry/Extent';
import ExtentAndRotationGeoreference from '@arcgis/core/layers/support/ExtentAndRotationGeoreference';
import ImageElement from '@arcgis/core/layers/support/ImageElement';
import { css, FlattenSimpleInterpolation } from 'styled-components/macro';
import { useCallback, useEffect, useState } from 'react';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
// components
import { HelpTooltip } from 'components/shared/HelpTooltip';
import { ListContent } from 'components/shared/BoxContent';
import { Histogram, StackedColumnChart } from 'components/shared/ColumnChart';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import {
  errorBoxStyles,
  infoBoxStyles,
  textBoxStyles,
} from 'components/shared/MessageBoxes';
import ShowLessMore from 'components/shared/ShowLessMore';
import { Sparkline } from 'components/shared/Sparkline';
import TickSlider from 'components/shared/TickSlider';
// utilities
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
import { useAbortSignal } from 'utils/hooks';
import {
  getWaterbodyCondition,
  isClassBreaksRenderer,
  isFeatureLayer,
  isMediaLayer,
  isUniqueValueRenderer,
} from 'utils/mapFunctions';
import { fetchCheck } from 'utils/fetchUtils';
import {
  convertAgencyCode,
  convertDomainCode,
  formatNumber,
  getSelectedCommunityTab,
  parseAttributes,
  isAbort,
  titleCaseWithExceptions,
} from 'utils/utils';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
import cyanMetadata from 'config/cyanMetadata';
// errors
import { cyanError, waterbodyReportError } from 'config/errorMessages';
// styles
import {
  colors,
  disclaimerStyles,
  fonts,
  iconStyles,
  modifiedTableStyles,
  tableStyles,
} from 'styles/index.js';
// types
import type { ColumnSeries } from 'components/shared/ColumnChart';
import type { ReactNode } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  ChangeLocationAttributes,
  ClickedHucState,
  FetchState,
  ServicesState,
  StreamgageMeasurement,
  UsgsStreamgageAttributes,
} from 'types';

/*
## Helpers
*/
function bool(value: string) {
  // Return 'Yes' for truthy values and non-zero strings
  return value && parseInt(value, 10) ? 'Yes' : 'No';
}

function isChangeLocationPopup(
  feature: __esri.Graphic | ChangeLocationPopup,
): feature is ChangeLocationPopup {
  return 'changelocationpopup' in (feature as ChangeLocationPopup).attributes;
}

function renderLink(label: string, link: string) {
  if (!link) return;

  // link will not work correctly if it's just 'tk.org
  // display as plain text if nonprofit did not submit a proper url
  if (link && !link.includes('http://') && !link.includes('https://')) {
    link = '//' + link;
  }

  return (
    <p>
      <strong>{label}:</strong>{' '}
      <a rel="noopener noreferrer" target="_blank" href={link}>
        {link}
      </a>
    </p>
  );
}

function labelValue(
  label: ReactNode | string,
  value: string,
  icon: ReactNode | null = null,
) {
  return (
    <p>
      <strong>{label}: </strong>
      {icon ? (
        <span css={popupIconStyles}>
          {icon} {value}
        </span>
      ) : (
        value
      )}
    </p>
  );
}

/*
## Styles
*/
const linkSectionStyles = css`
  p {
    padding-bottom: 1.5em;
  }

  small {
    display: inline-block;
  }
`;

const popupContainerStyles = css`
  margin: 0;
  overflow-y: auto;

  .esri-feature & p {
    padding-bottom: 0;
  }
`;

const popupContentStyles = css`
  margin: 0.625em;
  width: calc(100% - 1.25em);
`;

const popupTitleStyles = css`
  margin-bottom: 0;
  padding: 0.45em 0.625em !important;
  font-size: 0.8125em;
  font-weight: bold;
  background-color: #f0f6f9;
`;

const measurementTableStyles = css`
  ${modifiedTableStyles};

  th:last-of-type,
  td:last-of-type {
    text-align: right;
  }
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};

  padding-bottom: 0;
`;

const checkboxCellStyles = css`
  padding-right: 0 !important;
  text-align: center;
`;

const checkboxStyles = css`
  appearance: checkbox;
  transform: scale(1.2);
`;

const moreLessRowStyles = css`
  padding-left: 0 !important;
  text-align: left !important;

  button,
  button:hover,
  button:focus {
    margin-bottom: 0;
    padding: 0.5em;
    color: currentColor;
    background-color: transparent;
  }
`;

const additionalTextStyles = css`
  font-style: italic;
  color: ${colors.gray6};
  white-space: nowrap;
`;

const measurementStyles = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const chartStyles = css`
  padding-right: 8px;
  width: 128px;
  text-align: center;
  line-height: 1;

  small {
    color: ${colors.gray9};
  }
`;

const unitStyles = css`
  overflow-wrap: break-word;
`;

const popupIconStyles = css`
  display: inline-block;
`;

const paragraphStyles = css`
  padding-bottom: 0.5em;
`;

const buttonsContainer = css`
  text-align: center;

  button {
    margin: 0 0.75em;
    font-size: 0.9375em;
  }
`;

const buttonStyles = css`
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }
`;

const imageContainerStyles = css`
  padding: 1rem;
`;

const imageStyles = css`
  width: 100%;
  height: auto;
`;

const dateStyles = css`
  white-space: nowrap;
`;

const projectsContainerStyles = css`
  margin-right: 0.625em;
  margin-bottom: 0.5rem;
`;

const changeWatershedContainerStyles = css`
  ${popupContentStyles};
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;

  p {
    padding-bottom: 0;
  }
`;

const listContentStyles = css`
  .row-cell {
    &:nth-of-type(even) {
      padding-right: 0;
    }
    &:nth-of-type(odd) {
      padding-left: 0;
    }
  }
`;

const tableFooterStyles = css`
  span {
    display: inline-block;
    margin-bottom: 0.25em;
  }

  td {
    border-top: none;
    font-weight: bold;
    width: 50%;
  }
`;

/*
## Types
*/
interface ActionData {
  actionIdentifier: string;
  actionName: string;
  agencyCode: string;
  actionTypeCode: string;
  actionStatusCode: string;
  completionDate: string;
  organizationId: string;
  documents: ActionDocument[];
  TMDLReportDetails: {
    TMDLOtherIdentifier: string | null;
    TMDLDate: string;
    indianCountryIndicator: string;
  };
  associatedPollutants: Array<{ pollutantName: string; auCount: string }>;
  parameters: Array<{ parameterName: string; auCount: string }>;
  associatedActions: string[];
}

interface ActionDocument {
  agencyCode: string;
  documentTypes: Array<{ documentTypeCode: string }>;
  documentFileType: string;
  documentFileName: string;
  documentName: string;
  documentDescription: string | null;
  documentComments: string | null;
  documentURL: string | null;
}

interface AttainsProjectsDatum {
  id: string;
  orgId: string;
  name: string;
  pollutants: string[];
  type: string;
  date: string;
}

type AttainsProjectsState =
  | { status: 'fetching'; data: [] }
  | { status: 'failure'; data: [] }
  | { status: 'success'; data: AttainsProjectsDatum[] };

type ChangeLocationPopup = {
  attributes: ChangeLocationAttributes;
};

type WaterbodyInfoProps = {
  extraContent?: ReactNode | null;
  feature: __esri.Graphic;
  fieldName?: string | null;
  fields?: __esri.Field[] | null;
  mapView?: __esri.MapView;
  services?: ServicesState;
  type: string;
};

/*
## Components
*/
function WaterbodyInfo({
  type,
  feature,
  fieldName = null,
  extraContent,
  mapView,
  services,
  fields,
}: WaterbodyInfoProps) {
  const { attributes } = feature;
  const onWaterbodyReportPage =
    window.location.pathname.indexOf('waterbody-report') !== -1;
  const waterbodyPollutionCategories = (label: string) => {
    const pollutionCategories = impairmentFields
      .filter((field) => attributes[field.value] === 'Cause')
      .sort((a, b) =>
        a.label.toUpperCase().localeCompare(b.label.toUpperCase()),
      )
      .map((field) => (
        <li key={field.value}>
          <GlossaryTerm term={field.term}>{field.label}</GlossaryTerm>
        </li>
      ));

    if (pollutionCategories.length === 0) return null;

    return (
      <>
        <p css={paragraphStyles}>
          <strong>{label}: </strong>
        </p>
        <ul>{pollutionCategories}</ul>
      </>
    );
  };

  const waterbodyReportLink =
    onWaterbodyReportPage ? null : attributes.organizationid ? (
      <p css={paragraphStyles}>
        <a
          rel="noopener noreferrer"
          target="_blank"
          href={
            `/waterbody-report/` +
            `${attributes.organizationid}/` +
            `${attributes.assessmentunitidentifier}/` +
            `${attributes.reportingcycle || ''}`
          }
        >
          <i css={iconStyles} className="fas fa-file-alt" aria-hidden="true" />
          View Waterbody Report
        </a>
        &nbsp;&nbsp;
        <small css={disclaimerStyles}>(opens new browser tab)</small>
      </p>
    ) : (
      <p css={paragraphStyles}>
        Unable to find a waterbody report for this waterbody.
      </p>
    );

  const baseWaterbodyContent = () => {
    let useLabel = 'Waterbody';

    // Get the waterbody condition field (drinkingwater_use, recreation_use, etc.)
    let field = fieldName;
    if (!fieldName && feature?.layer && isFeatureLayer(feature.layer)) {
      // For map clicks we need to get the field from the feature layer renderer.
      // This allows us to differentiate between fishconsumption_use and ecological_use
      // which are both on the fishing tab.
      const renderer: __esri.Renderer = feature.layer.renderer;
      if (isClassBreaksRenderer(renderer) || isUniqueValueRenderer(renderer))
        field = renderer?.field ?? null;
    }

    // Get the label
    if (field === 'drinkingwater_use') useLabel = 'Drinking Water Use';
    if (field === 'recreation_use') useLabel = 'Swimming and Boating';
    if (field === 'fishconsumption_use') {
      useLabel = 'Fish and Shellfish Consumption';
    }
    if (field === 'ecological_use') useLabel = 'Aquatic Life';

    // Be sure to use null for the field on non use specific panels (i.e. overview, state page, etc.)
    if (useLabel === 'Waterbody') field = null;

    const useBasedCondition = getWaterbodyCondition(attributes, field);

    // create applicable fields to check against when displaying the table
    const waterbodyConditions = useFields.map((useField) => {
      return getWaterbodyCondition(attributes, useField.value).label;
    });

    const applicableFields =
      waterbodyConditions.filter((value) => {
        return value !== 'Not Applicable';
      }) || [];

    const reportingCycle = attributes && attributes.reportingcycle;
    return (
      <>
        {extraContent}
        {reportingCycle && (
          <p css={paragraphStyles}>
            <strong>Year Last Reported: </strong>
            {reportingCycle}
          </p>
        )}

        {labelValue(
          `${useLabel} Condition`,
          useBasedCondition.label,
          <WaterbodyIcon
            condition={useBasedCondition.condition}
            selected={false}
          />,
        )}

        {attributes?.organizationid && attributes?.organizationname && (
          <p css={paragraphStyles}>
            <strong>Organization Name (ID): </strong>
            {attributes.organizationname} ({attributes.organizationid})
          </p>
        )}

        {useLabel === 'Waterbody' && (
          <>
            {applicableFields.length === 0 && (
              <p>No evaluated use provided for this waterbody.</p>
            )}

            {applicableFields.length > 0 && (
              <table css={modifiedTableStyles} className="table">
                <thead>
                  <tr>
                    <th>What is this water used for?</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {useFields.map((useField) => {
                    const value = getWaterbodyCondition(
                      attributes,
                      useField.value,
                    ).label;

                    if (value === 'Not Applicable') return null;
                    return (
                      <tr key={useField.value}>
                        <td>
                          <GlossaryTerm term={useField.term}>
                            {useField.label}
                          </GlossaryTerm>
                        </td>
                        <td>{value}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}

        {useBasedCondition.condition === 'polluted'
          ? waterbodyPollutionCategories('Identified Issues')
          : ''}

        {waterbodyReportLink}
      </>
    );
  };

  // jsx
  const waterbodyStateContent = (
    <>
      {labelValue(
        <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
          303(d) Listed
        </GlossaryTerm>,
        attributes.on303dlist === 'Y' ? 'Yes' : 'No',
      )}
      {labelValue('TMDL', attributes.hastmdl === 'Y' ? 'Yes' : 'No')}

      {baseWaterbodyContent()}
    </>
  );

  // jsx
  const hasEffluentViolations =
    attributes.CWPSNCStatus &&
    attributes.CWPSNCStatus.toLowerCase().indexOf('effluent') !== -1;

  const dischargerContent = (
    <>
      <ListContent
        rows={[
          {
            label: 'Compliance Status',
            value: attributes.CWPStatus,
          },
          {
            label: 'Permit Status',
            value: attributes.CWPPermitStatusDesc,
          },
          {
            label: 'Significant Effluent Violation within the last 3 years',
            value: hasEffluentViolations ? 'Yes' : 'No',
          },
          {
            label: 'Inspection within the last 5 years',
            value: bool(attributes.CWPInspectionCount),
          },
          {
            label: 'Formal Enforcement Action in the last 5 years',
            value: bool(attributes.CWPFormalEaCnt),
          },
          {
            label: 'NPDES ID',
            value: attributes.SourceID,
          },
        ]}
        styles={listContentStyles}
      />

      <p>
        <a
          href={`https://echo.epa.gov/detailed-facility-report?fid=${attributes.RegistryID}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <i css={iconStyles} className="fas fa-file-alt" aria-hidden="true" />
          <span>Facility Report</span>
        </a>
        &nbsp;&nbsp;
        <small css={disclaimerStyles}>(opens new browser tab)</small>
      </p>
    </>
  );

  // Default popup for monitoring popups, when opened a listener will populate the popup with everything the Listview item has
  const nonprofitContent = (
    <>
      {labelValue('Address', attributes.Address || 'No address found.')}
      {labelValue(
        'Zip Code',
        attributes.Zip_Postal_Code || 'No zip code found.',
      )}
      {renderLink('Website', attributes.Website)}
      {renderLink('Facebook', attributes.Facebook)}
      {renderLink('Twitter', attributes.Twitter_org)}
    </>
  );

  // jsx
  const congressionalDistrictContent = () => {
    return (
      <>
        <p>
          <strong>District:</strong>
          <br />
          {attributes.CDFIPS} - {attributes.NAME}
        </p>
      </>
    );
  };

  // jsx
  const countyContent = () => {
    return (
      <>
        <p>
          <strong>County:</strong>
          <br />
          {attributes.CNTY_FIPS} - {attributes.NAME}
        </p>
      </>
    );
  };

  // jsx
  const tribeContent = labelValue('Tribe Name', attributes.TRIBE_NAME);

  // jsx
  const upstreamWatershedContent = (
    <>
      {labelValue(
        'Area',
        attributes.areasqkm && `${formatNumber(attributes.areasqkm)} sq. km.`,
      )}
    </>
  );

  // jsx
  const wildScenicRiversContent = (
    <>
      {attributes.PhotoLink && attributes.PhotoCredit && (
        <div css={imageContainerStyles}>
          <img
            css={imageStyles}
            src={attributes.PhotoLink}
            alt="Wild and Scenic River"
          />
          <br />
          <em>Photo Credit: {attributes.PhotoCredit}</em>
        </div>
      )}
      <p>
        <strong>Agency: </strong>
        {convertAgencyCode(attributes.AGENCY)}
      </p>
      <p>
        <strong>Category: </strong>
        {attributes.RiverCategory}
        <br />
      </p>
      <p>
        <a rel="noopener noreferrer" target="_blank" href={attributes.WEBLINK}>
          <i
            css={iconStyles}
            className="fas fa-info-circle"
            aria-hidden="true"
          />
          More Information
        </a>
        &nbsp;&nbsp;
        <small css={disclaimerStyles}>(opens new browser tab)</small>
      </p>
    </>
  );

  // jsx
  const wsioContent = (
    <>
      <div css={tableStyles} className="table">
        <ListContent
          rows={[
            {
              label: 'Watershed Name',
              value: attributes.NAME_HUC12,
            },
            {
              label: 'Watershed',
              value: attributes.HUC12_TEXT,
            },
            {
              label: 'State',
              value: attributes.STATES_ALL,
            },
            {
              label: 'Watershed Health Score',
              value: Math.round(attributes.PHWA_HEALTH_NDX_ST * 100) / 100,
            },
          ]}
          styles={listContentStyles}
        />
      </div>
    </>
  );

  // jsx
  const alaskaNativeVillageContent = labelValue(
    'Village Name',
    attributes.TRIBE_NAME,
  );

  // jsx
  const protectedAreaContent = (
    <>
      {labelValue(
        'Manager Type',
        convertDomainCode(fields, 'Mang_Type', attributes.Mang_Type),
      )}

      {labelValue(
        'Manager Name',
        convertDomainCode(fields, 'Mang_Name', attributes.Mang_Name),
      )}

      {labelValue(
        'Protection Category',
        convertDomainCode(fields, 'Category', attributes.Category),
      )}

      {labelValue(
        'Public Access',
        convertDomainCode(fields, 'Pub_Access', attributes.Pub_Access),
      )}
    </>
  );

  // jsx
  const ejscreenContent = (
    <>
      {labelValue('Demographic Index Percentage', attributes.T_VULEOPCT)}

      {labelValue('Percent Minority', attributes.T_MINORPCT)}

      {labelValue('Percent Low Income', attributes.T_LWINCPCT)}

      {labelValue(
        'Percent Less Than High School Education',
        attributes.T_LESHSPCT,
      )}

      {labelValue('Percent Linguistically Isolated', attributes.T_LNGISPCT)}

      {labelValue('Percent Individuals Under 5', attributes.T_UNDR5PCT)}

      {labelValue('Percent Individuals Over 64', attributes.T_OVR64PCT)}
    </>
  );

  // jsx
  // This content is filled in from the getPopupContent function in MapFunctions.
  const actionContent = <>{extraContent}</>;

  // Fetch attains projects data
  const [attainsProjects, setAttainsProjects] = useState<AttainsProjectsState>({
    status: 'fetching',
    data: [],
  });
  useEffect(() => {
    if (type !== 'Restoration Plans' && type !== 'Protection Plans') return;
    if (services?.status !== 'success') return;

    const auId = attributes.assessmentunitidentifier;
    const url =
      services.data.attains.serviceUrl +
      `actions?assessmentUnitIdentifier=${auId}` +
      `&organizationIdentifier=${attributes.organizationid}` +
      `&summarize=Y`;

    fetchCheck(url)
      .then((res) => {
        let attainsProjectsData: AttainsProjectsDatum[] = [];

        if (res.items.length > 0) {
          attainsProjectsData = res.items[0].actions.map(
            (action: ActionData) => {
              const pollutants = action
                ? action.parameters.map((p) =>
                    titleCaseWithExceptions(p.parameterName),
                  )
                : [];

              return {
                id: action.actionIdentifier,
                orgId: attributes.organizationid,
                name: action.actionName,
                pollutants,
                type: action.actionTypeCode,
                date: action.completionDate,
              };
            },
          );
        }

        setAttainsProjects({
          status: 'success',
          data: attainsProjectsData,
        });
      })
      .catch((err) => {
        console.error(err);
        setAttainsProjects({
          status: 'failure',
          data: [],
        });
      });
  }, [
    attributes.assessmentunitidentifier,
    attributes.organizationid,
    type,
    services,
  ]);

  // jsx
  const projectContent = () => {
    const communityTab = getSelectedCommunityTab();

    const projects = attainsProjects.data.filter((project) => {
      return (
        (communityTab === 'restore' &&
          project.type !== 'Protection Approach') ||
        (communityTab === 'protect' && project.type === 'Protection Approach')
      );
    });

    return (
      <>
        <div css={projectsContainerStyles}>
          {attainsProjects.status === 'fetching' && <LoadingSpinner />}
          {attainsProjects.status === 'failure' && (
            <div css={errorBoxStyles}>
              <p>{waterbodyReportError('Plans')}</p>
            </div>
          )}
          {attainsProjects.status === 'success' && (
            <>
              {projects.length === 0 ? (
                <p>No plans specified for this waterbody.</p>
              ) : (
                <>
                  <em>Links below open in a new browser tab.</em>
                  <table css={modifiedTableStyles} className="table">
                    <thead>
                      <tr>
                        <th>Plan (ID)</th>
                        <th>Impairments</th>
                        <th style={{ width: '25%' }}>Type</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((action) => {
                          return (
                            <tr key={action.id}>
                              <td>
                                <a
                                  href={`/plan-summary/${action.orgId}/${action.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {titleCaseWithExceptions(action.name)} (
                                  {action.id})
                                </a>
                              </td>
                              <td>
                                {action.pollutants.length === 0 && (
                                  <>No impairments found.</>
                                )}
                                {action.pollutants.length > 0 && (
                                  <>
                                    {action.pollutants
                                      .sort((a, b) => a.localeCompare(b))
                                      .join(', ')}
                                  </>
                                )}
                              </td>
                              <td>{action.type}</td>
                              <td css={dateStyles}>{action.date}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </>
              )}
            </>
          )}
        </div>

        {waterbodyReportLink}
      </>
    );
  };

  if (!attributes) return null;

  let content = null;
  if (type === 'Waterbody') content = baseWaterbodyContent();
  if (type === 'Restoration Plans') content = projectContent();
  if (type === 'Protection Plans') content = projectContent();
  if (type === 'Permitted Discharger') content = dischargerContent;
  if (type === 'USGS Sensors') {
    content = (
      <UsgsStreamgagesContent feature={feature} services={services ?? null} />
    );
  }
  if (type === 'Past Water Conditions') {
    content = (
      <MonitoringLocationsContent
        feature={feature}
        services={services ?? null}
      />
    );
  }
  if (type === 'Nonprofit') content = nonprofitContent;
  if (type === 'Waterbody State Overview') content = waterbodyStateContent;
  if (type === 'Action') content = actionContent;
  if (type === 'County') content = countyContent();
  if (type === 'Tribe') content = tribeContent;
  if (type === 'Upstream Watershed') content = upstreamWatershedContent;
  if (type === 'Wild and Scenic Rivers') content = wildScenicRiversContent;
  if (type === 'State Watershed Health Index') content = wsioContent;
  if (type === 'Alaska Native Village') content = alaskaNativeVillageContent;
  if (type === 'Protected Areas') content = protectedAreaContent;
  if (type === 'Demographic Indicators') content = ejscreenContent;
  if (type === 'Congressional District') {
    content = congressionalDistrictContent();
  }
  if (type === 'CyAN') {
    content = (
      <CyanContent
        feature={feature}
        mapView={mapView}
        services={services ?? null}
      />
    );
  }

  return content;
}

type MapPopupProps = {
  type: string;
  feature: __esri.Graphic | ChangeLocationPopup;
  navigate: NavigateFunction;
  fieldName?: string | null;
  extraContent?: ReactNode | null;
  getClickedHuc?: Promise<ClickedHucState> | null;
  mapView?: __esri.MapView;
  resetData?: () => void;
  services?: ServicesState;
  fields?: __esri.Field[] | null;
};

function MapPopup({
  type,
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  mapView,
  resetData,
  services,
  fields,
  navigate,
}: MapPopupProps) {
  // Gets the response of what huc was clicked, if provided.
  const [clickedHuc, setClickedHuc] = useState<ClickedHucState>({
    status: 'none',
    data: null,
  });

  useEffect(() => {
    if (!getClickedHuc || clickedHuc.status !== 'none') return;

    setClickedHuc({ status: 'fetching', data: null });

    getClickedHuc
      .then((res) => setClickedHuc(res))
      .catch((err) => {
        console.error(err);
        setClickedHuc({ status: 'failure', data: null });
      });
  }, [getClickedHuc, clickedHuc]);

  const { attributes } = feature;

  const getTypeTitle = (feature: __esri.Graphic) => {
    const typesToSkip = [
      'Action',
      'Change Location',
      'Waterbody State Overview',
    ];
    if (!type || typesToSkip.includes(type)) return null;

    let title: string | ReactNode = type;
    if (type === 'Demographic Indicators') {
      title = `${type} - ${feature.layer.title}`;
    }
    if (type === 'Restoration Plans') {
      title = 'Restoration Plans for this Waterbody';
    }
    if (type === 'Protection Plans') {
      title = 'Protection Plans for this Waterbody';
    }
    if (type === 'Upstream Watershed') {
      title = <GlossaryTerm term="Upstream Watershed">{title}</GlossaryTerm>;
    }

    return <p css={popupTitleStyles}>{title}</p>;
  };

  if (!attributes) return null;

  const huc12 = clickedHuc?.data?.huc12;
  const watershed = clickedHuc?.data?.watershed;

  return (
    <div css={popupContainerStyles}>
      {clickedHuc && (
        <>
          {clickedHuc.status === 'no-data' && null}
          {clickedHuc.status === 'fetching' && <LoadingSpinner />}
          {clickedHuc.status === 'failure' && <p>Web service error</p>}
          {clickedHuc.status === 'success' && (
            <>
              {type !== 'Change Location' && (
                <p css={popupTitleStyles}>Change to this location?</p>
              )}

              <div css={changeWatershedContainerStyles}>
                <div>{labelValue('WATERSHED', `${watershed} (${huc12})`)}</div>

                <div css={buttonsContainer}>
                  <button
                    css={buttonStyles}
                    title="Change to this location"
                    className="btn"
                    onClick={(_ev) => {
                      // Clear all data before navigating.
                      // The main reason for this is better performance
                      // when doing a huc search by clicking on the state map. The app
                      // will attempt to use all of the loaded state data, then clear it
                      // then load the huc. This could take a long time if the state
                      // has a lot of waterbodies.
                      if (resetData) resetData();

                      let baseRoute = `/community/${huc12}`;

                      // community will attempt to stay on the same tab
                      // if available, stay on the same tab otherwise go to overview
                      let urlParts = window.location.pathname.split('/');
                      if (
                        urlParts.includes('community') &&
                        urlParts.length > 3
                      ) {
                        navigate(`${baseRoute}/${urlParts[3]}`);
                        return;
                      }

                      navigate(`${baseRoute}/overview`);
                    }}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {!isChangeLocationPopup(feature) && getTypeTitle(feature)}

      {!isChangeLocationPopup(feature) && (
        <div css={popupContentStyles}>
          <WaterbodyInfo
            type={type}
            feature={feature}
            fieldName={fieldName}
            extraContent={extraContent}
            mapView={mapView}
            services={services}
            fields={fields}
          />
        </div>
      )}
    </div>
  );
}

const cyanListContentStyles = css`
  ${listContentStyles}
  border-top: none;
  margin-bottom: 0;

  .row-cell {
    background-color: initial !important;
  }

  svg.pixel-area-spinner {
    margin-bottom: auto;
    margin-top: auto;
  }
`;

const marginBoxStyles = (styles: FlattenSimpleInterpolation) => css`
  ${styles}
  margin: 1em;
`;

const showLessMoreStyles = css`
  margin-top: 1em;
  button {
    margin-bottom: 1.5em;
  }

  h3 {
    font-family: ${fonts.primary};
    font-size: 1em;
    font-weight: bold;

    &:first-of-type {
      display: inline-block;
    }
  }

  li,
  ul {
    padding-bottom: 0.5em;
  }

  p {
    padding-bottom: 0.5em;
  }
`;

const sliderContainerStyles = css`
  margin: auto;
  width: 90%;
`;

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0.5em;
  padding-top: 1em;
`;

const subheadingBoxStyles = css`
  ${subheadingStyles}
  padding-top: 0;
`;

const oneDay = 1000 * 60 * 60 * 24;

const pixelAreaKm = (300 * 300) / 10 ** 6;
const pixelAreaMi = squareKmToSquareMi(pixelAreaKm);

function barChartDataPoint(
  pixels: number,
  totalPixels: number,
  totalArea: number,
) {
  const roundedTotalArea = toFixedFloat(totalArea);
  const fraction = pixels / totalPixels;
  const roundedFraction = toFixedFloat(fraction, 3);
  const percentage = roundedFraction * 100;
  return {
    custom: {
      text: `${toFixedFloat(
        // Calculate from rounded fraction so user calculations match
        roundedFraction * roundedTotalArea,
        1,
      )} mi${String.fromCodePoint(0x00b2)}`,
    },
    // Round again to account for floating point precision errors
    y: toFixedFloat(percentage, 1),
  };
}

// Converts CyAN `year dayOfYear` format to epoch timestamp
function cyanDateToEpoch(yearDay: string) {
  const yearAndDay = yearDay.split(' ');
  if (yearAndDay.length !== 2) return null;
  const year = parseInt(yearAndDay[0]);
  const day = parseInt(yearAndDay[1]);
  if (Number.isFinite(year) && Number.isFinite(day)) {
    return new Date(year, 0, day).getTime();
  }
  return null;
}

function epochToMonthDay(epoch: number) {
  const date = new Date(epoch);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDayOfYear(day: Date) {
  const firstOfYear = new Date(day.getFullYear(), 0, 0);
  const diff =
    day.getTime() -
    firstOfYear.getTime() +
    (firstOfYear.getTimezoneOffset() - day.getTimezoneOffset()) * 60 * 1000;
  return Math.floor(diff / oneDay);
}

function getAverageNonLandPixelArea(data: CellConcentrationData) {
  const filteredData = Object.values(data).filter(
    (dailyData) => dailyData !== null,
  ) as Array<NonNullable<CellConcentrationData[string]>>;
  return (
    filteredData.reduce(
      (a, b) => a + getTotalNonLandPixels(b) * pixelAreaMi,
      0,
    ) / filteredData.length
  );
}

function getMinCellConcentration(counts: number[]) {
  if (!counts.length) return null;
  const minIdx = counts.findIndex((count) => count > 0);
  return minIdx > -1 ? cyanMetadata[minIdx] : null;
}

function getMaxCellConcentration(counts: number[]) {
  if (!counts.length) return null;
  for (let i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) return cyanMetadata[i];
  }
  return null;
}

function getTotalNonLandPixels(
  data: NonNullable<CellConcentrationData[string]>,
) {
  const { belowDetection, measurements, noData } = data;
  return sum(belowDetection, noData, ...measurements);
}

function squareKmToSquareMi(km: number) {
  return km * 0.386102;
}

// Calculates the sum of an arbitrary number of arguments
function sum(...nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

// Calculates the sum of a subarray
function sumSlice(nums: number[], start: number, end?: number) {
  return sum(...nums.slice(start, end));
}

// Rounds a float to a specified precision
function toFixedFloat(num: number, precision: number = 0) {
  if (precision < 0) return num;
  const offset = 10 ** precision;
  return Math.round((num + Number.EPSILON) * offset) / offset;
}

enum CcIdx {
  Low = 0,
  Medium = cyanMetadata.findIndex((cc) => cc >= 100_000),
  High = cyanMetadata.findIndex((cc) => cc >= 300_000),
  VeryHigh = cyanMetadata.findIndex((cc) => cc >= 1_000_000),
}

type CellConcentrationData = {
  [date: string]: {
    belowDetection: number;
    land: number;
    measurements: number[];
    noData: number;
  } | null;
};

type ChartData = {
  categories: string[];
  series: ColumnSeries[];
};

type CyanDailyContentProps = {
  data: CellConcentrationData[string];
  epochDate: number;
  waterbodyName: string;
};

function CyanDailyContent({
  data,
  epochDate,
  waterbodyName,
}: CyanDailyContentProps) {
  const [histogramData, setHistogramData] = useState<ChartData | null>(null);

  // Calculate statistics for the selected date and
  // set the data for the daily histogram
  useEffect(() => {
    if (!data) return setHistogramData(null);

    const dataPoints = data.measurements.map((count) => {
      const totalPixels = getTotalNonLandPixels(data);
      const totalPixelArea = totalPixels * pixelAreaMi;
      const fraction = count / totalPixels;
      const roundedFraction = toFixedFloat(fraction, 3);
      const percentage = roundedFraction * 100;

      return {
        custom: {
          text: `${toFixedFloat(
            // Calculate from rounded fraction so user calculations match
            roundedFraction * totalPixelArea,
            1,
          )} mi${String.fromCodePoint(0x00b2)}`,
        },
        // Round again to account for floating point precision errors
        y: toFixedFloat(percentage, 1),
      };
    });

    setHistogramData({
      categories: cyanMetadata.map((c) => c.toLocaleString()),
      series: [
        {
          name: 'Cell Concentration Counts',
          data: dataPoints,
          type: 'column',
          zoneAxis: 'x',
          zones: [
            { color: '#3700eb', value: CcIdx.Medium },
            { color: '#00bf46', value: CcIdx.High },
            { color: '#ffa200', value: CcIdx.VeryHigh },
            { color: '#fa5300' },
          ],
        },
      ],
    });
  }, [data]);

  if (!data) {
    return (
      <p css={marginBoxStyles(infoBoxStyles)}>
        There is no CyAN data available for the selected date.
      </p>
    );
  } else if (!sum(...data.measurements)) {
    return (
      <p css={marginBoxStyles(infoBoxStyles)}>
        There is no measureable CyAN data available for the selected date.
      </p>
    );
  } else {
    const minCc = getMinCellConcentration(data.measurements);
    const maxCc = getMaxCellConcentration(data.measurements);
    return (
      <>
        <p css={subheadingStyles}>
          <HelpTooltip label="Statistics are calculated based on only the detected values in the waterbody area (colored areas in map)." />
          &nbsp;&nbsp; Cyanobacteria Concentration Statistics for{' '}
          {formatDate(epochDate)}
        </p>

        {histogramData && (
          <Histogram
            categories={histogramData.categories}
            exportFilename="CyAN_Histogram"
            series={histogramData.series}
            subtitle={`
              Total Satellite Image Area: ${formatNumber(
                getTotalNonLandPixels(data) * pixelAreaMi,
              )} mi${String.fromCodePoint(0x00b2)}
              <br />
              ${formatDate(epochDate)}
            `}
            title={`Cell Concentration Histogram for ${waterbodyName}`}
            xTitle="Cell Concentration (cells/mL)"
            xUnit="cells/mL"
            yTitle={`
              Percent of Satellite Image Area
            `}
            yUnit="%"
          />
        )}

        <div css={textBoxStyles}>
          <ListContent
            rows={[
              {
                label: (
                  <>
                    <HelpTooltip label="Maximum detected cyanobacteria concentration in the satellite image area shown on map." />
                    &nbsp;&nbsp; Maximum Value
                  </>
                ),
                value:
                  maxCc !== null ? `${formatNumber(maxCc, 2)} cells/mL` : 'N/A',
              },
            ]}
            styles={cyanListContentStyles}
          />
        </div>
      </>
    );
  }
}
type CyanContentProps = {
  feature: __esri.Graphic;
  mapView?: __esri.MapView;
  services: ServicesState | null;
};

function CyanContent({ feature, mapView, services }: CyanContentProps) {
  const { attributes } = feature;
  const abortSignal = useAbortSignal();

  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [cellConcentration, setCellConcentration] = useState<
    FetchState<CellConcentrationData>
  >({
    data: null,
    status: 'idle',
  });

  // Fetch the cell concentration data for the waterbody
  useEffect(() => {
    if (services?.status !== 'success') return;

    const startDate = new Date(today.getTime() - 7 * oneDay);

    const dataUrl = `${services.data.cyan.cellConcentration}/?OBJECTID=${
      attributes.oid ?? attributes.OBJECTID
    }&start_year=${startDate.getFullYear()}&start_day=${getDayOfYear(
      startDate,
    )}&end_year=${today.getFullYear()}&end_day=${getDayOfYear(today)}`;

    setCellConcentration({
      status: 'pending',
      data: null,
    });

    fetchCheck(dataUrl, abortSignal)
      .then((res: { data: { [date: string]: number[] } }) => {
        const newData: CellConcentrationData = {};
        let currentDate = startDate.getTime();
        while (currentDate <= today.getTime() - oneDay) {
          newData[currentDate] = null;
          currentDate += oneDay;
        }
        Object.entries(res.data).forEach(([date, values]) => {
          if (values.length !== 256) return;
          const epochDate = cyanDateToEpoch(date);
          // Indices 0, 254, & 255 represent indetectable pixels
          if (epochDate !== null) {
            const measurements = values.slice(1, 254);
            newData[epochDate] = {
              belowDetection: values[0],
              measurements,
              land: values[254],
              noData: values[255],
            };
          }
        });
        setCellConcentration({
          status: 'success',
          data: newData,
        });
      })
      .catch((err) => {
        console.error(err);
        setCellConcentration({
          status: 'failure',
          data: null,
        });
      });
  }, [abortSignal, attributes, today, services]);

  const [dates, setDates] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  // Parse slider values from the new data
  useEffect(() => {
    if (cellConcentration.status !== 'success') return;

    // Track the latest date with data
    let newSelectedDate: number | null = null;

    // Parse epoch date strings into integers for the tick slider.
    // Additionally, select the latest date with data.
    const newDates = Object.entries(cellConcentration.data).map(
      ([date, data]) => {
        const dateInt = parseInt(date);
        if (data?.measurements.find((d) => d > 0)) newSelectedDate = dateInt;
        return dateInt;
      },
    );

    setDates(newDates);
    setSelectedDate(newSelectedDate);
  }, [cellConcentration]);

  const [imageStatus, setImageStatus] = useState<
    'idle' | 'pending' | 'failure' | 'success'
  >('idle');

  // Fetch the satellite image for the selected date
  // and add it to the CyAN Media Layer
  useEffect(() => {
    if (selectedDate === null) return;
    if (services?.status !== 'success') return;
    if (!mapView) return;

    const cyanImageLayer = mapView.map.findLayerById('cyanImages');
    if (!cyanImageLayer || !isMediaLayer(cyanImageLayer)) return;

    const currentDate = new Date(selectedDate);
    const imageUrl = `${services.data.cyan.images}/?OBJECTID=${
      attributes.oid ?? attributes.OBJECTID
    }&year=${currentDate.getFullYear()}&day=${getDayOfYear(currentDate)}`;
    const propertiesUrl = `${services.data.cyan.properties}/?OBJECTID=${
      attributes.oid ?? attributes.OBJECTID
    }`;

    const abortController = new AbortController();
    const timeout = 60_000;
    const imageTimeout = setTimeout(() => abortController.abort(), timeout);

    cyanImageLayer.source.elements.removeAll();
    setImageStatus('pending');
    const imagePromise = fetch(imageUrl, { signal: abortController.signal });
    const propsPromise = fetchCheck(propertiesUrl, abortController.signal);
    Promise.all([imagePromise, propsPromise])
      .then(([imageRes, propsRes]) => {
        if (imageRes.headers.get('Content-Type') !== 'image/png') {
          setImageStatus('idle');
          return;
        }

        imageRes.blob().then((blob) => {
          const image = new Image();
          image.src = URL.createObjectURL(blob);
          image.onload = () => setImageStatus('success');
          const imageElement = new ImageElement({
            image,
            georeference: new ExtentAndRotationGeoreference({
              extent: new Extent({
                spatialReference: SpatialReference.WGS84,
                xmin: propsRes.properties.x_min,
                xmax: propsRes.properties.x_max,
                ymin: propsRes.properties.y_min,
                ymax: propsRes.properties.y_max,
              }),
            }),
          });
          cyanImageLayer.source.elements.add(imageElement);
        });
      })
      .catch((err) => {
        setImageStatus('failure');
        if (isAbort(err)) {
          console.error(
            `PROMISE_TIMED_OUT: The promise took more than ${timeout}ms.`,
          );
        } else {
          console.error(err);
        }
      });

    return function cleanup() {
      clearTimeout(imageTimeout);
    };
  }, [attributes, mapView, selectedDate, services]);

  // Remove the image when this component unmounts
  useEffect(() => {
    if (!mapView) return;

    const cyanImageLayer = mapView.map.findLayerById('cyanImages');
    if (!cyanImageLayer || !isMediaLayer(cyanImageLayer)) return;

    const popupWatchHandle = mapView.popup.watch(
      'visible',
      (visible: boolean) => {
        if (visible) return;
        mapView.popup.features.forEach((feature) => {
          if (feature.layer?.id === 'cyanWaterbodies') {
            cyanImageLayer.source.elements.removeAll();
          }
        });
      },
    );

    return function cleanup() {
      cyanImageLayer.source.elements.removeAll();
      popupWatchHandle.remove();
    };
  }, [mapView]);

  const [barChartData, setBarChartData] = useState<ChartData | null>(null);

  // Group the daily data by predetermined
  // thresholds for the weekly bar chart
  useEffect(() => {
    if (cellConcentration.status !== 'success') {
      setBarChartData(null);
      return;
    }

    const emptyBarChartData: ChartData = {
      categories: [],
      series: [
        {
          name: 'Very Low',
          color: '#6c95ce',
          custom: {
            // description: `${String.fromCharCode(0x2264)} 6,500 cells/mL`,
            description: '< 6,500 cells/mL',
          },
          data: [],
          type: 'column',
        },
        {
          name: 'Low',
          color: '#3700eb',
          custom: {
            description: `6,500 - 100,000 cells/mL`,
          },
          data: [],
          type: 'column',
        },
        {
          name: 'Medium',
          color: '#00bf46',
          custom: { description: '100,000 - 300,000 cells/mL' },
          data: [],
          type: 'column',
        },
        {
          name: 'High',
          color: '#ffa200',
          custom: { description: '300,000 - 1,000,000 cells/mL' },
          data: [],
          type: 'column',
        },
        {
          name: 'Very High',
          color: '#fa5300',
          custom: {
            // description: `${String.fromCharCode(0x2265)} 1,000,000 cells/mL`,
            description: '> 1,000,000 cells/mL',
          },
          data: [],
          type: 'column',
        },
        {
          name: 'Unknown',
          color: '#858585',
          data: [],
          type: 'column',
        },
      ],
    };

    const totalPixelArea = getAverageNonLandPixelArea(cellConcentration.data);

    const newBarChartData = Object.entries(cellConcentration.data).reduce(
      (a, [date, dailyData]) => {
        a.categories.push(epochToMonthDay(parseInt(date)));

        if (!dailyData?.measurements) {
          a.series.forEach((series) => {
            series.data.push({ y: 0 });
          });
        } else {
          const totalPixels = getTotalNonLandPixels(dailyData);
          a.series[0].data.push(
            barChartDataPoint(
              dailyData.belowDetection,
              totalPixels,
              totalPixelArea,
            ),
          );
          a.series[1].data.push(
            barChartDataPoint(
              sumSlice(dailyData.measurements, CcIdx.Low, CcIdx.Medium),
              totalPixels,
              totalPixelArea,
            ),
          );
          a.series[2].data.push(
            barChartDataPoint(
              sumSlice(dailyData.measurements, CcIdx.Medium, CcIdx.High),
              totalPixels,
              totalPixelArea,
            ),
          );
          a.series[3].data.push(
            barChartDataPoint(
              sumSlice(dailyData.measurements, CcIdx.High, CcIdx.VeryHigh),
              totalPixels,
              totalPixelArea,
            ),
          );
          a.series[4].data.push(
            barChartDataPoint(
              sumSlice(dailyData.measurements, CcIdx.VeryHigh),
              totalPixels,
              totalPixelArea,
            ),
          );
          a.series[5].data.push(
            barChartDataPoint(dailyData.noData, totalPixels, totalPixelArea),
          );
        }
        return a;
      },
      emptyBarChartData,
    );
    setBarChartData(newBarChartData);
  }, [cellConcentration]);

  const handleSliderChange = useCallback((value) => setSelectedDate(value), []);

  // Calculate the total pixel area if there is cell concentration data
  let pixelArea = null;
  if (cellConcentration.status === 'pending') {
    pixelArea = <LoadingSpinner className="pixel-area-spinner" />;
  } else if (cellConcentration.status === 'success') {
    pixelArea = `${formatNumber(
      getAverageNonLandPixelArea(cellConcentration.data),
    )} mi${String.fromCodePoint(0x00b2)}`;
  }

  return (
    <>
      <div css={textBoxStyles}>
        <ListContent
          rows={[
            {
              label: 'Waterbody Area',
              value: attributes.AREASQKM
                ? `${formatNumber(
                    squareKmToSquareMi(attributes.AREASQKM),
                    2,
                  )} mi${String.fromCodePoint(0x00b2)}`
                : '',
            },
            {
              label: 'Total Satellite Image Pixel Area',
              value: pixelArea ?? 'N/A',
            },
          ]}
          styles={cyanListContentStyles}
        />
      </div>
      <>
        {cellConcentration.status === 'pending' && <LoadingSpinner />}
        {cellConcentration.status === 'failure' && (
          <p css={marginBoxStyles(errorBoxStyles)}>{cyanError}</p>
        )}
        {cellConcentration.status === 'success' && (
          <>
            {barChartData && (
              <>
                <StackedColumnChart
                  categories={barChartData.categories}
                  exportFilename="CyAN_StackedBarChart"
                  legendTitle="Cyanobacteria Concentration Categories:"
                  series={barChartData.series}
                  title={`Daily Cyanobacteria Estimates for ${attributes.GNIS_NAME}`}
                  subtitle={`
                    Total Satellite Image Area: ${pixelArea}
                    <br />
                    ${formatDate(dates[0])} - ${formatDate(
                    dates[dates.length - 1],
                  )}
                  `}
                  yTitle={`
                  Percent of Satellite Image Area
                `}
                  yUnit="%"
                />
                <p>
                  The categories in this figure are included to assist the user
                  in visually understanding the concentration values. Please
                  review the World Health Organization (WHO) guide,{' '}
                  <i>
                    <a
                      rel="noreferrer"
                      target="_blank"
                      href="https://www.who.int/publications/m/item/toxic-cyanobacteria-in-water---second-edition"
                    >
                      Toxic cyanobacteria in water - Second edition
                    </a>
                  </i>
                  , for information on potential health impacts.
                </p>
              </>
            )}

            {/* If `selectedDate` is null, no date with data was found */}
            {selectedDate ? (
              <>
                <div css={textBoxStyles}>
                  <p css={subheadingBoxStyles}>
                    <HelpTooltip
                      label={
                        <>
                          Adjust the slider handle to view the day's CyAN
                          satellite imagery on the map.
                          <br />
                          Data for the previous day typically becomes available
                          between 9 - 11am EST.
                        </>
                      }
                    />
                    &nbsp;&nbsp; Date Selection:
                  </p>

                  <div css={sliderContainerStyles}>
                    <TickSlider
                      getTickLabel={epochToMonthDay}
                      loading={imageStatus === 'pending'}
                      onChange={handleSliderChange}
                      steps={dates}
                      stepSize={oneDay}
                      value={selectedDate}
                    />
                  </div>
                </div>

                {imageStatus === 'failure' && (
                  <p css={marginBoxStyles(errorBoxStyles)}>
                    There was an error retrieving the CyAN satellite image for
                    the selected day.
                  </p>
                )}

                <CyanDailyContent
                  data={cellConcentration.data[selectedDate.toString()]}
                  epochDate={selectedDate}
                  waterbodyName={attributes.GNIS_NAME}
                />
              </>
            ) : (
              <p css={marginBoxStyles(infoBoxStyles)}>
                There is no CyAN data from the past week for the{' '}
                {attributes.GNIS_NAME} waterbody.
              </p>
            )}
          </>
        )}
      </>

      <div css={showLessMoreStyles}>
        <h3>Information on Data Accuracy:</h3>
        <ShowLessMore
          charLimit={0}
          text={
            <>
              <p>
                Daily data are a snapshot of{' '}
                <GlossaryTerm term="Cyanobacteria">cyanobacteria</GlossaryTerm>{' '}
                (historically referred to as blue-green algae) at the time of
                detection. These are provisional satellite derived measures of
                cyanobacteria, which may contain errors. Information can be used
                to identify potential problems related to cyanobacteria in
                larger lakes and reservoirs within the contiguous United States.
              </p>

              <h3>Data Issues include:</h3>
              <ul>
                <li>
                  <b id={`near-shore-response-${attributes.FID}`}>
                    Near-shore response:
                  </b>{' '}
                  mixed land/water pixels may be reading land vegetation and/or
                  shallow water bottom foliage. It is not possible to discount
                  reported concentration entirely, as a response may be valid
                  due to wind action on a bloom resulting in shoreline
                  accumulation. Data values reported should be considered in
                  context of the local conditions near and within the waterbody.
                  Data reported should be validated in situ.
                </li>
                <li>
                  <b>Estuaries:</b> data have not been validated for brine/salt
                  water.
                </li>
                <li>
                  <b>Rivers:</b> large flowing waterways are not masked and can
                  have a cyanobacteria response that is not validated.
                </li>
                <li>
                  A resolvable waterbody is considered to have, at minimum, a
                  3x3 raster cell matrix size (900x900m), with the center pixel
                  being considered valid. Smaller or irregularly shaped
                  waterbodies (i.e., those not having the minimum 900x900m size)
                  may be evident in the data, and their cyanobacteria responses
                  are suspect and open to interpretation. See{' '}
                  <a href={`#near-shore-response-${attributes.FID}`}>
                    “Near-shore response”
                  </a>{' '}
                  above.
                </li>
              </ul>
            </>
          }
        />
      </div>

      {services?.status === 'success' && (
        <div css={linkSectionStyles}>
          <p>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={`${services.data.cyan.dataDownload}?OBJECTID=${
                attributes.oid ?? attributes.OBJECTID
              }`}
            >
              <HelpTooltip
                label="Download CSV"
                description="Download data as a CSV file."
              >
                <i
                  css={iconStyles}
                  className="fas fa-file-csv"
                  aria-hidden="true"
                />
              </HelpTooltip>
              Download Cyanobacteria Data
            </a>
          </p>
          <p>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={services.data.cyan.application}
            >
              <i
                css={iconStyles}
                className="fas fa-info-circle"
                aria-hidden="true"
              />
              More Information
            </a>
            &nbsp;&nbsp;
            <small>(opens new browser tab)</small>
          </p>
        </div>
      )}
    </>
  );
}

interface MonitoringLocationAttributes {
  monitoringType: 'Past Water Conditions';
  siteId: string;
  orgId: string;
  orgName: string;
  locationLongitude: number;
  locationLatitude: number;
  locationName: string;
  locationType: string;
  locationUrl: string;
  stationProviderName: string;
  stationTotalSamples: number;
  stationTotalsByGroup:
    | string
    | {
        [groupName: string]: number;
      };
  stationTotalMeasurements: number;
  timeframe: string | [number, number] | null;
  uniqueId: string;
}

interface MappedGroups {
  [groupLabel: string]: {
    characteristicGroups: string[];
    resultCount: number;
  };
}

interface SelectedGroups {
  [groupLabel: string]: boolean;
}

function buildGroups(
  checkMappings: (groupName: string) => boolean,
  totalsByGroup: string | { [groupName: string]: number },
): { newGroups: MappedGroups; newSelected: SelectedGroups } {
  const newGroups: MappedGroups = {};
  const newSelected: SelectedGroups = {};
  if (typeof totalsByGroup === 'string') return { newGroups, newSelected };
  const stationGroups = totalsByGroup;
  // get the feature where the provider matches this stations provider
  characteristicGroupMappings.forEach((mapping) => {
    for (const groupName in stationGroups) {
      if (
        mapping.groupNames.includes(groupName) &&
        !newGroups[mapping.label]?.characteristicGroups.includes(groupName)
      ) {
        // push to existing group
        if (newGroups[mapping.label]) {
          newGroups[mapping.label].characteristicGroups.push(groupName);
          newGroups[mapping.label].resultCount += stationGroups[groupName];
        }
        // create a new group
        else {
          newGroups[mapping.label] = {
            characteristicGroups: [groupName],
            resultCount: stationGroups[groupName],
          };
        }
      } else if (!checkMappings(groupName)) {
        if (!newGroups['Other']) {
          newGroups['Other'] = { characteristicGroups: [], resultCount: 0 };
        }
        if (!newGroups['Other'].characteristicGroups.includes(groupName)) {
          // push to Other
          newGroups['Other'].characteristicGroups.push(groupName);
          newGroups['Other'].resultCount += stationGroups[groupName];
        }
      }
    }
  });

  Object.keys(newGroups).forEach((group) => {
    newSelected[group] = true;
  });

  return { newGroups, newSelected };
}

function checkIfGroupInMapping(groupName: string): boolean {
  const result = characteristicGroupMappings.find((mapping) =>
    mapping.groupNames.includes(groupName),
  );
  return result ? true : false;
}

type MonitoringLocationsContentProps = {
  feature: __esri.Graphic;
  services: ServicesState | null;
};

function MonitoringLocationsContent({
  feature,
  services,
}: MonitoringLocationsContentProps) {
  const [charGroupFilters, setCharGroupFilters] = useState('');
  const [selectAll, setSelectAll] = useState(1);
  const [totalMeasurements, setTotalMeasurements] = useState<number | null>(
    null,
  );

  const structuredProps = ['stationTotalsByGroup', 'timeframe'];

  const attributes: MonitoringLocationAttributes = feature.attributes;
  const layer = feature.layer;
  const parsed = parseAttributes<MonitoringLocationAttributes>(
    structuredProps,
    attributes,
  );
  const {
    locationName,
    locationType,
    locationUrl,
    orgId,
    orgName,
    siteId,
    stationProviderName,
    stationTotalSamples,
    stationTotalsByGroup,
    stationTotalMeasurements,
    timeframe,
  } = parsed;

  const [groups, setGroups] = useState(() => {
    const { newGroups } = buildGroups(
      checkIfGroupInMapping,
      stationTotalsByGroup,
    );
    return newGroups;
  });
  const [selected, setSelected] = useState(() => {
    const newSelected: { [Property in keyof typeof groups]: boolean } = {};
    Object.keys(groups).forEach((group) => {
      newSelected[group] = true;
    });
    return newSelected;
  });

  useEffect(() => {
    const { newGroups, newSelected } = buildGroups(
      checkIfGroupInMapping,
      stationTotalsByGroup,
    );
    setGroups(newGroups);
    setSelected(newSelected);
    setSelectAll(1);
  }, [stationTotalsByGroup]);

  const buildFilter = useCallback(
    (selectedNames, monitoringLocationData) => {
      let filter = '';

      if (selectAll === 2) {
        for (const name in selectedNames) {
          if (selectedNames[name]) {
            filter +=
              '&characteristicType=' +
              monitoringLocationData[name].characteristicGroups.join(
                '&characteristicType=',
              );
          }
        }
      }

      if (timeframe) {
        filter += `&startDateLo=01-01-${timeframe[0]}&startDateHi=12-31-${timeframe[1]}`;
      }

      setCharGroupFilters(filter);
    },
    [setCharGroupFilters, selectAll, timeframe],
  );

  useEffect(() => {
    buildFilter(selected, groups);
  }, [buildFilter, groups, selected]);

  useEffect(() => {
    setTotalMeasurements(stationTotalMeasurements);
  }, [stationTotalMeasurements]);

  //Toggle an individual row and call the provided onChange event handler
  const toggleRow = (groupLabel: string, allGroups: Object) => {
    // flip the current toggle
    const selectedGroups = { ...selected };
    selectedGroups[groupLabel] = !selected[groupLabel];
    setSelected(selectedGroups);

    // find the number of toggles currently true
    let numberSelected = 0;
    Object.values(selectedGroups).forEach((value) => {
      if (value) numberSelected++;
    });

    // total number of toggles displayed
    const totalSelections = Object.keys(allGroups).length;

    // if all selected
    if (numberSelected === totalSelections) {
      setSelectAll(1);
      setTotalMeasurements(stationTotalMeasurements);
    }
    // if none selected
    else if (numberSelected === 0) {
      setSelectAll(0);
      setTotalMeasurements(0);
    }
    // if some selected
    else {
      setSelectAll(2);
      let newTotalMeasurementCount = 0;
      Object.keys(groups).forEach((group) => {
        if (selectedGroups[group] === true) {
          newTotalMeasurementCount += groups[group].resultCount;
        }
      });
      setTotalMeasurements(newTotalMeasurementCount);
    }
  };

  //Toggle all rows and call the provided onChange event handler
  const toggleAllCheckboxes = () => {
    let selectedGroups: SelectedGroups = {};

    if (Object.keys(groups).length > 0) {
      const newValue = selectAll === 0 ? true : false;

      Object.keys(groups).forEach((key) => {
        selectedGroups[key] = newValue;
      });
    }

    setSelected(selectedGroups);
    setSelectAll(selectAll === 0 ? 1 : 0);
    setTotalMeasurements(selectAll === 0 ? stationTotalMeasurements : 0);
  };

  // if a user has filtered out certain characteristic groups for
  // a given table, that'll be used as additional query string
  // parameters in the download URL string
  // (see setCharGroupFilters in Table's onChange handler)
  const downloadUrl =
    services?.status === 'success'
      ? `${services.data.waterQualityPortal.resultSearch}zip=no&siteid=` +
        `${siteId}&providers=${stationProviderName}` +
        `${charGroupFilters}`
      : null;
  const portalUrl =
    services?.status === 'success'
      ? `${services.data.waterQualityPortal.userInterface}#` +
        `siteid=${siteId}${charGroupFilters}` +
        `&mimeType=xlsx&dataProfile=resultPhysChem` +
        `&providers=NWIS&providers=STEWARDS&providers=STORET`
      : null;

  const onMonitoringReportPage =
    window.location.pathname.indexOf('monitoring-report') === 1;

  return (
    <>
      <div css={tableStyles} className="table">
        <ListContent
          rows={[
            {
              label: <>Organ&shy;ization Name</>,
              value: orgName,
            },
            {
              label: 'Location Name',
              value: locationName,
            },
            {
              label: 'Water Type',
              value: locationType,
            },
            {
              label: 'Organization ID',
              value: orgId,
            },
            {
              label: <>Monitor&shy;ing Site ID</>,
              value: siteId,
            },
            {
              label: (
                <GlossaryTerm term="Monitoring Samples">
                  Monitor&shy;ing Samples
                </GlossaryTerm>
              ),
              value: (
                <>
                  {Number(stationTotalSamples).toLocaleString()}
                  {timeframe ? <small>(all time)</small> : null}
                </>
              ),
            },
            {
              label: (
                <GlossaryTerm term="Monitoring Measurements">
                  Monitor&shy;ing Measure&shy;ments
                </GlossaryTerm>
              ),
              value: (
                <>
                  {Number(stationTotalMeasurements).toLocaleString()}
                  {timeframe && (
                    <small>
                      ({timeframe[0]} - {timeframe[1]})
                    </small>
                  )}
                </>
              ),
            },
          ]}
          styles={listContentStyles}
        />
      </div>

      {Object.keys(groups).length === 0 && (
        <p>No data available for this monitoring location.</p>
      )}

      {Object.keys(groups).length > 0 && (
        <table css={measurementTableStyles} className="table">
          <thead>
            <tr>
              <th css={checkboxCellStyles}>
                <input
                  css={checkboxStyles}
                  type="checkbox"
                  className="checkbox"
                  checked={selectAll === 1}
                  ref={(input) => {
                    if (input) input.indeterminate = selectAll === 2;
                  }}
                  onChange={(_ev) => toggleAllCheckboxes()}
                />
              </th>
              <th>
                <GlossaryTerm term="Characteristic Group">
                  Char&shy;acter&shy;istic Group
                </GlossaryTerm>
              </th>
              <th>
                <GlossaryTerm term="Monitoring Measurements">
                  Number of Measure&shy;ments
                </GlossaryTerm>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groups).map((key) => {
              // ignore groups with 0 results
              if (groups[key].resultCount === 0) {
                return null;
              }

              return (
                <tr key={key}>
                  <td css={checkboxCellStyles}>
                    <input
                      css={checkboxStyles}
                      type="checkbox"
                      className="checkbox"
                      checked={selected[key] === true || selectAll === 1}
                      onChange={(_ev) => {
                        toggleRow(key, groups);
                      }}
                    />
                  </td>
                  <td>{key}</td>
                  <td>{groups[key].resultCount.toLocaleString()}</td>
                </tr>
              );
            })}
            <tr>
              <td></td>
              <td>Total</td>
              <td>{Number(totalMeasurements).toLocaleString()}</td>
            </tr>
          </tbody>

          <tfoot css={tableFooterStyles}>
            <tr>
              <td colSpan={2}>
                <a
                  rel="noopener noreferrer"
                  target="_blank"
                  data-cy="portal"
                  href={portalUrl ?? undefined}
                  style={{ fontWeight: 'normal' }}
                >
                  <i
                    css={iconStyles}
                    className="fas fa-filter"
                    aria-hidden="true"
                  />
                  Advanced Filtering
                </a>
                &nbsp;&nbsp;
                <small css={modifiedDisclaimerStyles}>
                  (opens new browser tab)
                </small>
              </td>
              <td colSpan={2}>
                <span>Download Selected Data</span>
                <span>
                  &nbsp;&nbsp;
                  <a
                    href={
                      downloadUrl ? `${downloadUrl}&mimeType=xlsx` : undefined
                    }
                  >
                    <HelpTooltip
                      label="Download XLSX"
                      description="Download selected data as an XLSX file."
                    >
                      <i className="fas fa-file-excel" aria-hidden="true" />
                    </HelpTooltip>
                  </a>
                  &nbsp;&nbsp;
                  <a
                    href={
                      downloadUrl ? `${downloadUrl}&mimeType=csv` : undefined
                    }
                  >
                    <HelpTooltip
                      label="Download CSV"
                      description="Download selected data as a CSV file."
                    >
                      <i className="fas fa-file-csv" aria-hidden="true" />
                    </HelpTooltip>
                  </a>
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {(!onMonitoringReportPage ||
        layer.id === 'surroundingMonitoringLocationsLayer') && (
        <p css={paragraphStyles}>
          <a rel="noopener noreferrer" target="_blank" href={locationUrl}>
            <i
              css={iconStyles}
              className="fas fa-info-circle"
              aria-hidden="true"
            />
            View Monitoring Report
          </a>
          &nbsp;&nbsp;
          <small css={disclaimerStyles}>(opens new browser tab)</small>
        </p>
      )}
    </>
  );
}

type UsgsStreamgagesContentProps = {
  feature: __esri.Graphic;
  services: ServicesState | null;
};

function UsgsStreamgagesContent({
  feature,
  services,
}: UsgsStreamgagesContentProps) {
  const {
    streamgageMeasurements,
    orgName,
    locationName,
    locationType,
    siteId,
    orgId,
    locationUrl,
  }: UsgsStreamgageAttributes = feature.attributes;

  const [additionalMeasurementsShown, setAdditionalMeasurementsShown] =
    useState(false);

  function addUniqueMeasurement(
    measurement: StreamgageMeasurement,
    array: StreamgageMeasurement[],
  ) {
    const measurementAlreadyAdded = array.find((m) => {
      return m.parameterCode === measurement.parameterCode;
    });

    if (measurementAlreadyAdded) {
      measurementAlreadyAdded.multiple = true;
    } else {
      array.push({ ...measurement });
    }
  }

  const primaryMeasurements: StreamgageMeasurement[] = [];
  const secondaryMeasurements: StreamgageMeasurement[] = [];

  streamgageMeasurements.primary.forEach((measurement) => {
    addUniqueMeasurement(measurement, primaryMeasurements);
  });

  streamgageMeasurements.secondary.forEach((measurement) => {
    addUniqueMeasurement(measurement, secondaryMeasurements);
  });

  const sortedPrimaryMeasurements = [...primaryMeasurements]
    .sort((a, b) => a.parameterOrder - b.parameterOrder)
    .map((data) => (
      <UsgsStreamgageParameter
        url={locationUrl}
        data={data}
        key={data.parameterCode}
      />
    ));

  const sortedSecondaryMeasurements = [...secondaryMeasurements]
    .sort((a, b) => a.parameterName.localeCompare(b.parameterName))
    .map((data) => (
      <UsgsStreamgageParameter
        url={locationUrl}
        data={data}
        key={data.parameterCode}
      />
    ));

  const sortedMeasurements = [
    ...sortedPrimaryMeasurements,
    ...sortedSecondaryMeasurements,
  ];

  const alertUrl =
    services?.status === 'success' ? services.data.usgsWaterAlert : null;

  return (
    <>
      <div css={tableStyles} className="table">
        <ListContent
          rows={[
            {
              label: <>Organ&shy;ization Name</>,
              value: orgName,
            },
            {
              label: <>Locat&shy;ion Name</>,
              value: locationName,
            },
            {
              label: 'Water Type',
              value: locationType,
            },
            {
              label: 'Organization ID',
              value: orgId,
            },
            {
              label: <>Monitor&shy;ing Site ID</>,
              value: siteId,
            },
          ]}
          styles={listContentStyles}
        />
      </div>

      <table css={measurementTableStyles} className="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Latest Measurement</th>
          </tr>
        </thead>
        <tbody>
          {sortedMeasurements.length === 0 ? (
            <tr>
              <td>
                <em>No recent data available.</em>
              </td>
              <td>&nbsp;</td>
            </tr>
          ) : sortedMeasurements.length <= 10 ? (
            <>{sortedMeasurements}</>
          ) : (
            <>
              {sortedMeasurements.slice(0, 10)}

              <tr>
                <td css={moreLessRowStyles} colSpan={2}>
                  <button
                    css={buttonStyles}
                    onClick={(_ev) => {
                      setAdditionalMeasurementsShown(
                        !additionalMeasurementsShown,
                      );
                    }}
                  >
                    {additionalMeasurementsShown ? (
                      <>
                        <i className="fas fa-angle-down" aria-hidden="true" />
                        &nbsp;&nbsp;Show less categories
                      </>
                    ) : (
                      <>
                        <i className="fas fa-angle-right" aria-hidden="true" />
                        &nbsp;&nbsp;Show more categories
                      </>
                    )}
                  </button>
                </td>
              </tr>

              {additionalMeasurementsShown && sortedMeasurements.slice(10)}
            </>
          )}
        </tbody>
      </table>

      <p css={paragraphStyles}>
        <a rel="noopener noreferrer" target="_blank" href={locationUrl}>
          <i
            css={iconStyles}
            className="fas fa-info-circle"
            aria-hidden="true"
          />
          More Information
        </a>
        &nbsp;&nbsp;
        <small css={disclaimerStyles}>(opens new browser tab)</small>
      </p>

      <p css={paragraphStyles}>
        <a
          rel="noopener noreferrer"
          target="_blank"
          href={alertUrl ?? undefined}
        >
          <i css={iconStyles} className="fas fa-bell" aria-hidden="true" />
          Sign Up for Alerts
        </a>
        &nbsp;&nbsp;
        <small css={disclaimerStyles}>(opens new browser tab)</small>
      </p>
    </>
  );
}

function UsgsStreamgageParameter({
  url,
  data,
}: {
  url: string;
  data: StreamgageMeasurement;
}) {
  return (
    <tr>
      <td>
        {data.parameterCategory === 'primary' ? (
          <GlossaryTerm term={data.parameterName}>
            {data.parameterName}
          </GlossaryTerm>
        ) : (
          data.parameterName
        )}
        <br />
        <small css={additionalTextStyles}>
          {data.parameterCode} &ndash; {data.parameterUsgsName}
        </small>
      </td>
      <td>
        {data.multiple ? (
          <>
            <em>multiple&nbsp;measurements&nbsp;found</em>
            <br />
            <small css={additionalTextStyles}>
              <a rel="noopener noreferrer" target="_blank" href={url}>
                More Information
              </a>
              <br />
              <span>(opens new browser tab)</span>
            </small>
          </>
        ) : (
          <div css={measurementStyles}>
            <div css={chartStyles}>
              {data.dailyAverages.length > 0 ? (
                <Sparkline data={data.dailyAverages} />
              ) : (
                <small css={additionalTextStyles}>
                  No weekly
                  <br />
                  summary data
                </small>
              )}
            </div>

            <div css={unitStyles}>
              <strong>{data.measurement ?? 'N/A'}</strong>
              &nbsp;
              {data.measurement && (
                <small title={data.unitName}>{data.unitAbbr}</small>
              )}
              <br />
              <small css={additionalTextStyles}>{data.datetime}</small>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export default WaterbodyInfo;

export { MapPopup };
