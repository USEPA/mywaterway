// @flow

import React, { useEffect, useRef, useState } from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  WindowScroller,
} from 'react-virtualized';
// utils
import { useOnScreen } from 'utils/hooks';

type Props = {
  items: Array<Object>,
  renderer: Function,
  allExpanded?: boolean,
  displayedTypes?: Object,
  expandedRowsSetter?: Function,
};

function VirtualizedListInner({
  items,
  renderer,
  allExpanded,
  displayedTypes,
  expandedRowsSetter,
}: Props) {
  const [cache] = useState(
    new CellMeasurerCache({
      defaultHeight: 50,
      fixedWidth: true,
    }),
  );
  const windowScrollRef = useRef(null);
  const listRef = useRef(null);

  // Resizes the rows (accordion items) of the react-virtualized list.
  // This is done anytime an accordion item is expanded/collapsed
  useEffect(() => {
    cache.clearAll();
    listRef.current?.recomputeRowHeights();
    if (expandedRowsSetter) expandedRowsSetter([]);
  }, [allExpanded, cache, expandedRowsSetter, displayedTypes]);

  function rowRenderer({ index, isScrolling, key, parent, style }) {
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
        rowCount={items.length}
        parent={parent}
        key={key}
        rowIndex={index}
      >
        <div style={style} onClick={resizeCell}>
          {renderer({ index, resizeCell, allExpanded })}
        </div>
      </CellMeasurer>
    );
  }

  return (
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
              rowCount={items.length}
              rowHeight={cache.rowHeight}
              rowRenderer={rowRenderer}
              overscanRowCount={10}
            />
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}

// This is a wrapper component that ensures this component
// is visible on the DOM prior to rendering the actual
// virtualized list. This component was added as a workaround
// for an issue where the list would not display anything
// or jump around when the list is not immediatly visible
// on the dom (i.e., the list is on the second tab).
function VirtualizedList({
  items,
  renderer,
  allExpanded,
  displayedTypes,
  expandedRowsSetter,
}: Props) {
  const ref = useRef();
  const isVisible = useOnScreen(ref);

  return (
    <div ref={ref}>
      {isVisible && (
        <VirtualizedListInner
          items={items}
          renderer={renderer}
          allExpanded={allExpanded}
          expandedRowsSetter={expandedRowsSetter}
          displayedTypes={displayedTypes}
        />
      )}
    </div>
  );
}

export default VirtualizedList;
