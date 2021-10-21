// @flow

import React from 'react';
import styled from 'styled-components';
import { navigate } from '@reach/router';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// utilities
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
import { getWaterbodyCondition } from 'components/pages/LocationMap/MapFunctions';
import {
  formatNumber,
  convertAgencyCode,
  convertDomainCode,
} from 'utils/utils';
import { fetchCheck } from 'utils/fetchUtils';
// data
import { characteristicGroupMappings } from 'config/characteristicGroupMappings';
// errors
import { monitoringError } from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';

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

//
const CheckBox = styled.input`
  -webkit-appearance: checkbox;
  appearance: checkbox;
  transform: scale(1.2);
`;

const CheckBoxContainer = styled.div`
  padding-top: 2px;
  padding-left: 1px;
`;

const DownloadLinks = styled.div`
  margin-top: 0.5em;

  a {
    margin-left: 0.5em;
  }
`;

const Icon = styled.i`
  margin-right: 5px;
`;

const IconValue = styled.span`
  display: inline-block;
`;

const Table = styled.table`
  th:last-of-type,
  td:last-of-type {
    text-align: right;
  }
`;

const TextBottomPadding = styled.p`
  padding-bottom: 0.5em;
`;

const NewTabDisclaimer = styled.div`
  display: inline-block;
  padding-bottom: 1.5em;
`;

const ButtonContainer = styled.div`
  text-align: center;
`;

const ChangeLocationButton = styled.button`
  font-size: 0.9375em;
  color: ${colors.white()};
  background-color: ${colors.blue()};
`;

const CancelChangeLocationButton = styled.button`
  margin-right: 15px;
  font-size: 0.9375em;
  background-color: lightgray;
`;

const ScenicRiverImageContainer = styled.div`
  padding: 1rem;
`;

const ScenicRiverImage = styled.img`
  width: 100%;
  height: auto;
`;

// --- components ---
type Props = {
  type: string,
  feature: ?Object,
  fieldName: ?string,
  isPopup: boolean,
  extraContent: ?Object,
  location: ?Object,
  resetData: ?Function,
  services: ?Object,
  fields: ?Object,
};

function WaterbodyInfo({
  type,
  feature,
  fieldName,
  isPopup = false,
  extraContent,
  getClickedHuc,
  resetData,
  services,
  fields,
}: Props) {
  // Gets the response of what huc was clicked, if provided.
  const [clickedHuc, setClickedHuc] = React.useState({
    status: 'none',
    data: null,
  });
  React.useEffect(() => {
    if (!getClickedHuc || clickedHuc.status !== 'none') return;

    setClickedHuc({
      status: 'fetching',
      data: null,
    });

    getClickedHuc
      .then((res) => {
        setClickedHuc(res);
      })
      .catch((err) => {
        console.error(err);
        setClickedHuc({
          status: 'failure',
          data: null,
        });
      });
  }, [getClickedHuc, clickedHuc]);

  const attributes = feature.attributes;

  const labelValue = (label, value, icon = null) => {
    if (isPopup) {
      return (
        <p>
          <strong>{label}: </strong>
          {icon ? (
            <IconValue>
              {icon} {value}
            </IconValue>
          ) : (
            value
          )}
        </p>
      );
    }

    return (
      <TextBottomPadding>
        <strong>{label}: </strong>
        {value}
      </TextBottomPadding>
    );
  };

  const renderChangeWatershed = () => {
    if (!clickedHuc) return null;
    if (clickedHuc.status === 'no-data') return <p>No Data</p>;
    if (clickedHuc.status === 'fetching') return <LoadingSpinner />;
    if (clickedHuc.status === 'failure') return <p>Web service error</p>;
    if (clickedHuc.status === 'success') {
      const huc12 = clickedHuc.data.huc12;
      const watershed = clickedHuc.data.watershed;
      return (
        <>
          {type !== 'Change Location' && (
            <>
              <hr />
              <strong>Change to this location?</strong>
              <br />
            </>
          )}
          {labelValue('WATERSHED', `${watershed} (${huc12})`)}
          <ButtonContainer>
            {type === 'Change Location' && (
              <CancelChangeLocationButton
                title=""
                className="btn"
                onClick={(ev) => {
                  if (!feature?.view) return;

                  feature.view.popup.close();
                }}
              >
                No
              </CancelChangeLocationButton>
            )}
            <ChangeLocationButton
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
                if (urlParts.includes('community') && urlParts.length > 3) {
                  navigate(`${baseRoute}/${urlParts[3]}`);
                  return;
                }

                navigate(`${baseRoute}/overview`);
              }}
            >
              Yes
            </ChangeLocationButton>
          </ButtonContainer>
        </>
      );
    }

    return null;
  };

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
        <strong>{label}: </strong>
        <ul>{pollutionCategories}</ul>
      </>
    );
  };

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

    const onWaterbodyReportPage =
      window.location.pathname.indexOf('waterbody-report') !== -1;

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
          <TextBottomPadding>
            <strong>Year Last Reported: </strong>
            {reportingCycle}
          </TextBottomPadding>
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
          <TextBottomPadding>
            <strong>Organization Name (ID): </strong>
            {`${attributes.organizationname} (${attributes.organizationid})`}
          </TextBottomPadding>
        )}

        {useLabel === 'Waterbody' && (
          <>
            {applicableFields.length === 0 && (
              <p>No evaluated use provided for this waterbody.</p>
            )}

            {applicableFields.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Evaluated Use</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {useFields.map((field, index) => {
                    const value = getWaterbodyCondition(attributes, field.value)
                      .label;

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
          ? waterbodyPollutionCategories(
              'Impairment Categories were identified',
            )
          : ''}

        {!onWaterbodyReportPage && attributes.organizationid ? (
          <div>
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
              <Icon className="fas fa-file-alt" aria-hidden="true" />
              View Waterbody Report
            </a>
            &nbsp;&nbsp;
            <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
          </div>
        ) : (
          <p>Unable to find a waterbody report for this waterbody.</p>
        )}
      </>
    );
  };

  // jsx
  const waterbodyContent = (
    <>
      {baseWaterbodyContent()}

      {renderChangeWatershed()}
    </>
  );

  // jsx
  const waterbodyStateContent = (
    <>
      {labelValue(
        '303(d) Listed',
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
      <table className="table">
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
      <div>
        <a
          href={
            `https://echo.epa.gov/detailed-facility-report` +
            `?fid=${attributes.RegistryID}`
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon className="fas fa-file-alt" aria-hidden="true" />
          <span>Facility Report</span>
        </a>
        &nbsp;&nbsp;
        <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
      </div>
    </>
  );

  function checkIfGroupInMapping(groupName) {
    return characteristicGroupMappings.find((mapping) =>
      mapping.groupNames.includes(groupName),
    );
  }

  const [charGroupFilters, setCharGroupFilters] = React.useState('');
  const [selected, setSelected] = React.useState({});
  const [selectAll, setSelectAll] = React.useState(1);

  // Fetch monitoring location data
  const [monitoringLocation, setMonitoringLocation] = React.useState({
    status: 'fetching',
    data: [],
  });
  React.useEffect(() => {
    if (type !== 'Monitoring Location') return;

    const wqpUrl =
      `${services.data.waterQualityPortal.monitoringLocation}` +
      `search?mimeType=geojson&zip=no&siteid=` +
      `${attributes.MonitoringLocationIdentifier}`;

    fetchCheck(wqpUrl)
      .then((res) => {
        const fieldName = 'characteristicGroupResultCount';

        // get the feature where the provider matches this stations provider
        // default to the first feature
        let groups = res.features[0].properties[fieldName];
        res.features.forEach((feature) => {
          if (feature.properties.ProviderName === attributes.ProviderName) {
            groups = feature.properties[fieldName];
          }
        });

        const monitoringStationGroups = {
          Other: { characteristicGroups: [], resultCount: 0 },
        };

        characteristicGroupMappings.forEach((mapping) => {
          for (const groupName in groups) {
            if (
              mapping.groupNames.includes(groupName) &&
              !monitoringStationGroups[
                mapping.label
              ]?.characteristicGroups.includes(groupName)
            ) {
              // push to existing group
              if (monitoringStationGroups[mapping.label]) {
                monitoringStationGroups[
                  mapping.label
                ].characteristicGroups.push(groupName);
                monitoringStationGroups[mapping.label].resultCount +=
                  groups[groupName];
              }
              // create a new group
              else {
                monitoringStationGroups[mapping.label] = {
                  characteristicGroups: [groupName],
                  resultCount: groups[groupName],
                };
              }
            }
            // push to Other
            else if (
              !checkIfGroupInMapping(groupName) &&
              !monitoringStationGroups['Other'].characteristicGroups.includes(
                groupName,
              )
            ) {
              monitoringStationGroups['Other'].characteristicGroups.push(
                groupName,
              );
              monitoringStationGroups['Other'].resultCount += groups[groupName];
            }
          }
        });

        setMonitoringLocation({
          status: 'success',
          data: monitoringStationGroups,
        });

        // initialize all options in selected to true
        const newSelected = {};
        Object.keys(monitoringStationGroups).forEach((key) => {
          newSelected[key] = true;
        });
        setSelected(newSelected);
      })
      .catch((err) => {
        console.error(err);
        setMonitoringLocation({
          status: 'failure',
          data: [],
        });
      });
  }, [
    attributes.MonitoringLocationIdentifier,
    attributes.ProviderName,
    type,
    services,
    setSelected,
  ]);

  const monitoringContent = () => {
    const buildFilter = (
      selectedNames: Object,
      monitoringLocationData: Object,
    ) => {
      // build up filter text for the given table
      let filter = '';

      for (const name in selectedNames) {
        if (selectedNames[name]) {
          const joinedGroupnames =
            '&characteristicType=' +
            monitoringLocationData[name].characteristicGroups.join(
              '&characteristicType=',
            );
          filter += joinedGroupnames;
        }
      }

      setCharGroupFilters(filter);
    };

    //Toggle an individual row and call the provided onChange event handler
    const toggleRow = (mappedGroup: string, monitoringLocationData: Object) => {
      const newSelected = Object.assign({}, selected);

      newSelected[mappedGroup] = !selected[mappedGroup];

      buildFilter(newSelected, monitoringLocationData);
      setSelected(newSelected);

      // find the number of toggles currently true
      let numberSelected = 0;
      Object.values(newSelected).forEach((value) => {
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
    };

    //Toggle all rows and call the provided onChange event handler
    const toggleSelectAll = () => {
      let newSelected = {};

      if (Object.keys(monitoringLocation.data).length > 0) {
        const newValue = selectAll === 0 ? true : false;

        Object.keys(monitoringLocation.data).forEach((key) => {
          newSelected[key] = newValue;
        });
      }

      setSelected(newSelected);
      setSelectAll(selectAll === 0 ? 1 : 0);
      setCharGroupFilters('');
    };

    // if a user has filtered out certain characteristic groups for
    // a given table, that'll be used as additional query string
    // parameters in the download URL string
    // (see setCharGroupFilters in Table's onChange handler)
    const downloadUrl =
      `${services.data.waterQualityPortal.resultSearch}zip=no&siteid=` +
      `${attributes.MonitoringLocationIdentifier}&providers=` +
      `${attributes.ProviderName}` +
      `${charGroupFilters}`;

    return (
      <>
        <table className="table">
          <tbody>
            <tr>
              <td>
                <em>Organization:</em>
              </td>
              <td>{attributes.OrganizationFormalName}</td>
            </tr>
            <tr>
              <td>
                <em>Location Name:</em>
              </td>
              <td>{attributes.MonitoringLocationName}</td>
            </tr>
            <tr>
              <td>
                <em>Monitoring Location Type:</em>
              </td>
              <td>{attributes.MonitoringLocationTypeName}</td>
            </tr>
            <tr>
              <td>
                <em>Monitoring Site ID:</em>
              </td>
              <td>
                {attributes.MonitoringLocationIdentifier.replace(
                  `${attributes.OrganizationIdentifier}-`,
                  '',
                )}
              </td>
            </tr>
            <tr>
              <td>
                <em>
                  <GlossaryTerm term={'Monitoring Samples'}>
                    Monitoring Samples:
                  </GlossaryTerm>
                </em>
              </td>
              <td>{Number(attributes.activityCount).toLocaleString()}</td>
            </tr>
            <tr>
              <td>
                <em>
                  <GlossaryTerm term={'Monitoring Measurements'}>
                    Monitoring Measurements:
                  </GlossaryTerm>
                </em>
              </td>
              <td>{Number(attributes.resultCount).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <p>
          <strong>Download Monitoring Data:</strong>
        </p>
        {monitoringLocation.status === 'fetching' && <LoadingSpinner />}

        {monitoringLocation.status === 'failure' && (
          <StyledErrorBox>
            <p>{monitoringError}</p>
          </StyledErrorBox>
        )}

        {monitoringLocation.status === 'success' && (
          <>
            {Object.keys(monitoringLocation.data).length === 0 && (
              <p>No data available for this monitoring location.</p>
            )}
            {Object.keys(monitoringLocation.data).length > 0 && (
              <Table className="table">
                <thead>
                  <tr>
                    <th
                      style={{ textAlign: 'center', verticalAlign: 'middle' }}
                    >
                      <CheckBoxContainer>
                        <CheckBox
                          type="checkbox"
                          className="checkbox"
                          checked={selectAll === 1}
                          ref={(input) => {
                            if (input) {
                              input.indeterminate = selectAll === 2;
                            }
                          }}
                          onChange={toggleSelectAll}
                        />
                      </CheckBoxContainer>
                    </th>
                    <th>
                      <GlossaryTerm term={'Characteristic Group'}>
                        Characteristic Group
                      </GlossaryTerm>{' '}
                    </th>
                    <th>
                      <GlossaryTerm term={'Monitoring Measurements'}>
                        Number of Measurements
                      </GlossaryTerm>{' '}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(monitoringLocation.data).map((key, index) => {
                    // ignore groups with 0 results
                    if (monitoringLocation.data[key].resultCount === 0)
                      return null;

                    return (
                      <tr key={index}>
                        <td
                          style={{
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}
                        >
                          <CheckBoxContainer>
                            <CheckBox
                              type="checkbox"
                              className="checkbox"
                              checked={
                                selected[key] === true || selectAll === 1
                              }
                              onChange={() =>
                                toggleRow(key, monitoringLocation.data)
                              }
                            />
                          </CheckBoxContainer>
                        </td>
                        <td>{key}</td>
                        <td>
                          {monitoringLocation.data[
                            key
                          ].resultCount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </>
        )}
        <DownloadLinks>
          <p>
            <strong>Data Download Format:</strong>
            <a href={`${downloadUrl}&mimeType=xlsx`}>
              <Icon className="fas fa-file-excel" aria-hidden="true" />
              xls
            </a>
            <a href={`${downloadUrl}&mimeType=csv`}>
              <Icon className="fas fa-file-csv" aria-hidden="true" />
              csv
            </a>
          </p>
        </DownloadLinks>
        <div>
          <a
            rel="noopener noreferrer"
            target="_blank"
            href={
              services.data.waterQualityPortal.monitoringLocationDetails +
              attributes.ProviderName +
              '/' +
              attributes.OrganizationIdentifier +
              '/' +
              attributes.MonitoringLocationIdentifier +
              '/'
            }
          >
            <Icon className="fas fa-info-circle" aria-hidden="true" />
            More Information
          </a>
          &nbsp;&nbsp;
          <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
          <br />
          <a
            rel="noopener noreferrer"
            target="_blank"
            href="https://www.waterqualitydata.us/portal_userguide/"
          >
            <Icon className="fas fa-book-open" aria-hidden="true" />
            Water Quality Portal User Guide
          </a>
          &nbsp;&nbsp;
          <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
        </div>
      </>
    );
  };

  // Default popup for monitoring popups, when opened a listener will populate the popup with everything the Listview item has
  const monitoringMapPopupContent = () => {
    return <>No data available.</>;
  };

  // jsx
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

        {renderChangeWatershed()}
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

        {renderChangeWatershed()}
      </>
    );
  };

  // jsx
  const tribeContent = (
    <>
      {labelValue('Tribe Name', attributes.TRIBE_NAME)}

      {renderChangeWatershed()}
    </>
  );

  // jsx
  const upstreamWatershedContent = (
    <>
      {labelValue(
        'Area',
        attributes.areasqkm && `${formatNumber(attributes.areasqkm)} sq. km.`,
      )}

      {renderChangeWatershed()}
    </>
  );

  // jsx
  const wildScenicRiversContent = (
    <>
      {attributes.PhotoLink && attributes.PhotoCredit && (
        <>
          <ScenicRiverImageContainer>
            <ScenicRiverImage
              src={attributes.PhotoLink}
              alt="Wild and Scenic River"
            ></ScenicRiverImage>
            <br />
            <em>Photo Credit: {attributes.PhotoCredit}</em>
          </ScenicRiverImageContainer>
        </>
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
      <div>
        <a rel="noopener noreferrer" target="_blank" href={attributes.WEBLINK}>
          <Icon className="fas fa-info-circle" aria-hidden="true" />
          More Information
        </a>{' '}
        <NewTabDisclaimer>(opens new browser tab)</NewTabDisclaimer>
      </div>
    </>
  );

  // jsx
  const wsioContent = (
    <>
      <table className="table">
        <tbody>
          <tr>
            <td>
              <em>Watershed Name:</em>
            </td>
            <td>{attributes.name_huc12}</td>
          </tr>
          <tr>
            <td>
              <em>Watershed:</em>
            </td>
            <td>{attributes.huc12_text}</td>
          </tr>
          <tr>
            <td>
              <em>State:</em>
            </td>
            <td>{attributes.states2013}</td>
          </tr>
          <tr>
            <td>
              <em>Watershed Health Score:</em>
            </td>
            <td>
              ({Math.round(attributes.phwa_health_ndx_st_2016 * 100) / 100})
            </td>
          </tr>
        </tbody>
      </table>
      {renderChangeWatershed()}
    </>
  );

  // jsx
  const alaskaNativeVillageContent = (
    <>
      {labelValue('Village Name', attributes.NAME)}

      {renderChangeWatershed()}
    </>
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
        convertDomainCode(fields, 'Access', attributes.Access),
      )}
      {renderChangeWatershed()}
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
      {renderChangeWatershed()}
    </>
  );

  // jsx
  const changeLocationContent = renderChangeWatershed();

  // jsx
  // This content is filled in from the getPopupContent function in MapFunctions.
  const actionContent = <>{extraContent}</>;

  if (!attributes) return null;

  if (type === 'Waterbody') return waterbodyContent;
  if (type === 'Permitted Discharger') return dischargerContent;
  if (type === 'Monitoring Location Map Popup') {
    return monitoringMapPopupContent();
  }
  if (type === 'Monitoring Location') return monitoringContent();
  if (type === 'Nonprofit') return nonprofitContent;
  if (type === 'Waterbody State Overview') return waterbodyStateContent;
  if (type === 'Action') return actionContent;
  if (type === 'County') return countyContent();
  if (type === 'Congressional District') return congressionalDistrictContent();
  if (type === 'Tribe') return tribeContent;
  if (type === 'Upstream Watershed') return upstreamWatershedContent;
  if (type === 'Wild and Scenic Rivers') return wildScenicRiversContent;
  if (type === 'State Watershed Health Index') return wsioContent;
  if (type === 'Alaska Native Village') return alaskaNativeVillageContent;
  if (type === 'Change Location') return changeLocationContent;
  if (type === 'Protected Areas') return protectedAreaContent;
  if (type === 'Demographic Indicators') return ejscreenContent;

  return null;
}

export default WaterbodyInfo;
