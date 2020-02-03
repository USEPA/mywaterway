// @flow

import React from 'react';
import styled from 'styled-components';
import ReactTable from 'react-table';
// components
import type { RouteProps } from 'routes.js';
import Page from 'components/shared/Page';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
// config
import { attains } from 'config/webServiceConfig';
// data
import { impairmentFields } from 'config/attainsToHmwMapping';
// styles
import 'styles/react-table.css';
// errors
import { attainsParameterServiceError } from 'config/errorMessages';

function compareContextName(objA, objB) {
  return objA['context'].localeCompare(objB['context']);
}

function getMatchingLabel(ATTAINSContext) {
  return impairmentFields.filter((field) => {
    return field.parameterGroup === ATTAINSContext;
  })[0].label;
}

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  a {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1.25em;
    line-height: 1.125;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    a {
      font-size: 1.375em;
    }

    hr {
      margin-top: 2rem;
    }
  }
`;

const ErrorBox = styled(StyledErrorBox)`
  margin: 1.25rem;
`;

// --- components ---
type Props = {
  ...RouteProps,
};

function Attains({ ...props }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [serviceError, setServiceError] = React.useState(false);
  const [attainsData, setAttainsData] = React.useState(null);
  const [matchedMappings, setMatchedMappings] = React.useState([]);

  React.useEffect(() => {
    const url = attains.serviceUrl + 'domains?domainName=ParameterName';

    fetchCheck(url)
      .then((res) => {
        setLoading(false);
        setAttainsData(res.sort(compareContextName)); // sorted alphabetically by ATTAINS context
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setServiceError(true);
      });
  }, []);

  React.useEffect(
    () => {
      // array of arrays - each containing 3 values: the HMW mapping, the ATTAINS context, and the ATTAINS name
      // i.e. ["Excess Algae", "ALGAL GROWTH", "EXCESS ALGAL GROWTH"]
      setMatchedMappings(
        attainsData &&
          attainsData.map((obj) => {
            return {
              hmwMapping: getMatchingLabel(obj.context),
              attainsParameterGroup: obj.context,
              attainsParameterName: obj.name,
            };
          }),
      );
    },
    [attainsData],
  );

  if (serviceError) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <ErrorBox>
          <p>{attainsParameterServiceError}</p>
        </ErrorBox>
      </Page>
    );
  }

  // if loading or matching the entries. prevents a flicker of an empty screen while table loads
  if (loading || !matchedMappings) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <LoadingSpinner />
      </Page>
    );
  }

  const generateFilterInput = (filter, onChange) => (
    <input
      type="text"
      placeholder="Filter column..."
      style={{ width: '100%' }}
      value={filter ? filter.value : ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );

  const createCustomFilter = (filter, row, id) =>
    row._original[id].toLowerCase().includes(filter.value.toLowerCase());

  return (
    <Page>
      <NavBar title="ATTAINS Information" />
      <Container className="container">
        <p>
          This page provides a way to compare How’s My Waterway{' '}
          <GlossaryTerm term="Impairment Categories">
            Impairment Categories
          </GlossaryTerm>{' '}
          to ATTAINS{' '}
          <GlossaryTerm term="Parameter Group">Parameter Groups</GlossaryTerm>{' '}
          and ATTAINS{' '}
          <GlossaryTerm term="Parameter Name">Parameter Names</GlossaryTerm>.
          States submit parameter names to EPA which are then put into groups
          with similar parameters. How’s My Waterway takes these parameter
          groups and converts them to public friendly impairment categories. On
          the individual waterbody report pages in How’s My Waterway you will be
          able to find which original parameter name was submitted for a
          specific waterbody.
        </p>
        <br />

        {matchedMappings && (
          <ReactTable
            data={matchedMappings}
            columns={[
              {
                Header: '',
                columns: [
                  {
                    Header: "How's My Waterway Impairment Category",
                    accessor: 'hmwMapping',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'hmwMapping'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                  {
                    id: 'parameterGroups',
                    Header: 'ATTAINS Parameter Group',
                    accessor: 'attainsParameterGroup',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'attainsParameterGroup'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                  {
                    Header: 'ATTAINS Parameter Name',
                    accessor: 'attainsParameterName',
                    filterMethod: (filter, row) =>
                      createCustomFilter(filter, row, 'attainsParameterName'),
                    Filter: ({ filter, onChange }) =>
                      generateFilterInput(filter, onChange),
                  },
                ],
              },
            ]}
            filterable={true}
            defaultPageSize={matchedMappings.length} // set number of displayed entries to number of entries
            minRows={0} // hide empty rows that appear once filters have been applied
            showPagination={false}
            className="-striped -highlight"
          />
        )}
      </Container>
    </Page>
  );
}

export default Attains;
