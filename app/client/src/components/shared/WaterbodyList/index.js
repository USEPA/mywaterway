// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// utilities
import {
  createWaterbodySymbol,
  getWaterbodyCondition,
  getUniqueWaterbodies,
} from 'components/pages/LocationMap/MapFunctions';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// errors
import { huc12SummaryError } from 'config/errorMessages';

// --- styled components ---
const Text = styled.p`
  margin: 1em;
  padding-bottom: 0;
  font-weight: bold;
`;

const Legend = styled.div`
  margin: 1em;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;

  span {
    display: flex;
    align-items: center;
  }
`;

const WaterbodyContent = styled.div`
  padding: 0.875em;

  button {
    margin-bottom: 0;
  }
`;

// --- components ---
type Props = {
  waterbodies: Array<Object>,
  title: string,
  fieldName: ?string,
  type: string,
  sortBy: string,
};

function WaterbodyList({
  waterbodies,
  title,
  fieldName,
  type = 'Waterbody',
  sortBy = 'assessmentunitname',
}: Props) {
  const { cipSummary } = React.useContext(LocationSearchContext);

  // if huc12summaryservice is down
  if (cipSummary.status === 'failure')
    return (
      <StyledErrorBox>
        <p>{huc12SummaryError}</p>
      </StyledErrorBox>
    );

  if (!waterbodies) return <LoadingSpinner />;

  const sortedWaterbodies = getUniqueWaterbodies(waterbodies)
    .filter(
      (waterbody) =>
        getWaterbodyCondition(waterbody.attributes, fieldName).condition !==
        'hidden',
    )
    .sort((objA, objB) => {
      return objA['attributes'][sortBy].localeCompare(
        objB['attributes'][sortBy],
      );
    });

  // if no waterbodies found
  if (sortedWaterbodies.length <= 0) return null;

  return (
    <>
      <Text>Waterbody Conditions:</Text>
      <Legend>
        <span>
          <WaterbodyIcon condition={'good'} selected={false} />
          &nbsp;Good
        </span>
        <span>
          <WaterbodyIcon condition={'polluted'} selected={false} />
          &nbsp;Impaired
        </span>
        <span>
          <WaterbodyIcon condition={'unassessed'} selected={false} />
          &nbsp;Condition Unknown
        </span>
      </Legend>

      <AccordionList title={title}>
        {sortedWaterbodies.map((graphic, index) => {
          /* prettier-ignore */
          const condition = getWaterbodyCondition(graphic.attributes, fieldName).condition;
          const icon = createWaterbodySymbol({ condition, selected: true });

          const waterbodyContent = (
            <WaterbodyContent>
              <WaterbodyInfo
                type={type}
                feature={graphic}
                fieldName={fieldName}
              />
              <ViewOnMapButton feature={graphic} fieldName={fieldName} />
            </WaterbodyContent>
          );

          return (
            <AccordionItem
              key={index}
              title={<strong>{graphic.attributes.assessmentunitname}</strong>}
              subTitle={`ID: ${graphic.attributes.assessmentunitidentifier}`}
              icon={<WaterbodyIcon condition={condition} selected={false} />}
              mapIcon={icon}
              feature={graphic}
              idKey={'assessmentunitidentifier'}
            >
              {waterbodyContent}
            </AccordionItem>
          );
        })}
      </AccordionList>
    </>
  );
}

export default WaterbodyList;
