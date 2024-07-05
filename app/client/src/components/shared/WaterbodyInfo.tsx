/** @jsxImportSource @emotion/react */

import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import ControlPointsGeoreference from '@arcgis/core/layers/support/ControlPointsGeoreference';
import Extent from '@arcgis/core/geometry/Extent';
import ImageElement from '@arcgis/core/layers/support/ImageElement';
import Point from '@arcgis/core/geometry/Point';
import * as webMercatorUtils from '@arcgis/core/geometry/support/webMercatorUtils';
import { css } from '@emotion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import * as symbolUtils from '@arcgis/core/symbols/support/symbolUtils';
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
import Modal from 'components/shared/Modal';
import ShowLessMore from 'components/shared/ShowLessMore';
import Slider from 'components/shared/Slider';
import { Sparkline } from 'components/shared/Sparkline';
import {
  createRelativeDailyTimestampRange,
  epochToMonthDay,
  getDayOfYear,
  yearDayStringToEpoch,
} from 'utils/dateUtils';
import { useAbort } from 'utils/hooks';
import {
  getPollutantsFromAction,
  getWaterbodyCondition,
  isClassBreaksRenderer,
  isFeatureLayer,
  isMediaLayer,
  isUniqueValueRenderer,
  mapRestorationPlanToGlossary,
} from 'utils/mapFunctions';
import { fetchCheck, fetchParseCsv, proxyFetch } from 'utils/fetchUtils';
import {
  addAnnualData,
  complexProps,
  structurePeriodOfRecordData,
} from 'utils/monitoringLocations';
import {
  convertAgencyCode,
  convertDomainCode,
  formatNumber,
  getSelectedCommunityTab,
  parseAttributes,
  isAbort,
  titleCaseWithExceptions,
  toFixedFloat,
  titleCase,
} from 'utils/utils';
// errors
import { cyanError, waterbodyReportError } from 'config/errorMessages';
// styles
import {
  colors,
  disclaimerStyles,
  fonts,
  iconButtonStyles,
  iconStyles,
  modifiedTableStyles,
  tableStyles,
} from 'styles/index';
// types
import type { SerializedStyles } from '@emotion/react';
import type { ColumnSeries } from 'components/shared/ColumnChart';
import type { ReactNode } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type {
  AssessmentUseAttainmentByGroup,
  AssessmentUseAttainmentState,
  AttainsUseField,
  ChangeLocationAttributes,
  CharacteristicGroupMappings,
  CharacteristicGroupMappingsState,
  ClickedHucState,
  FetchState,
  FetchStateWithDefault,
  MonitoringLocationAttributes,
  PopupLookupFiles,
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
  infoText: string | null = null,
) {
  return (
    <p>
      <strong css={popupLabelValueStyles}>{label}: </strong>
      <span css={popupLabelValueStyles}>
        <span css={popupIconStyles}>
          {icon ? (
            <>
              {icon} {value}
            </>
          ) : (
            value
          )}
          {infoText && (
            <Modal
              label={`Additional information for ${label}`}
              maxWidth="35rem"
              triggerElm={
                <button
                  aria-label={`View additional information for ${label}`}
                  title={`View additional information for ${label}`}
                  css={css`
                    ${modifiedIconButtonStyles}
                    margin-left: 5px;
                  `}
                >
                  <i aria-hidden className="fas fa-info-circle"></i>
                </button>
              }
            >
              <div>{infoText}</div>
            </Modal>
          )}
        </span>
      </span>
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

const modifiedIconButtonStyles = css`
  ${iconButtonStyles}
  margin-right: 0.25rem;
  color: #485566;
`;

const popupContainerStyles = css`
  color: black;
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

const measurementTableStyles = (align: string = 'right') => css`
  ${modifiedTableStyles};

  th:last-of-type,
  td:last-of-type {
    text-align: ${align};
  }
`;

const modalTableStyles = css`
  ${measurementTableStyles()};
  margin-bottom: 0;

  th {
    border-top: none;
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
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 3px;
`;

const popupLabelValueStyles = css`
  display: inline-block;
  vertical-align: middle;
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

const slimTextBoxStyles = css`
  ${textBoxStyles};

  padding-bottom: 0 !important;
  padding-top: 0 !important;
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
  lookupFiles?: PopupLookupFiles;
  mapView?: __esri.MapView;
  type: string;
};

/*
## Components
*/
function WaterbodyInfo({
  extraContent,
  feature,
  fieldName = null,
  fields,
  lookupFiles,
  mapView,
  type,
}: WaterbodyInfoProps) {
  const { attributes } = feature;
  const onWaterbodyReportPage =
    window.location.pathname.indexOf('waterbody-report') !== -1;
  const waterbodyPollutionCategories = (label: string) => {
    const pollutionCategories = (
      lookupFiles?.attainsImpairmentFields?.data ?? []
    )
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
      <div css={paddedMarginBoxStyles(textBoxStyles)}>
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
        <small css={modifiedDisclaimerStyles}>(opens new browser tab)</small>
      </div>
    ) : (
      <p css={paragraphStyles}>
        Unable to find a waterbody report for this waterbody.
      </p>
    );

  const [selectedUseField, setSelectedUseField] =
    useState<AttainsUseField | null>(null);
  const [useAttainments, setUseAttainments] =
    useState<AssessmentUseAttainmentState>({
      data: null,
      status: 'fetching',
    });
  const fetchDetailedUses = useCallback(() => {
    if (type !== 'Waterbody' && type !== 'Waterbody State Overview') return;
    if (
      lookupFiles?.services?.status !== 'success' ||
      lookupFiles?.stateNationalUses?.status !== 'success' ||
      useAttainments?.status === 'success'
    )
      return;

    const { assessmentunitidentifier, organizationid, reportingcycle } =
      feature.attributes;

    const url =
      lookupFiles.services.data.attains.serviceUrl +
      `assessments?assessmentUnitIdentifier=${assessmentunitidentifier}` +
      `&organizationId=${organizationid}` +
      `&reportingCycle=${reportingcycle}` +
      `&summarize=Y`;

    setUseAttainments({ data: null, status: 'fetching' });

    fetchCheck(url)
      .then((res) => {
        if (!res?.items || res.items.length === 0) {
          setUseAttainments({ data: null, status: 'failure' });
          return;
        }

        // find the assessment
        const assessment = res.items[0].assessments.find(
          (a: any) => a.assessmentUnitIdentifier === assessmentunitidentifier,
        );
        if (!assessment) {
          setUseAttainments({ data: null, status: 'failure' });
          return;
        }

        // search for Other useAttainments
        const uses: AssessmentUseAttainmentByGroup = {
          'Drinking Water': [],
          'Ecological Life': [],
          'Fish and Shellfish Consumption': [],
          Recreation: [],
          Cultural: [],
          Other: [],
        };
        assessment.useAttainments.forEach((useAttainment: any) => {
          // check if it is other in stateNationalUses
          const nationalUse = lookupFiles?.stateNationalUses?.data.find(
            (u: any) =>
              u.orgId === organizationid && u.name === useAttainment.useName,
          );

          uses[nationalUse.category].push(useAttainment);
        });

        setUseAttainments({ data: uses, status: 'success' });
      })
      .catch((err) => {
        console.error(err);
        setUseAttainments({ data: null, status: 'failure' });
      });
  }, [feature, lookupFiles, setUseAttainments, type, useAttainments]);

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
    const waterbodyConditions = (
      lookupFiles?.attainsUseFields?.data as AttainsUseField[]
    )?.map((useField: AttainsUseField) => {
      return getWaterbodyCondition(attributes, useField.value).label;
    });

    const applicableFields =
      waterbodyConditions?.filter((value) => {
        return value !== 'Not Applicable';
      }) || [];

    const reportingCycle = attributes?.reportingcycle;
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
              <table css={measurementTableStyles('center')} className="table">
                <thead>
                  <tr>
                    <th>What is this water used for?</th>
                    <th>Condition</th>
                    <th>Detailed Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {lookupFiles?.attainsUseFields?.data?.map(
                    (useField: AttainsUseField) => {
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
                          <td>
                            <GlossaryTerm
                              term={
                                value === 'Good'
                                  ? 'Good Waters'
                                  : value === 'Impaired' ||
                                      value === 'Impaired (Issues Identified)'
                                    ? 'Impaired Waters'
                                    : 'Condition Unknown'
                              }
                            >
                              {value}
                            </GlossaryTerm>
                          </td>
                          <td>
                            <Modal
                              label={`Detailed Uses for ${useField.label}`}
                              maxWidth="35rem"
                              onClose={() => setSelectedUseField(null)}
                              triggerElm={
                                <button
                                  aria-label={`View detailed uses for ${useField.label}`}
                                  title={`View detailed uses for ${useField.label}`}
                                  css={modifiedIconButtonStyles}
                                  onClick={() => {
                                    setSelectedUseField(useField);
                                    fetchDetailedUses();
                                  }}
                                >
                                  <i
                                    aria-hidden
                                    className="fas fa-info-circle"
                                  ></i>
                                </button>
                              }
                            >
                              {useAttainments.status === 'fetching' && (
                                <LoadingSpinner />
                              )}

                              {selectedUseField &&
                                useAttainments.status === 'success' && (
                                  <table
                                    css={modalTableStyles}
                                    className="table"
                                  >
                                    <thead>
                                      <tr>
                                        <th>
                                          Detailed{' '}
                                          <em>{selectedUseField.label}</em> Uses
                                        </th>
                                        <th>Condition</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {useAttainments.data[
                                        selectedUseField.category
                                      ].map((use: any) => {
                                        const useCode = use.useAttainmentCode;
                                        const value =
                                          useCode === 'F'
                                            ? 'Good'
                                            : useCode === 'N'
                                              ? 'Impaired'
                                              : 'Condition Unknown';

                                        return (
                                          <tr key={use.useName}>
                                            <td>{use.useName}</td>
                                            <td
                                              css={css`
                                                min-width: 100px;
                                              `}
                                            >
                                              {['F', 'N', 'I', 'X'].includes(
                                                useCode,
                                              ) ? (
                                                <GlossaryTerm
                                                  term={
                                                    value === 'Good'
                                                      ? 'Good Waters'
                                                      : value === 'Impaired'
                                                        ? 'Impaired Waters'
                                                        : 'Condition Unknown'
                                                  }
                                                >
                                                  {value}
                                                </GlossaryTerm>
                                              ) : (
                                                use.useAttainmentCodeName
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}

                              <p css={infoBoxStyles}>
                                For more information view the{' '}
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
                                  Waterbody Report
                                </a>{' '}
                                <small css={modifiedDisclaimerStyles}>
                                  (opens new browser tab)
                                </small>
                                .
                              </p>
                            </Modal>
                          </td>
                        </tr>
                      );
                    },
                  )}
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
            label: 'Permit Type',
            value: attributes.CWPPermitTypeDesc,
          },
          {
            label: (
              <GlossaryTerm term="Permit Components">
                Permit Components
              </GlossaryTerm>
            ),
            value: attributes.PermitComponents ? (
              attributes.PermitComponents.split(', ')
                .sort()
                .map((term: string) => (
                  <GlossaryTerm key={term} term={term}>
                    {term}
                  </GlossaryTerm>
                ))
            ) : (
              <GlossaryTerm term="Components Not Specified">
                Components Not Specified
              </GlossaryTerm>
            ),
          },
          {
            label: (
              <>
                Significant{' '}
                <GlossaryTerm term="Effluent">Effluent</GlossaryTerm> Violation
                within the last 3 years
              </>
            ),
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
            label: 'Latitude/Longitude',
            value: `${toFixedFloat(
              parseFloat(attributes.FacLat),
              5,
            )}, ${toFixedFloat(parseFloat(attributes.FacLong), 5)}`,
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
      <p>
        <strong>District:</strong>
        <br />
        {attributes.CDFIPS} - {attributes.NAME}
      </p>
    );
  };

  // jsx
  const countyContent = () => {
    return (
      <p>
        <strong>County:</strong>
        <br />
        {attributes.CNTY_FIPS} - {attributes.NAME}
      </p>
    );
  };

  // jsx
  const tribeContent = labelValue('Tribe Name', attributes.TRIBE_NAME);

  // jsx
  const watershedContent = (
    <>
      {labelValue(
        'Area',
        attributes.areasqkm &&
          `${formatNumber(
            attributes.areaacres ?? attributes.areasqkm / 0.004046856422,
          )} acres / ${formatNumber(attributes.areasqkm, 2)} km²`,
      )}
    </>
  );

  // jsx
  const wildScenicRiversContent = (
    <>
      {attributes.PHOTOLINK && attributes.PHOTOCREDIT && (
        <div css={imageContainerStyles}>
          <img
            css={imageStyles}
            src={attributes.PHOTOLINK}
            alt="Wild and Scenic River"
          />
          <br />
          <em>Photo Credit: {attributes.PHOTOCREDIT}</em>
        </div>
      )}
      <p>
        <strong>Agency: </strong>
        {convertAgencyCode(attributes.AGENCY)}
      </p>
      <p>
        <strong>Category: </strong>
        {attributes.RIVERCATEGORY}
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
  const sewerOverflowsContent = () => {
    const echoLookups = lookupFiles?.extremeWeatherConfig?.data?.echoLookups;
    if (!echoLookups) return null;

    const { permit_status_code, permit_type_code } = attributes;
    return (
      <ListContent
        rows={[
          {
            label: 'Permit Status',
            value:
              echoLookups.permitStatus?.[permit_status_code] ??
              permit_status_code,
          },
          {
            label: 'Permit Type',
            value:
              echoLookups.permitType?.[permit_type_code] ?? permit_type_code,
          },
          {
            label: 'Latitude/Longitude',
            value: `${toFixedFloat(
              parseFloat(attributes.facility_lat),
              5,
            )}, ${toFixedFloat(parseFloat(attributes.facility_lon), 5)}`,
          },
          {
            label: 'NPDES ID',
            value: attributes.npdes_id,
          },
        ]}
        styles={listContentStyles}
      />
    );
  };

  // jsx
  const storageTankContent = (
    <ListContent
      rows={[
        {
          label: 'Facility Name',
          value: attributes.Name,
        },
        {
          label: 'Facility ID',
          value: attributes.Facility_ID,
        },
        {
          label: 'Open Storage Tanks',
          value: attributes.Open_USTs,
        },
        {
          label: 'Closed Storage Tanks',
          value: attributes.Closed_USTs,
        },
        {
          label: 'Temporarily Out of Service Storage Tanks',
          value: attributes.TOS_USTs,
        },
        {
          label: 'Land Use',
          value: attributes.LandUse,
        },
        {
          label: 'Population within 1500 ft',
          value: attributes.Population_1500ft,
        },
        {
          label: 'Wells within 1500 ft',
          value: attributes.Private_Wells_1500ft,
        },
        {
          label: 'Within Source Water Protection Area (SPA)',
          value: attributes.Within_SPA,
        },
        {
          label: 'Within 100-year Floodplain',
          value: attributes.Within_100yr_Floodplain,
        },
      ]}
      styles={listContentStyles}
    />
  );

  // jsx
  const wellsContent = (
    <>
      {labelValue('Wells', attributes.Wells_2020)}

      {labelValue(
        'Well Density (Wells / Sq. Km.) ',
        attributes.Wells_Density_2020,
      )}
    </>
  );

  // jsx
  const damsContent = () => {
    const { CITY, DAM_LENGTH, DAM_HEIGHT, HAZARD_POTENTIAL } = attributes;

    // get modal info text for hazard level, if applicable
    const damsInfoText =
      lookupFiles?.extremeWeatherConfig?.data?.potentiallyVulnerableDefaults?.find(
        (i) => i.id === 'dams',
      )?.infoText;
    const hazardKey = HAZARD_POTENTIAL.toLowerCase();
    const hazardTooltip =
      damsInfoText && typeof damsInfoText !== 'string'
        ? damsInfoText[hazardKey]
        : null;

    // get the symbol associated with the hazard level and show it in popup
    const layer = mapView?.map.layers.find((l) => l.id === 'damsLayer');
    const iconElement = document.createElement('span');
    if (layer && isFeatureLayer(layer)) {
      const symbol = (
        layer.renderer as __esri.UniqueValueRenderer
      ).uniqueValueInfos.find(
        (v) => v.value.toString().toLowerCase() === hazardKey,
      )?.symbol;
      if (symbol)
        symbolUtils.renderPreviewHTML(symbol, {
          node: iconElement,
          size: 10,
        });
    }

    return (
      <>
        {labelValue('Owner Type', attributes.OWNER_TYPES || 'Unknown')}

        {labelValue('Designed for', attributes.PURPOSES || 'Unknown')}

        {labelValue('Year completed', attributes.YEAR_COMPLETED || 'Unknown')}

        {labelValue('City', !CITY ? 'Unknown' : titleCase(CITY))}

        {labelValue('State', attributes.STATE)}

        {labelValue(
          'Hazard Potential Index',
          HAZARD_POTENTIAL,
          <span
            ref={(ref) => {
              if (!ref) return;
              ref.innerHTML = '';
              ref.appendChild(iconElement);
            }}
          />,
          hazardTooltip,
        )}

        {labelValue('Condition Assessment', attributes.CONDITION_ASSESSMENT)}

        {labelValue(
          'Recent Assessment Date',
          new Date(attributes.CONDITION_ASSESS_DATE).toLocaleString(),
        )}

        <p style={{ textAlign: 'center' }}>
          <strong>Specifics</strong>
        </p>

        {labelValue('Type', attributes.PRIMARY_DAM_TYPE || 'Unknown')}

        {labelValue('Core', attributes.CORE_TYPES || 'Unknown')}

        {labelValue('Foundation', attributes.FOUNDATIONS || 'Unknown')}

        {labelValue(
          'Dam length',
          DAM_LENGTH ? `${DAM_LENGTH.toLocaleString()} ft` : 'Unknown',
        )}

        {labelValue(
          'Dam height',
          DAM_HEIGHT ? `${DAM_HEIGHT.toLocaleString()} ft` : 'Unknown',
        )}
      </>
    );
  };

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
    if (lookupFiles?.services?.status !== 'success') return;

    const parameters =
      `assessmentUnitIdentifier=${attributes.assessmentunitidentifier}` +
      `&organizationIdentifier=${attributes.organizationid}`;
    getPollutantsFromAction(lookupFiles.services.data, parameters)
      .then((res) => {
        setAttainsProjects({ status: 'success', data: res });
      })
      .catch((ex) => {
        console.error(ex);
        setAttainsProjects({ status: 'failure', data: [] });
      });
  }, [
    attributes.assessmentunitidentifier,
    attributes.organizationid,
    lookupFiles,
    type,
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
                              <td>
                                {mapRestorationPlanToGlossary(action.type)}
                              </td>
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
  if (
    type === 'Waterbody' &&
    lookupFiles?.attainsUseFields?.status === 'success'
  )
    content = baseWaterbodyContent();
  if (type === 'Restoration Plans') content = projectContent();
  if (type === 'Protection Plans') content = projectContent();
  if (type === 'Permitted Discharger') content = dischargerContent;
  if (type === 'USGS Sensors') {
    content = (
      <UsgsStreamgagesContent
        feature={feature}
        services={lookupFiles?.services ?? null}
      />
    );
  }
  if (type === 'Past Water Conditions') {
    content = (
      <MonitoringLocationsContent
        characteristicGroupMappings={lookupFiles?.characteristicGroupMappings}
        feature={feature}
        services={lookupFiles?.services}
      />
    );
  }
  if (type === 'Nonprofit') content = nonprofitContent;
  if (
    type === 'Waterbody State Overview' &&
    lookupFiles?.attainsUseFields?.status === 'success'
  )
    content = waterbodyStateContent;
  if (type === 'Action') content = actionContent;
  if (type === 'County') content = countyContent();
  if (type === 'Tribe') content = tribeContent;
  if (type === 'Watershed' || type === 'Upstream Watershed')
    content = watershedContent;
  if (type === 'Wild and Scenic Rivers') content = wildScenicRiversContent;
  if (type === 'State Watershed Health Index') content = wsioContent;
  if (type === 'Alaska Native Village') content = alaskaNativeVillageContent;
  if (type === 'Protected Areas') content = protectedAreaContent;
  if (type === 'Demographic Indicators') content = ejscreenContent;
  if (type === 'Pollutant Storage Tank') content = storageTankContent;
  if (type === 'Combined Sewer Overflow') content = sewerOverflowsContent();
  if (type === 'Wells') content = wellsContent;
  if (type === 'Dams') content = damsContent();
  if (type === 'Congressional District') {
    content = congressionalDistrictContent();
  }
  if (type === 'Blue-Green Algae') {
    content = (
      <CyanContent
        cyanMetadata={lookupFiles?.cyanMetadata?.data ?? []}
        feature={feature}
        mapView={mapView}
        services={lookupFiles?.services ?? null}
      />
    );
  }

  return content;
}

type MapPopupProps = {
  extraContent?: ReactNode | null;
  feature: __esri.Graphic | ChangeLocationPopup;
  fieldName?: string | null;
  fields?: __esri.Field[] | null;
  getClickedHuc?: Promise<ClickedHucState> | null;
  lookupFiles?: PopupLookupFiles;
  mapView?: __esri.MapView;
  navigate: NavigateFunction;
  resetData?: () => void;
  type: string;
};

function MapPopup({
  extraContent,
  feature,
  fieldName,
  fields,
  getClickedHuc,
  lookupFiles,
  mapView,
  navigate,
  resetData,
  type,
}: Readonly<MapPopupProps>) {
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
    if (type === 'Watershed') {
      title = <GlossaryTerm term="Watershed">{title}</GlossaryTerm>;
    }
    if (type === 'Upstream Watershed') {
      title = <GlossaryTerm term="Upstream Watershed">{title}</GlossaryTerm>;
    }

    return <p css={popupTitleStyles}>{title}</p>;
  };

  if (!attributes) return null;

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
                <div>
                  {labelValue(
                    'WATERSHED',
                    `${clickedHuc.data.name} (${clickedHuc.data.huc12})`,
                  )}
                  {labelValue(
                    'SIZE',
                    `${formatNumber(
                      clickedHuc.data.areaacres,
                    )} acres / ${formatNumber(
                      clickedHuc.data.areasqkm,
                      2,
                    )} km²`,
                  )}
                </div>

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

                      let baseRoute = `/community/${clickedHuc.data.huc12}`;

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
            lookupFiles={lookupFiles}
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
  padding-bottom: 0;

  .row-cell {
    background-color: initial !important;
  }

  svg.pixel-area-spinner {
    margin-bottom: auto;
    margin-top: auto;
  }
`;

const marginBoxStyles = (styles: SerializedStyles) => css`
  ${styles}
  margin: 1em 0;
`;

const paddedMarginBoxStyles = (styles: SerializedStyles) => css`
  ${styles}
  ${marginBoxStyles(styles)}
  padding: 0.75em;
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

const subheadingStyles = css`
  font-weight: bold;
  padding-bottom: 0;
  text-align: center;
`;

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

function formatDate(epoch: number) {
  return new Date(epoch).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function getMaxCellConcentration(counts: number[], cyanMetadata: number[]) {
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

enum CcIdx {
  Low = 0,
  Medium = 99,
  High = 139,
  VeryHigh = 183,
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
  cyanMetadata: number[];
  data: CellConcentrationData[string];
  epochDate: number;
  waterbodyName: string;
};

function CyanDailyContent({
  cyanMetadata,
  data,
  epochDate,
  waterbodyName,
}: Readonly<CyanDailyContentProps>) {
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
  }, [cyanMetadata, data]);

  if (!data) {
    return (
      <p css={marginBoxStyles(infoBoxStyles)}>
        There is no potential harmful algal bloom data available for the
        selected date.
      </p>
    );
  } else if (!sum(...data.measurements)) {
    return (
      <p css={marginBoxStyles(infoBoxStyles)}>
        There is no measureable potential harmful algal bloom data available for
        the selected date.
      </p>
    );
  } else {
    const maxCc = getMaxCellConcentration(data.measurements, cyanMetadata);
    return (
      <>
        <p css={subheadingStyles}>
          Blue-Green Algae Concentration Histogram and Maximum for Selected
          Date: {formatDate(epochDate)}
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

        <div css={slimTextBoxStyles}>
          <ListContent
            rows={[
              {
                label: (
                  <>
                    <HelpTooltip label="Maximum detected blue-green algae concentration in the satellite image area shown on map." />
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
  cyanMetadata: number[];
  feature: __esri.Graphic;
  mapView?: __esri.MapView;
  services: ServicesState | null;
};

function CyanContent({
  cyanMetadata,
  feature,
  mapView,
  services,
}: Readonly<CyanContentProps>) {
  const { attributes } = feature;
  const layerId = feature.layer?.id;
  const { getSignal } = useAbort();

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

    const dateRange = createRelativeDailyTimestampRange(today, -7, -1);
    const newData = dateRange.reduce<CellConcentrationData>(
      (dataObj, timestamp) => {
        return {
          ...dataObj,
          [timestamp]: null,
        };
      },
      {},
    );

    const startDate = new Date(dateRange[0]);
    const dataUrl = `${services.data.cyan.cellConcentration}/?OBJECTID=${
      attributes.oid ?? attributes.OBJECTID
    }&start_year=${startDate.getFullYear()}&start_day=${getDayOfYear(
      startDate,
    )}&end_year=${today.getFullYear()}&end_day=${getDayOfYear(today)}`;

    setCellConcentration({
      status: 'pending',
      data: null,
    });

    // workaround for needing to proxy cyan from localhost
    const fetcher =
      window.location.hostname === 'localhost' ? proxyFetch : fetchCheck;

    fetcher(dataUrl, getSignal())
      .then((res: { data: { [date: string]: number[] } }) => {
        Object.entries(res.data).forEach(([date, values]) => {
          if (values.length !== 256) return;
          const epochDate = yearDayStringToEpoch(date);
          // Indices 0, 254, & 255 represent indetectable pixels
          if (epochDate !== null && newData.hasOwnProperty(epochDate)) {
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
        if (isAbort(err)) return;
        console.error(err);
        setCellConcentration({
          status: 'failure',
          data: null,
        });
      });
  }, [getSignal, attributes, today, services]);

  const [dates, setDates] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [initialDate, setInitialDate] = useState<number | null>(null);

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
    setInitialDate(newSelectedDate);
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

    const cyanImageLayer = mapView.map.findLayerById(
      layerId === 'surroundingCyanWaterbodies'
        ? 'surroundingCyanImages'
        : 'cyanImages',
    );
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

    const cyanImageSource =
      cyanImageLayer.source as __esri.LocalMediaElementSource;
    cyanImageSource.elements.removeAll();
    setImageStatus('pending');

    // workaround for needing to proxy cyan from localhost
    const fetcher =
      window.location.hostname === 'localhost' ? proxyFetch : fetchCheck;

    const imagePromise = fetcher(
      imageUrl,
      abortController.signal,
      undefined,
      'blob',
    );
    const propsPromise = fetcher(propertiesUrl, abortController.signal);
    Promise.all([imagePromise, propsPromise])
      .then(([blob, propsRes]) => {
        if (blob.type !== 'image/png') {
          setImageStatus('idle');
          return;
        }
        // read the image blob to convert it to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = function () {
          // convert the image to a base64 string
          const base64String = reader.result;
          const image = new Image();
          image.src = base64String?.toString() ?? '';

          image.onload = () => {
            setImageStatus('success');

            // create an extent and convert to web mercator for AGO support
            const geographicExtent = new Extent({
              spatialReference: SpatialReference.WGS84,
              xmin: propsRes.properties.x_min,
              xmax: propsRes.properties.x_max,
              ymin: propsRes.properties.y_min,
              ymax: propsRes.properties.y_max,
            });
            const webMercatorExtent = webMercatorUtils.geographicToWebMercator(
              geographicExtent,
            ) as __esri.Extent;

            // convert the extent to control points for AGO support
            const swCorner = {
              sourcePoint: { x: 0, y: image.height },
              mapPoint: new Point({
                x: webMercatorExtent.xmin,
                y: webMercatorExtent.ymin,
                spatialReference: webMercatorExtent.spatialReference,
              }),
            };
            const nwCorner = {
              sourcePoint: { x: 0, y: 0 },
              mapPoint: new Point({
                x: webMercatorExtent.xmin,
                y: webMercatorExtent.ymax,
                spatialReference: webMercatorExtent.spatialReference,
              }),
            };
            const neCorner = {
              sourcePoint: { x: image.width, y: 0 },
              mapPoint: new Point({
                x: webMercatorExtent.xmax,
                y: webMercatorExtent.ymax,
                spatialReference: webMercatorExtent.spatialReference,
              }),
            };
            const seCorner = {
              sourcePoint: { x: image.width, y: image.height },
              mapPoint: new Point({
                x: webMercatorExtent.xmax,
                y: webMercatorExtent.ymin,
                spatialReference: webMercatorExtent.spatialReference,
              }),
            };

            const geo = new ControlPointsGeoreference({
              controlPoints: [swCorner, nwCorner, neCorner, seCorner],
              width: image.width,
              height: image.height,
            });
            const imageElement = new ImageElement({
              image,
              georeference: geo,
            });
            cyanImageSource.elements.add(imageElement);
          };
        };
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
  }, [attributes, layerId, mapView, selectedDate, services]);

  // Remove the image when this component unmounts
  useEffect(() => {
    if (!mapView) return;

    const cyanImageLayer = mapView.map.findLayerById(
      layerId === 'surroundingCyanWaterbodies'
        ? 'surroundingCyanImages'
        : 'cyanImages',
    );
    if (!cyanImageLayer || !isMediaLayer(cyanImageLayer)) return;

    let popupVisibilityWatchHandle: __esri.WatchHandle | null = null;
    let popupFeaturesWatchHandle: __esri.WatchHandle | null = null;

    reactiveUtils
      .once(() => mapView.popup)
      .then(() => {
        // Remove the satellite image when the popup is closed
        popupVisibilityWatchHandle = reactiveUtils.watch(
          () => mapView.popup.visible,
          () => {
            if (mapView.popup.visible) return;
            mapView.popup.features.forEach((feature) => {
              if (
                feature.layer?.id === 'cyanWaterbodies' ||
                feature.layer?.id === 'surroundingCyanWaterbodies'
              ) {
                (
                  cyanImageLayer.source as __esri.LocalMediaElementSource
                ).elements.removeAll();
              }
            });
          },
        );

        // Remove the satellite image when a new location is clicked
        popupFeaturesWatchHandle = reactiveUtils.watch(
          () => mapView.popup.features,
          () => {
            (
              cyanImageLayer.source as __esri.LocalMediaElementSource
            ).elements.removeAll();
          },
        );
      });

    return function cleanup() {
      (
        cyanImageLayer.source as __esri.LocalMediaElementSource
      ).elements.removeAll();
      popupVisibilityWatchHandle?.remove();
      popupFeaturesWatchHandle?.remove();
    };
  }, [layerId, mapView]);

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

  const handleSliderChange = useCallback(
    (values: number[]) => setSelectedDate(values[0]),
    [],
  );

  // Calculate the total pixel area if there is cell concentration data
  let pixelArea = null;
  if (cellConcentration.status === 'pending') {
    pixelArea = <LoadingSpinner className="pixel-area-spinner" />;
  } else if (cellConcentration.status === 'success') {
    pixelArea = `${formatNumber(
      getAverageNonLandPixelArea(cellConcentration.data),
    )} mi${String.fromCodePoint(0x00b2)}`;
  }

  const tickList = dates.map((d) => ({
    label: epochToMonthDay(d),
    value: d,
  }));

  return (
    <>
      <div css={slimTextBoxStyles}>
        <ListContent
          rows={[
            {
              label: (
                <>
                  <HelpTooltip label="Total area within the light blue polygon shown on the map. This area is more precise than the colored “Satellite Image Pixel Area”, which includes some land within the waterbody border pixels." />
                  &nbsp;&nbsp; Waterbody Area
                </>
              ),
              value: attributes.AREASQKM
                ? `${formatNumber(
                    squareKmToSquareMi(attributes.AREASQKM),
                    2,
                  )} mi${String.fromCodePoint(0x00b2)}`
                : '',
            },
            {
              label: (
                <>
                  <HelpTooltip label="Total area of the satellite image for this waterbody. This is the sum of all pixels in the map image, where each pixel represents a 300m-by-300m area. This area is typically larger than the “Waterbody Area” because it includes waterbody border pixels, which are partially land and partially water." />
                  &nbsp;&nbsp; Satellite Image Pixel Area
                </>
              ),
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
                  legendTitle="Blue-Green Algae Concentration Categories:"
                  series={barChartData.series}
                  title={`Daily Blue-Green Algae Estimates for ${attributes.GNIS_NAME}`}
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
                <p css={paragraphStyles}>
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
            {initialDate && selectedDate ? (
              <>
                <div style={{ margin: '1em 0' }}>
                  <Slider
                    list={tickList}
                    min={dates[0]}
                    max={dates[dates.length - 1]}
                    onChange={handleSliderChange}
                    range={[initialDate]}
                    sliderVerticalBreak={250}
                    steps={null}
                    valueLabelDisplay="off"
                    headerElm={
                      <p css={subheadingStyles}>
                        <HelpTooltip
                          label={
                            <>
                              Adjust the slider handle to view the day's
                              blue-green algae satellite imagery on the map.
                              <br />
                              Data for the previous day typically becomes
                              available between 9 - 11am EST.
                            </>
                          }
                        />
                        &nbsp;&nbsp; Date Selection
                      </p>
                    }
                  />
                </div>

                {imageStatus === 'failure' && (
                  <p css={marginBoxStyles(errorBoxStyles)}>
                    There was an error retrieving the potential harmful algal
                    bloom satellite imagery for the selected day.
                  </p>
                )}

                <CyanDailyContent
                  cyanMetadata={cyanMetadata}
                  data={cellConcentration.data[selectedDate.toString()]}
                  epochDate={selectedDate}
                  waterbodyName={attributes.GNIS_NAME}
                />
              </>
            ) : (
              <p css={marginBoxStyles(infoBoxStyles)}>
                There is no measureable potential harmful algal bloom data from
                the past week for the {attributes.GNIS_NAME} waterbody.
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
                <GlossaryTerm term="Blue-Green Algae">
                  blue-green algae
                </GlossaryTerm>{' '}
                at the time of detection. These are provisional satellite
                derived measures of blue-green algae, which may contain errors.
                Information can be used to identify potential problems related
                to blue-green algae in larger lakes and reservoirs within the
                contiguous United States.
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
                  have a blue-green algae response that is not validated.
                </li>
                <li>
                  A resolvable waterbody is considered to have, at minimum, a
                  3x3 raster cell matrix size (900x900m), with the center pixel
                  being considered valid. Smaller or irregularly shaped
                  waterbodies (i.e., those not having the minimum 900x900m size)
                  may be evident in the data, and their blue-green algae
                  responses are suspect and open to interpretation. See{' '}
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
              Download Blue-Green Algae Data
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
  characteristicGroupMappings: CharacteristicGroupMappings,
  checkMappings: (
    characteristicGroupMappings: CharacteristicGroupMappings,
    groupName: string,
  ) => boolean,
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
      } else if (!checkMappings(characteristicGroupMappings, groupName)) {
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

function checkIfGroupInMapping(
  characteristicGroupMappings: CharacteristicGroupMappings,
  groupName: string,
): boolean {
  const result = characteristicGroupMappings.find((mapping) =>
    mapping.groupNames.includes(groupName),
  );
  return result ? true : false;
}

type MonitoringLocationsContentProps = {
  characteristicGroupMappings?: CharacteristicGroupMappingsState;
  feature: __esri.Graphic;
  services?: ServicesState;
};

type SelectedType = { [Property in keyof MappedGroups]: boolean };

function MonitoringLocationsContent({
  characteristicGroupMappings,
  feature,
  services,
}: Readonly<MonitoringLocationsContentProps>) {
  const [charGroupFilters, setCharGroupFilters] = useState('');
  const [selectAll, setSelectAll] = useState(1);
  const [totalDisplayedMeasurements, setTotalDisplayedMeasurements] = useState<
    number | null
  >(null);

  const layer = feature.layer;
  const attributes: MonitoringLocationAttributes = useMemo(() => {
    return parseAttributes<MonitoringLocationAttributes>(
      complexProps,
      feature.attributes,
    );
  }, [feature]);

  const {
    characteristicsByGroup,
    locationLatitude,
    locationLongitude,
    locationName,
    locationType,
    locationUrlPartial,
    orgId,
    orgName,
    siteId,
    providerName,
    totalSamples,
    totalsByGroup,
    totalMeasurements,
    totalsByCharacteristic,
    timeframe,
    uniqueId,
  } = attributes;

  const [groups, setGroups] = useState<MappedGroups | null>(null);
  const [selected, setSelected] = useState<SelectedType | null>(null);
  useEffect(() => {
    if (characteristicGroupMappings?.status !== 'success') return;

    const { newGroups, newSelected } = buildGroups(
      characteristicGroupMappings.data,
      checkIfGroupInMapping,
      totalsByGroup,
    );
    setGroups(newGroups);
    setSelected(newSelected);
    setSelectAll(1);
  }, [characteristicGroupMappings, totalsByGroup]);

  const buildFilter = useCallback(
    (selectedNames: SelectedType, monitoringLocationData: MappedGroups) => {
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
    if (!groups || !selected) return;
    buildFilter(selected, groups);
  }, [buildFilter, groups, selected]);

  useEffect(() => {
    setTotalDisplayedMeasurements(totalMeasurements);
  }, [totalMeasurements]);

  //Toggle an individual row and call the provided onChange event handler
  const toggleRow = (groupLabel: string, allGroups: Object) => {
    if (!groups || !selected) return;

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
      setTotalDisplayedMeasurements(totalMeasurements);
    }
    // if none selected
    else if (numberSelected === 0) {
      setSelectAll(0);
      setTotalDisplayedMeasurements(0);
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
      setTotalDisplayedMeasurements(newTotalMeasurementCount);
    }
  };

  //Toggle all rows and call the provided onChange event handler
  const toggleAllCheckboxes = () => {
    if (!groups) return;

    let selectedGroups: SelectedGroups = {};

    if (Object.keys(groups).length > 0) {
      const newValue = selectAll === 0 ? true : false;

      Object.keys(groups).forEach((key) => {
        selectedGroups[key] = newValue;
      });
    }

    setSelected(selectedGroups);
    setSelectAll(selectAll === 0 ? 1 : 0);
    setTotalDisplayedMeasurements(selectAll === 0 ? totalMeasurements : 0);
  };

  // The toggle table labels are groups of *other* groups of characteristics
  const [selectedGroupLabel, setSelectedGroupLabel] = useState('');
  const characteristicsDefaultData = () => ({
    characteristicsByGroup: {},
    totalsByCharacteristic: {},
  });
  const [characteristics, setCharacteristics] = useState<
    FetchStateWithDefault<{
      characteristicsByGroup: MonitoringLocationAttributes['characteristicsByGroup'];
      totalsByCharacteristic: MonitoringLocationAttributes['totalsByCharacteristic'];
    }>
  >({ status: 'idle', data: characteristicsDefaultData() });
  const [modalTriggered, setModalTriggered] = useState(false);
  useEffect(() => {
    if (!modalTriggered) return;
    if (characteristicGroupMappings?.status !== 'success') return;

    if (Object.keys(totalsByCharacteristic).length) {
      setCharacteristics({
        status: 'success',
        data: { characteristicsByGroup, totalsByCharacteristic },
      });
    } else {
      if (services?.status !== 'success') {
        setCharacteristics({
          status:
            services?.status === 'fetching'
              ? 'pending'
              : services?.status ?? 'failure',
          data: characteristicsDefaultData(),
        });
        return;
      }
      const url =
        `${services.data.waterQualityPortal.monitoringLocation}search?` +
        `&mimeType=csv&dataProfile=periodOfRecord&summaryYears=all&providers=${providerName}&organization=${orgId}&siteid=${siteId}`;
      setCharacteristics({
        status: 'pending',
        data: characteristicsDefaultData(),
      });
      fetchParseCsv(url)
        .then((records) => {
          const { sites } = structurePeriodOfRecordData(
            records,
            characteristicGroupMappings.data,
          );
          addAnnualData([attributes], sites);
          setCharacteristics({
            status: 'success',
            data: {
              characteristicsByGroup: attributes.characteristicsByGroup,
              totalsByCharacteristic: attributes.totalsByCharacteristic,
            },
          });
        })
        .catch((_err) => {
          setCharacteristics({
            status: 'failure',
            data: characteristicsDefaultData(),
          });
        });
    }
  }, [
    attributes,
    characteristicGroupMappings,
    characteristicsByGroup,
    modalTriggered,
    orgId,
    providerName,
    services,
    siteId,
    totalsByCharacteristic,
    uniqueId,
  ]);

  const innerGroups = groups?.[selectedGroupLabel]?.characteristicGroups ?? [];
  const groupCharacteristics = Object.entries(
    characteristics.data.totalsByCharacteristic,
  ).reduce((result, [charc, count]) => {
    for (let innerGroup of innerGroups) {
      if (
        characteristics.data.characteristicsByGroup[innerGroup]?.includes(charc)
      ) {
        return { ...result, [charc]: count };
      }
    }
    return result;
  }, {});

  // if a user has filtered out certain characteristic groups for
  // a given table, that'll be used as additional query string
  // parameters in the download URL string
  // (see setCharGroupFilters in Table's onChange handler)
  const downloadUrl =
    services?.status === 'success'
      ? `${services.data.waterQualityPortal.resultSearch}zip=no&siteid=` +
        `${siteId}&providers=${providerName}` +
        `${charGroupFilters}`
      : null;
  const portalUrl =
    services?.status === 'success'
      ? `${services.data.waterQualityPortal.userInterface}#` +
        `siteid=${siteId}${charGroupFilters}` +
        `&advanced=true&mimeType=xlsx&dataProfile=resultPhysChem` +
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
              label: 'Latitude/Longitude',
              value: `${toFixedFloat(locationLatitude, 5)}, ${toFixedFloat(
                locationLongitude,
                5,
              )}`,
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
                  {Number(totalSamples).toLocaleString()}
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
                  {Number(totalMeasurements).toLocaleString()}
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

      {(!groups || Object.keys(groups).length === 0) && (
        <p>No data available for this monitoring location.</p>
      )}

      {groups && Object.keys(groups).length > 0 && (
        <table
          aria-label="Characteristic Groups Summary"
          css={measurementTableStyles()}
          className="table"
        >
          <thead>
            <tr>
              <th css={checkboxCellStyles}>
                <input
                  aria-label="Toggle all characteristic groups"
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
              <th>
                <GlossaryTerm term="Characteristics">
                  Detailed Characteristics
                </GlossaryTerm>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groups).map((key) => {
              // ignore groups with 0 results
              if (groups?.[key].resultCount === 0) {
                return null;
              }
              return (
                <tr key={key}>
                  <td css={checkboxCellStyles}>
                    <input
                      aria-label={`Toggle ${key}`}
                      css={checkboxStyles}
                      type="checkbox"
                      className="checkbox"
                      checked={selected?.[key] === true || selectAll === 1}
                      onChange={(_ev) => {
                        toggleRow(key, groups);
                      }}
                    />
                  </td>
                  <td>{key}</td>
                  <td>{groups[key].resultCount.toLocaleString()}</td>
                  <td>
                    <Modal
                      label={`Detailed Characteristics for ${key}`}
                      maxWidth="36em"
                      triggerElm={
                        <button
                          aria-label={`View detailed characteristics for ${key}`}
                          title={`View detailed characteristics for ${key}`}
                          css={modifiedIconButtonStyles}
                          onClick={() => {
                            setSelectedGroupLabel(key);
                            setModalTriggered(true);
                          }}
                        >
                          <i aria-hidden className="fas fa-info-circle"></i>
                        </button>
                      }
                    >
                      <table css={modalTableStyles} className="table">
                        <thead>
                          <tr>
                            <th>
                              Detailed <em>{key}</em>{' '}
                              <GlossaryTerm term="Characteristics">
                                Characteristics
                              </GlossaryTerm>
                            </th>
                            <th style={{ width: '8em' }}>
                              Number of Measurements
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(groupCharacteristics).map(
                            ([charc, count]) => (
                              <tr key={charc}>
                                <td>{charc}</td>
                                <td>{(count as number).toLocaleString()}</td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                      {characteristics.status === 'pending' && (
                        <LoadingSpinner />
                      )}
                      {characteristics.status === 'failure' && (
                        <div css={errorBoxStyles}>
                          <p>
                            Detailed characteristics could not be retrieved at
                            this time, please try again later.
                          </p>
                        </div>
                      )}
                      {(!onMonitoringReportPage ||
                        layer.id === 'surroundingMonitoringLocationsLayer') && (
                        <p css={infoBoxStyles}>
                          For more information view the{' '}
                          <a
                            rel="noopener noreferrer"
                            target="_blank"
                            href={locationUrlPartial}
                          >
                            Water Monitoring Report
                          </a>{' '}
                          <small css={modifiedDisclaimerStyles}>
                            (opens new browser tab)
                          </small>
                          .
                        </p>
                      )}
                    </Modal>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td></td>
              <td>Total</td>
              <td>{Number(totalDisplayedMeasurements).toLocaleString()}</td>
              <td></td>
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
        <div css={paddedMarginBoxStyles(textBoxStyles)}>
          <a
            rel="noopener noreferrer"
            target="_blank"
            href={locationUrlPartial}
          >
            <i
              css={iconStyles}
              className="fas fa-file-alt"
              aria-hidden="true"
            />
            View Water Monitoring Report
          </a>
          &nbsp;&nbsp;
          <small css={modifiedDisclaimerStyles}>(opens new browser tab)</small>
        </div>
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
}: Readonly<UsgsStreamgagesContentProps>) {
  const {
    streamgageMeasurements,
    locationName,
    locationType,
    siteId,
    orgId,
    locationLatitude,
    locationLongitude,
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
              label: 'Organization Name',
              value: orgId,
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
              label: 'Latitude/Longitude',
              value: `${toFixedFloat(locationLatitude, 5)}, ${toFixedFloat(
                locationLongitude,
                5,
              )}`,
            },
            {
              label: <>Monitor&shy;ing Site ID</>,
              value: siteId,
            },
          ]}
          styles={listContentStyles}
        />
      </div>

      <table css={measurementTableStyles()} className="table">
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
}: Readonly<{
  url: string;
  data: StreamgageMeasurement;
}>) {
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
