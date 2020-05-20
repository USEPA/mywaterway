// @flow

import React from 'react';
import styled from 'styled-components';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  WindowScroller,
} from 'react-virtualized';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import WaterbodyIcon from 'components/shared/WaterbodyIcon';
import WaterbodyInfo from 'components/shared/WaterbodyInfo';
import ViewOnMapButton from 'components/shared/ViewOnMapButton';

import { AccordionList, AccordionItem } from 'components/shared/Accordion';
// utilities
import {
  getTypeFromAttributes,
  getWaterbodyCondition,
} from 'components/pages/LocationMap/MapFunctions';
// contexts
import { MapHighlightContext } from 'contexts/MapHighlight';
import { LocationSearchContext } from 'contexts/locationSearch';

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
  type: string,
  fieldName: string,
};

function WaterbodyList({
  waterbodies,
  type = 'Waterbody',
  fieldName = '',
}: Props) {
  // Triggers the loading spinner. When a search is complete the loading
  // spinner will be displayed for 250ms.
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!waterbodies) {
      setLoading(true);
    } else {
      setTimeout(() => {
        setLoading(false);
      }, 250);
    }
  }, [waterbodies]);

  // Sort the waterbodies
  const [sortBy, setSortBy] = React.useState('assessmentunitname');

  if (loading || !waterbodies) return <LoadingSpinner />;
  if (!loading && waterbodies && waterbodies.length <= 0) {
    return <Text>No waterbodies found.</Text>;
  }

  const sortedWaterbodies = waterbodies.sort((objA, objB) => {
    return objA['attributes'][sortBy].localeCompare(objB['attributes'][sortBy]);
  });

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
      <AccordionList
        sortOptions={[
          { value: 'assessmentunitname', label: 'Waterbody Name' },
          { value: 'assessmentunitidentifier', label: 'Assessment Unit Id' },
        ]}
        onSortChange={sortBy => setSortBy(sortBy.value)}
      >
        <WaterbodyItems
          sortedWaterbodies={sortedWaterbodies}
          fieldName={fieldName}
        />
      </AccordionList>
    </>
  );
}

function WaterbodyItems({ sortedWaterbodies, allExpanded, fieldName }) {
  const {
    highlightedGraphic,
    selectedGraphic, //
  } = React.useContext(MapHighlightContext);
  const { mapView } = React.useContext(LocationSearchContext);
  const [cache] = React.useState(
    new CellMeasurerCache({
      defaultHeight: 50,
      fixedWidth: true,
    }),
  );
  const windowScrollRef = React.useRef(null);
  const listRef = React.useRef(null);

  const [expandedRows, setExpandedRows] = React.useState([]);

  // Updates the top position of the WindowScroll object, after the map loads.
  React.useEffect(() => {
    if (!mapView || !windowScrollRef || !windowScrollRef.current) return;
    windowScrollRef.current.updatePosition();

    // Jostle the scroll position to get the first few accordion items to
    // display. This is a workaround to what is likely a bug in the
    // react-virtualization WindowScroller HOC.
    const stateTabs = document.querySelector('[data-content="stateTabs"]');
    const stateContent = document.querySelector('[data-content="state"]');
    stateContent.scrollIntoView();
    stateTabs.scrollIntoView();
  }, [mapView, windowScrollRef]);

  // Resizes the rows (accordion items) of the react-virtualized list.
  // This is done anytime an accordion item is expanded/collapsed
  React.useEffect(() => {
    cache.clearAll();
    listRef.current.recomputeRowHeights();
    setExpandedRows([]);
  }, [allExpanded, cache]);

  function rowRenderer({ index, isScrolling, key, parent, style }) {
    let graphic = sortedWaterbodies[index];
    /* prettier-ignore */
    const condition = getWaterbodyCondition(graphic.attributes, fieldName, true).condition;

    let status = null;
    // ensure the key exists prior to deciding to highlight
    if (
      graphic &&
      graphic.attributes &&
      graphic.attributes['assessmentunitidentifier']
    ) {
      const id = graphic.attributes['assessmentunitidentifier'];

      const isSelected =
        selectedGraphic && selectedGraphic.attributes
          ? selectedGraphic.attributes['assessmentunitidentifier'] === id
          : false;

      const isHighlighted =
        highlightedGraphic && highlightedGraphic.attributes
          ? highlightedGraphic.attributes['assessmentunitidentifier'] === id
          : false;

      if (isSelected) status = 'selected';
      else if (isHighlighted && !isSelected) status = 'highlighted';
    }

    // get the type of symbol for creating a unique key, since it is currently
    // possible for the assessmentunitid and objectid to be duplicated across
    // layers.
    const type = getTypeFromAttributes(graphic);

    function resizeCell() {
      if (!listRef || !listRef.current) return;

      // clear the row height for the accordion item being expanded/collapsed
      cache.clear(index);
      listRef.current.recomputeRowHeights(index);
    }

    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        rowCount={sortedWaterbodies.length}
        parent={parent}
        key={key}
        rowIndex={index}
      >
        <div style={style} onClick={resizeCell}>
          <AccordionItem
            key={
              type +
              graphic.attributes.organizationid +
              graphic.attributes.assessmentunitidentifier
            }
            index={
              type +
              graphic.attributes.organizationid +
              graphic.attributes.assessmentunitidentifier
            }
            title={<strong>{graphic.attributes.assessmentunitname}</strong>}
            subTitle={`ID: ${graphic.attributes.assessmentunitidentifier}`}
            icon={<WaterbodyIcon condition={condition} selected={false} />}
            feature={graphic}
            idKey={'assessmentunitidentifier'}
            status={status}
            allExpanded={allExpanded || expandedRows.includes(index)}
            onChange={() => {
              // ensure the cell is sized appropriately
              resizeCell();

              // add the item to the expandedRows array so the accordion item
              // will stay expanded when the user scrolls or highlights map items
              if (expandedRows.includes(index)) {
                setExpandedRows(expandedRows.filter(item => item !== index));
              } else setExpandedRows(expandedRows.concat(index));
            }}
          >
            <WaterbodyContent>
              <WaterbodyInfo
                type={'Waterbody State Overview'}
                feature={graphic}
              />
              <ViewOnMapButton feature={graphic} />
            </WaterbodyContent>
          </AccordionItem>
        </div>
      </CellMeasurer>
    );
  }

  return (
    <>
      <WindowScroller ref={windowScrollRef}>
        {({ height, isScrolling, onChildScroll, scrollTop }) => (
          <AutoSizer disableHeight>
            {({ width }) => (
              <List
                ref={listRef}
                autoHeight
                deferredMeasurementCache={cache}
                height={height}
                width={width}
                scrollTop={scrollTop}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                rowCount={sortedWaterbodies.length}
                rowHeight={cache.rowHeight}
                rowRenderer={rowRenderer}
                overscanRowCount={10}
              />
            )}
          </AutoSizer>
        )}
      </WindowScroller>
    </>
  );
}

export default WaterbodyList;
