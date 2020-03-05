// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// utilities
import { waterQualityPortal } from 'config/webServiceConfig';
import { impairmentFields, useFields } from 'config/attainsToHmwMapping';
import { getWaterbodyCondition } from 'components/pages/LocationMap/MapFunctions';
import { fetchCheck } from 'utils/fetchUtils';
// errors
import { monitoringError } from 'config/errorMessages';

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
  display: flex;
  align-items: center;
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

// --- components ---
type Props = {
  type: string,
  feature: ?Object,
  fieldName: ?string,
  isPopup: boolean,
  extraContent: ?Object,
};

function WaterbodyInfo({
  type,
  feature,
  fieldName,
  isPopup = false,
  extraContent,
}: Props) {
  const attributes = feature.attributes;
  const labelValue = (label, value, icon = null) => {
    if (isPopup) {
      return (
        <p>
          <strong>{label}: </strong>
          <br />
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

  const waterbodyContent = () => {
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

        {!onWaterbodyReportPage && (
          <p>
            <a
              rel="noopener noreferrer"
              target="_blank"
              href={
                `/waterbody-report/` +
                `${attributes.organizationid}/` +
                `${attributes.assessmentunitidentifier}`
              }
            >
              <Icon className="fas fa-file-alt" aria-hidden="true" />
              View Waterbody Report
            </a>
          </p>
        )}
      </>
    );
  };

  // jsx
  const waterbodyStateContent = (
    <>
      {labelValue(
        '303(d) Listed',
        attributes.on303dlist === 'Y' ? 'Yes' : 'No',
      )}
      {labelValue('TMDL', attributes.hastmdl === 'Y' ? 'Yes' : 'No')}

      {waterbodyContent()}
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
        </tbody>
      </table>
      <p>
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
      </p>
    </>
  );

  // Fetch monitoring location data
  const [monitoringLocation, setMonitoringLocation] = React.useState({
    status: 'fetching',
    data: [],
  });
  React.useEffect(() => {
    if (type !== 'Monitoring Location') return;

    const wqpUrl =
      `${waterQualityPortal.monitoringLocation}` +
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

        // build the table data
        const data = [];
        for (const groupName in groups) {
          data.push({
            characteristicGroup: groupName,
            resultCount: groups[groupName],
          });
        }
        setMonitoringLocation({
          status: 'success',
          data,
        });
      })
      .catch((err) => {
        console.error(err);
        setMonitoringLocation({
          status: 'failure',
          data: [],
        });
      });
  }, [attributes.MonitoringLocationIdentifier, attributes.ProviderName, type]);

  const [charGroupFilters, setCharGroupFilters] = React.useState('');
  const [selected, setSelected] = React.useState({});
  const [selectAll, setSelectAll] = React.useState(1);
  const monitoringContent = () => {
    const buildFilter = (selected) => {
      // build up filter text for the given table
      let filter = '';
      for (const name in selected) {
        if (selected[name]) filter += `&characteristicType=${name}`;
      }

      setCharGroupFilters(filter);
    };

    //Toggle an individual row and call the provided onChange event handler
    const toggleRow = (item: any) => {
      const newSelected = Object.assign({}, selected);
      newSelected[item] = !selected[item];

      buildFilter(newSelected);
      setSelected(newSelected);
      setSelectAll(2);
    };

    //Toggle all rows and call the provided onChange event handler
    const toggleSelectAll = () => {
      let newSelected = {};

      if (monitoringLocation.data.length > 0) {
        const newValue = selectAll === 0 ? true : false;

        monitoringLocation.data.forEach((x) => {
          newSelected[x.characteristicGroup] = newValue;
        });
      }

      setSelected(newSelected);
      setSelectAll(selectAll === 0 ? 1 : 0);
      if (selectAll === 0) setCharGroupFilters('');
    };

    // if a user has filtered out certain characteristic groups for
    // a given table, that'll be used as additional query string
    // parameters in the download URL string
    // (see setCharGroupFilters in Table's onChange handler)
    const downloadUrl =
      `${waterQualityPortal.resultSearch}zip=no&siteid=` +
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
              <td>{attributes.MonitoringLocationIdentifier.split('-')[1]}</td>
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
            {monitoringLocation.data.length === 0 && (
              <p>No data available for this monitoring location.</p>
            )}
            {monitoringLocation.data.length > 0 && (
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
                  {monitoringLocation.data.map((row, index) => {
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
                                selected[row.characteristicGroup] === true ||
                                selectAll === 1
                              }
                              onChange={() =>
                                toggleRow(row.characteristicGroup)
                              }
                            />
                          </CheckBoxContainer>
                        </td>
                        <td>{row.characteristicGroup}</td>
                        <td>{row.resultCount.toLocaleString()}</td>
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
        <p>
          <a
            rel="noopener noreferrer"
            target="_blank"
            href={
              waterQualityPortal.monitoringLocationDetails +
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
          <br />
          <a
            rel="noopener noreferrer"
            target="_blank"
            href="https://www.waterqualitydata.us/portal_userguide/"
          >
            <Icon className="fas fa-book-open" aria-hidden="true" />
            Water Quality Portal User Guide
          </a>
        </p>
      </>
    );
  };

  // Default popup for monitoring popups, when opened a listener will populate the popup with everything the Listview item has
  const monitoringMapPopupContent = () => {
    return <>No data available.</>;
  };

  // jsx
  // TODO: use table like monitoring stations and dischargers if we add nonprofits back
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
  // This content is filled in from the getPopupContent function in MapFunctions.
  const actionContent = <>{extraContent}</>;

  if (!attributes) return null;

  if (type === 'Waterbody') return waterbodyContent();
  if (type === 'Permitted Discharger') return dischargerContent;
  if (type === 'Monitoring Location Map Popup') {
    return monitoringMapPopupContent();
  }
  if (type === 'Monitoring Location') return monitoringContent();
  if (type === 'Nonprofit') return nonprofitContent;
  if (type === 'Waterbody State Overview') return waterbodyStateContent;
  if (type === 'Action') return actionContent;

  return null;
}

export default WaterbodyInfo;
