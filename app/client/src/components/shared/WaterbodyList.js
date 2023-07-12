// @flow

import React, { useContext } from 'react';
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
} from 'components/shared/AccordionMapHighlight';
// utilities
import {
  getWaterbodyCondition,
  getUniqueWaterbodies,
  getOrganizationLabel,
} from 'utils/mapFunctions';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { 
  useServicesContext,
  useStateNationalUsesContext,
} from 'contexts/LookupFiles';
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
    font-size: 0.875em;

    @media (min-width: 560px) {
      font-size: 1em;
    }
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
  text-align: center;
`;

const modifiedInfoBoxStyles = css`
  ${infoBoxStyles};
  margin-bottom: 1em;
  text-align: center;
`;

type Props = {
  waterbodies: Array<Object>,
  title: string,
  fieldName: ?string,
};

function WaterbodyList({ waterbodies, title, fieldName }: Props) {
  const { cipSummary } = useContext(LocationSearchContext);

  const services = useServicesContext();
  const stateNationalUses = useStateNationalUsesContext();

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
        <div css={modifiedInfoBoxStyles}>
          <p>Some waterbodies are not visible on the map.</p>
        </div>
      )}

      <p css={paragraphStyles}>Waterbody Conditions:</p>

      <div css={legendItemsStyles}>
        <span>
          <WaterbodyIcon condition="good" selected={false} />
          &nbsp;Good&nbsp;
        </span>
        <span>
          <WaterbodyIcon condition="polluted" selected={false} />
          &nbsp;Impaired&nbsp;
        </span>
        <span>
          <WaterbodyIcon condition="unassessed" selected={false} />
          &nbsp;Condition Unknown&nbsp;
        </span>
      </div>

      <AccordionList title={title}>
        {sortedWaterbodies.map((graphic) => {
          /* prettier-ignore */
          const condition = getWaterbodyCondition(graphic.attributes, fieldName).condition;

          return (
            <AccordionItem
              key={graphic.attributes.assessmentunitidentifier}
              title={<strong>{graphic.attributes.assessmentunitname}</strong>}
              subTitle={
                <>
                  {getOrganizationLabel(graphic.attributes)}{' '}
                  {graphic.attributes.assessmentunitidentifier}
                  {graphic.limited && (
                    <>
                      <br />
                      [Waterbody not visible on map.]
                    </>
                  )}
                </>
              }
              icon={<WaterbodyIcon condition={condition} selected={false} />}
              feature={graphic}
              idKey="assessmentunitidentifier"
            >
              <div css={waterbodyItemStyles}>
                <WaterbodyInfo
                  type="Waterbody"
                  feature={graphic}
                  fieldName={fieldName}
                  services={services}
                  stateNationalUses={stateNationalUses}
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
