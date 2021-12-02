// @flow

import React from 'react';
import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import { infoBoxStyles, errorBoxStyles } from 'components/shared/MessageBoxes';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';
import {
  AccordionList,
  AccordionItem,
} from 'components/shared/Accordion/MapHighlight';
// utilities
import {
  createWaterbodySymbol,
  getWaterbodyCondition,
  getUniqueWaterbodies,
  getOrganizationLabel,
} from 'components/pages/LocationMap/MapFunctions';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
// errors
import { huc12SummaryError } from 'config/errorMessages';

const paragraphStyles = css`
  margin-bottom: 0.5em;
  padding-bottom: 0;
  font-weight: bold;
`;

const legendItemsStyles = css`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  margin-bottom: 1em;

  span {
    display: flex;
    align-items: center;
  }
`;

const waterbodyItemStyles = css`
  padding: 0.875em;

  button {
    margin-bottom: 0;
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

// --- components ---
type Props = {
  waterbodies: Array<Object>,
  title: string,
  fieldName: ?string,
};

function WaterbodyList({ waterbodies, title, fieldName }: Props) {
  const { cipSummary } = React.useContext(LocationSearchContext);

  // if huc12summaryservice is down
  if (cipSummary.status === 'failure') {
    return (
      <div css={modifiedErrorBoxStyles}>
        <p>{huc12SummaryError}</p>
      </div>
    );
  }

  if (!waterbodies) return <LoadingSpinner />;

  const sortedWaterbodies = getUniqueWaterbodies(waterbodies)
    .filter(
      (waterbody) =>
        getWaterbodyCondition(waterbody.attributes, fieldName).condition !==
        'hidden',
    )
    .sort((objA, objB) => {
      return objA.attributes.assessmentunitname.localeCompare(
        objB.attributes.assessmentunitname,
      );
    });

  // if no waterbodies found
  if (sortedWaterbodies.length <= 0) return null;

  return (
    <>
      {/* check if any waterbodies have no spatial data */}
      {sortedWaterbodies.some((waterbody) => waterbody.limited) && (
        <p css={modifiedInfoBoxStyles}>
          Some waterbodies are not visible on the map.
        </p>
      )}

      <p css={paragraphStyles}>Waterbody Conditions:</p>

      <div css={legendItemsStyles}>
        <span>
          <WaterbodyIcon condition="good" selected={false} />
          &nbsp;Good
        </span>
        <span>
          <WaterbodyIcon condition="polluted" selected={false} />
          &nbsp;Impaired
        </span>
        <span>
          <WaterbodyIcon condition="unassessed" selected={false} />
          &nbsp;Condition Unknown
        </span>
      </div>

      <AccordionList title={title}>
        {sortedWaterbodies.map((graphic, index) => {
          /* prettier-ignore */
          const condition = getWaterbodyCondition(graphic.attributes, fieldName).condition;
          const icon = createWaterbodySymbol({ condition, selected: true });

          return (
            <AccordionItem
              key={index}
              title={<strong>{graphic.attributes.assessmentunitname}</strong>}
              subTitle={
                <>
                  {`${getOrganizationLabel(graphic.attributes)} ${
                    graphic.attributes.assessmentunitidentifier
                  }`}

                  {graphic.limited && (
                    <>
                      <br />
                      [Waterbody not visible on map.]
                    </>
                  )}
                </>
              }
              icon={<WaterbodyIcon condition={condition} selected={false} />}
              mapIcon={icon}
              feature={graphic}
              idKey={'assessmentunitidentifier'}
            >
              <div css={waterbodyItemStyles}>
                <WaterbodyInfo
                  type="Waterbody"
                  feature={graphic}
                  fieldName={fieldName}
                />

                <ViewOnMapButton
                  feature={graphic}
                  fieldName={fieldName}
                  disabled={graphic.limited ? true : false}
                />

                {graphic.limited && (
                  <p>No map data available for this waterbody.</p>
                )}
              </div>
            </AccordionItem>
          );
        })}
      </AccordionList>
    </>
  );
}

export default WaterbodyList;
