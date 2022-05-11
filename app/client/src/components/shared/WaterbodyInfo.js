// @flow

import React, { useState, useEffect } from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// utilities
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
import { getWaterbodyCondition } from 'utils/mapFunctions';
import { fetchCheck } from 'utils/fetchUtils';
import {
  convertAgencyCode,
  convertDomainCode,
  formatNumber,
  getSelectedCommunityTab,
  titleCaseWithExceptions,
} from 'utils/utils';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import { waterbodyReportError } from 'config/errorMessages';
// styles
import {
  colors,
  disclaimerStyles,
  downloadLinksStyles,
  iconStyles,
  modifiedTableStyles,
} from 'styles/index.js';

function bool(value) {
  // Return 'Yes' for truthy values and non-zero strings
  return value && parseInt(value, 10) ? 'Yes' : 'No';
}

function renderLink(label, link) {
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

function labelValue(label, value, icon = null) {
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

type Props = {
  type: string,
  feature: ?Object,
  fieldName: ?string,
  extraContent: ?Object,
  getClickedHuc: ?Function,
  resetData: ?Function,
  services: ?Object,
  fields: ?Object,
};

function WaterbodyInfo({
  type,
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  resetData,
  services,
  fields,
}: Props) {
  const { attributes } = feature;
  const onWaterbodyReportPage =
    window.location.pathname.indexOf('waterbody-report') !== -1;

  const waterbodyPollutionCategories = (label: string) => {
    const pollutionCategories = impairmentFields
      .filter((field) => attributes[field.value] === 'Cause')
      .sort((a, b) =>
        a.label.toUpperCase().localeCompare(b.label.toUpperCase()),
      )
      .map((field, index) => (
        <li key={index}>
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
    !onWaterbodyReportPage && attributes.organizationid ? (
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
    if (!fieldName && feature && feature.layer && feature.layer.renderer) {
      // For map clicks we need to get the field from the feature layer renderer.
      // This allows us to differentiate between fishconsumption_use and ecological_use
      // which are both on the fishing tab.
      field = feature.layer.renderer.field;
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
    const waterbodyConditions = useFields.map((field) => {
      return getWaterbodyCondition(attributes, field.value).label;
    });

    const applicableFields =
      waterbodyConditions.filter((value) => {
        return value !== 'Not Applicable';
      }) || [];

    const reportingCycle = attributes && attributes.reportingcycle;
    return (
      <>
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
                  {useFields.map((field, index) => {
                    const value = getWaterbodyCondition(
                      attributes,
                      field.value,
                    ).label;

                    if (value === 'Not Applicable') return null;
                    return (
                      <tr key={index}>
                        <td>{field.label}</td>
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
      <table css={modifiedTableStyles} className="table">
        <tbody>
          <tr>
            <td>
              <em>Compliance Status:</em>
            </td>
            <td>{attributes.CWPStatus}</td>
          </tr>
          <tr>
            <td>
              <em>Permit Status:</em>
            </td>
            <td>{attributes.CWPPermitStatusDesc}</td>
          </tr>
          <tr>
            <td>
              <em>Significant Effluent Violation within the last 3 years:</em>
            </td>
            <td>{hasEffluentViolations ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <td>
              <em>Inspection within the last 5 years:</em>
            </td>
            <td>{bool(attributes.CWPInspectionCount)}</td>
          </tr>
          <tr>
            <td>
              <em>Formal Enforcement Action in the last 5 years:</em>
            </td>
            <td>{bool(attributes.CWPFormalEaCnt)}</td>
          </tr>
          <tr>
            <td>
              <em>NPDES ID:</em>
            </td>
            <td>{attributes.SourceID}</td>
          </tr>
        </tbody>
      </table>

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

  function checkIfGroupInMapping(groupName) {
    return characteristicGroupMappings.find((mapping) =>
      mapping.groupNames.includes(groupName),
    );
  }

  const [charGroupFilters, setCharGroupFilters] = useState('');
  const [selected, setSelected] = useState({});
  const [selectAll, setSelectAll] = useState(1);

  function monitoringLocationsContent() {
    const stationGroups = JSON.parse(attributes.stationTotalsByCategory);

    const groups = { Other: { characteristicGroups: [], resultCount: 0 } };
    // get the feature where the provider matches this stations provider
    characteristicGroupMappings.forEach((mapping) => {
      for (const groupName in stationGroups) {
        if (
          mapping.groupNames.includes(groupName) &&
          !groups[mapping.label]?.characteristicGroups.includes(groupName)
        ) {
          // push to existing group
          if (groups[mapping.label]) {
            groups[mapping.label].characteristicGroups.push(groupName);
            groups[mapping.label].resultCount += stationGroups[groupName];
          }
          // create a new group
          else {
            groups[mapping.label] = {
              characteristicGroups: [groupName],
              resultCount: stationGroups[groupName],
            };
          }
        }
        // push to Other
        else if (
          !checkIfGroupInMapping(groupName) &&
          !groups['Other'].characteristicGroups.includes(groupName)
        ) {
          groups['Other'].characteristicGroups.push(groupName);
          groups['Other'].resultCount += stationGroups[groupName];
        }
      }
    });

    function buildFilter(selectedNames, monitoringLocationData) {
      let filter = '';

      for (const name in selectedNames) {
        if (selectedNames[name]) {
          filter +=
            '&characteristicType=' +
            monitoringLocationData[name].characteristicGroups.join(
              '&characteristicType=',
            );
        }
      }

      setCharGroupFilters(filter);
    }

    //Toggle an individual row and call the provided onChange event handler
    function toggleRow(mappedGroup: string, monitoringLocationData: Object) {
      const selectedGroups = { ...selected };

      selectedGroups[mappedGroup] = !selected[mappedGroup];

      buildFilter(selectedGroups, monitoringLocationData);
      setSelected(selectedGroups);

      // find the number of toggles currently true
      let numberSelected = 0;
      Object.values(selectedGroups).forEach((value) => {
        if (value) numberSelected++;
      });

      // total number of toggles displayed
      const totalSelections = Object.keys(monitoringLocationData).length;

      // if all selected
      if (numberSelected === totalSelections) {
        setSelectAll(1);
        setCharGroupFilters('');
      }
      // if none selected
      else if (numberSelected === 0) {
        setSelectAll(0);
        setCharGroupFilters('');
      }
      // if some selected
      else {
        setSelectAll(2);
      }
    }

    //Toggle all rows and call the provided onChange event handler
    function toggleAllCheckboxes() {
      let selectedGroups = {};

      if (Object.keys(groups).length > 0) {
        const newValue = selectAll === 0 ? true : false;

        Object.keys(groups).forEach((key) => {
          selectedGroups[key] = newValue;
        });
      }

      setSelected(selectedGroups);
      setSelectAll(selectAll === 0 ? 1 : 0);
      setCharGroupFilters('');
    }

    // if a user has filtered out certain characteristic groups for
    // a given table, that'll be used as additional query string
    // parameters in the download URL string
    // (see setCharGroupFilters in Table's onChange handler)
    const downloadUrl =
      `${services.data.waterQualityPortal.resultSearch}zip=no&siteid=` +
      `${attributes.siteId}&providers=${attributes.stationProviderName}` +
      `${charGroupFilters}`;
    const portalUrl =
      `${services.data.waterQualityPortal.userInterface}#` +
      `siteid=${attributes.siteId}${charGroupFilters}` +
      `&mimeType=xlsx&dataProfile=resultPhysChem` +
      `&providers=NWIS&providers=STEWARDS&providers=STORET`;

    return (
      <>
        <table css={modifiedTableStyles} className="table">
          <tbody>
            <tr>
              <td>
                <em>Organ&shy;ization Name:</em>
              </td>
              <td>{attributes.orgName}</td>
            </tr>
            <tr>
              <td>
                <em>Location Name:</em>
              </td>
              <td>{attributes.locationName}</td>
            </tr>
            <tr>
              <td>
                <em>Water Type:</em>
              </td>
              <td>{attributes.locationType}</td>
            </tr>
            <tr>
              <td>
                <em>Organization ID:</em>
              </td>
              <td>{attributes.orgId}</td>
            </tr>
            <tr>
              <td>
                <em>Monitor&shy;ing Site ID:</em>
              </td>
              <td>{attributes.siteId.replace(`${attributes.orgId}-`, '')}</td>
            </tr>
            <tr>
              <td>
                <em>
                  <GlossaryTerm term="Monitoring Samples">
                    Monitor&shy;ing Samples:
                  </GlossaryTerm>
                </em>
              </td>
              <td>{Number(attributes.stationTotalSamples).toLocaleString()}</td>
            </tr>
            <tr>
              <td>
                <em>
                  <GlossaryTerm term="Monitoring Measurements">
                    Monitor&shy;ing Measure&shy;ments:
                  </GlossaryTerm>
                </em>
              </td>
              <td>
                {Number(attributes.stationTotalMeasurements).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          <strong>Download Monitoring Data:</strong>
        </p>

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
                    onChange={(ev) => toggleAllCheckboxes()}
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
              {Object.keys(groups).map((key, index) => {
                // ignore groups with 0 results
                if (groups[key].resultCount === 0) {
                  return null;
                }

                return (
                  <tr key={index}>
                    <td css={checkboxCellStyles}>
                      <input
                        css={checkboxStyles}
                        type="checkbox"
                        className="checkbox"
                        checked={selected[key] === true || selectAll === 1}
                        onChange={(ev) => {
                          toggleRow(key, groups);
                        }}
                      />
                    </td>
                    <td>{key}</td>
                    <td>{groups[key].resultCount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <p css={downloadLinksStyles}>
          <span>Data Download Format:</span>
          &nbsp;
          <a href={`${downloadUrl}&mimeType=xlsx`}>
            <i
              css={iconStyles}
              className="fas fa-file-excel"
              aria-hidden="true"
            />
            xls
          </a>
          <a href={`${downloadUrl}&mimeType=csv`}>
            <i
              css={iconStyles}
              className="fas fa-file-csv"
              aria-hidden="true"
            />
            csv
          </a>
        </p>

        <p>
          <a
            rel="noopener noreferrer"
            target="_blank"
            href={attributes.locationUrl}
          >
            <i
              css={iconStyles}
              className="fas fa-info-circle"
              aria-hidden="true"
            />
            More Information
          </a>
          &nbsp;&nbsp;
          <small css={disclaimerStyles}>(opens new browser tab)</small>
          <br />
          <a rel="noopener noreferrer" target="_blank" href={portalUrl}>
            <i css={iconStyles} className="fas fa-filter" aria-hidden="true" />
            Filter this data using the <em>Water Quality Portal</em> form
          </a>
          &nbsp;&nbsp;
          <small css={disclaimerStyles}>(opens new browser tab)</small>
        </p>
      </>
    );
  }

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
      <table css={modifiedTableStyles} className="table">
        <tbody>
          <tr>
            <td>
              <em>Watershed Name:</em>
            </td>
            <td>{attributes.NAME_HUC12}</td>
          </tr>
          <tr>
            <td>
              <em>Watershed:</em>
            </td>
            <td>{attributes.HUC12_TEXT}</td>
          </tr>
          <tr>
            <td>
              <em>State:</em>
            </td>
            <td>{attributes.STATES_ALL}</td>
          </tr>
          <tr>
            <td>
              <em>Watershed Health Score:</em>
            </td>
            <td>({Math.round(attributes.PHWA_HEALTH_NDX_ST * 100) / 100})</td>
          </tr>
        </tbody>
      </table>
    </>
  );

  // jsx
  const alaskaNativeVillageContent = labelValue(
    'Village Name',
    attributes.NAME,
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
  const [attainsProjects, setAttainsProjects] = useState({
    status: 'fetching',
    data: [],
  });
  useEffect(() => {
    if (type !== 'Restoration Plans' && type !== 'Protection Plans') return;

    const auId = attributes.assessmentunitidentifier;
    const url =
      services.data.attains.serviceUrl +
      `actions?assessmentUnitIdentifier=${auId}` +
      `&organizationIdentifier=${attributes.organizationid}` +
      `&summarize=Y`;

    fetchCheck(url)
      .then((res) => {
        let attainsProjectsData = [];

        if (res.items.length > 0) {
          attainsProjectsData = res.items[0].actions.map((action) => {
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
          });
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
          {(attainsProjects.status === 'fetching' ||
            attainsProjects.status === 'pending') && <LoadingSpinner />}
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
                        <th>Type</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((action, index) => {
                          return (
                            <tr key={index}>
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
  if (type === 'Current Water Conditions') {
    content = <UsgsStreamgagesContent feature={feature} />;
  }
  if (type === 'Sample Location') content = monitoringLocationsContent();
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

  return content;
}

function MapPopup({
  type,
  feature,
  fieldName,
  extraContent,
  getClickedHuc,
  resetData,
  services,
  fields,
}: Props) {
  // Gets the response of what huc was clicked, if provided.
  const [clickedHuc, setClickedHuc] = useState<{
    status: 'none' | 'fetching' | 'success' | 'failure',
    data: { huc12: any, watershed: any } | null,
  }>({ status: 'none', data: null });

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

  const getTypeTitle = () => {
    const typesToSkip = [
      'Action',
      'Change Location',
      'Waterbody State Overview',
    ];
    if (typesToSkip.includes(type)) return null;

    let title = type;
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
                    onClick={(ev) => {
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
                        window.location.assign(`${baseRoute}/${urlParts[3]}`);
                        return;
                      }

                      window.location.assign(`${baseRoute}/overview`);
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

      {getTypeTitle()}

      <div css={popupContentStyles}>
        <WaterbodyInfo
          type={type}
          feature={feature}
          fieldName={fieldName}
          extraContent={extraContent}
          getClickedHuc={getClickedHuc}
          resetData={resetData}
          services={services}
          fields={fields}
        />
      </div>
    </div>
  );
}

function UsgsStreamgagesContent({ feature }: { feature: Object }) {
  const {
    streamgageMeasurements,
    orgName,
    locationName,
    locationType,
    siteId,
    orgId,
    locationUrl,
  } = feature.attributes;

  const [additionalMeasurementsShown, setAdditionalMeasurementsShown] =
    useState(false);

  function addUniqueMeasurement(measurement, array) {
    const measurementAlreadyAdded = array.find((m) => {
      return m.parameterCode === measurement.parameterCode;
    });

    if (measurementAlreadyAdded) {
      measurementAlreadyAdded.multiple = true;
    } else {
      array.push({ ...measurement });
    }
  }

  const primaryMeasurements = [];
  const secondaryMeasurements = [];

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

  return (
    <>
      <table css={modifiedTableStyles} className="table">
        <tbody>
          <tr>
            <td>
              <em>Organ&shy;ization Name:</em>
            </td>
            <td>{orgName}</td>
          </tr>
          <tr>
            <td>
              <em>Locat&shy;ion Name:</em>
            </td>
            <td>{locationName}</td>
          </tr>
          <tr>
            <td>
              <em>Water Type:</em>
            </td>
            <td>{locationType}</td>
          </tr>
          <tr>
            <td>
              <em>Organization ID:</em>
            </td>
            <td>{orgId}</td>
          </tr>
          <tr>
            <td>
              <em>Monitor&shy;ing Site ID:</em>
            </td>
            <td>{siteId.replace(`${orgId}-`, '')}</td>
          </tr>
        </tbody>
      </table>

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
                    onClick={(ev) => {
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

      <p>
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
    </>
  );
}

function UsgsStreamgageParameter({ url, data }) {
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
          <>
            <strong>{data.measurement}</strong>
            &nbsp;
            <small title={data.unitName}>{data.unitAbbr}</small>
            <br />
            <small css={additionalTextStyles}>{data.datetime}</small>
          </>
        )}
      </td>
    </tr>
  );
}

export default WaterbodyInfo;

export { MapPopup };
