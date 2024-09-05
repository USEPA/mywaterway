// @flow
/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
// components
import Page from 'components/shared/Page';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import NavBar from 'components/shared/NavBar';
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ReactTable from 'components/shared/ReactTable';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// utilities
import { fetchCheck } from 'utils/fetchUtils';
// errors
import { attainsParameterServiceError } from 'config/errorMessages';

function compareContextName(objA, objB) {
  return objA['context'].localeCompare(objB['context']);
}

function getMatchingLabel(ATTAINSContext, impairmentFields) {
  return (
    impairmentFields.filter((field) => {
      return field.parameterGroup === ATTAINSContext;
    })[0]?.label ?? ATTAINSContext
  );
}

const containerStyles = css`
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

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1.25rem;
`;

function Attains() {
  const configFiles = useConfigFilesState();

  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState(false);
  const [attainsData, setAttainsData] = useState(null);
  const [matchedMappings, setMatchedMappings] = useState([]);

  const [attainsDataInitialized, setAttainsDataInitialized] = useState(false);
  useEffect(() => {
    if (attainsDataInitialized) return;

    setAttainsDataInitialized(true);

    const url =
      configFiles.data.services.attains.serviceUrl +
      'domains?domainName=ParameterName';

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
  }, [attainsDataInitialized, configFiles]);

  useEffect(() => {
    // array of arrays - each containing 3 values: the HMW mapping, the ATTAINS context, and the ATTAINS name
    // i.e. ["Algae", "ALGAL GROWTH", "EXCESS ALGAL GROWTH"]
    let data = [];
    if (attainsData) {
      data = attainsData.map((obj) => {
        return {
          hmwMapping: getMatchingLabel(
            obj.context,
            configFiles.data.impairmentFields,
          ),
          attainsParameterGroup: obj.context,
          attainsParameterName: obj.name,
        };
      });
    }

    setMatchedMappings(data);
  }, [attainsData, configFiles]);

  if (serviceError) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <div css={modifiedErrorBoxStyles}>
          <p>{attainsParameterServiceError}</p>
        </div>
      </Page>
    );
  }

  // if loading or matching the entries. prevents a flicker of an empty screen while table loads
  if (loading) {
    return (
      <Page>
        <NavBar title="ATTAINS Information" />
        <LoadingSpinner />
      </Page>
    );
  }

  return (
    <Page>
      <NavBar title="ATTAINS Information" />
      <div className="container" css={containerStyles}>
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

        <ReactTable
          data={matchedMappings}
          striped={true}
          getColumns={(tableWidth) => {
            const columnWidth = tableWidth / 3 - 1;

            return [
              {
                Header: "How's My Waterway Impairment Category",
                accessor: 'hmwMapping',
                width: columnWidth,
                filterable: true,
              },
              {
                id: 'parameterGroups',
                Header: 'ATTAINS Parameter Group',
                accessor: 'attainsParameterGroup',
                width: columnWidth,
                filterable: true,
              },
              {
                Header: 'ATTAINS Parameter Name',
                accessor: 'attainsParameterName',
                width: columnWidth,
                filterable: true,
              },
            ];
          }}
        />
      </div>
    </Page>
  );
}

export default Attains;
