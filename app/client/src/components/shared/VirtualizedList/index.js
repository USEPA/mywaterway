// @flow

import React from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  WindowScroller,
} from 'react-virtualized';

// --- components ---
type Props = {
  items: Array<Object>,
  renderer: Function,
  allExpanded?: boolean,
  expandedRowsSetter?: Function,
};

function VirtualizedList({
  items,
  renderer,
  allExpanded,
  expandedRowsSetter,
}: Props) {
  const [cache] = React.useState(
    new CellMeasurerCache({
      defaultHeight: 50,
      fixedWidth: true,
    }),
  );
  const windowScrollRef = React.useRef(null);
  const listRef = React.useRef(null);

  // Resizes the rows (accordion items) of the react-virtualized list.
  // This is done anytime an accordion item is expanded/collapsed
  React.useEffect(() => {
    cache.clearAll();
    listRef.current.recomputeRowHeights();
    if (expandedRowsSetter) expandedRowsSetter([]);
  }, [allExpanded, cache, expandedRowsSetter]);

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
                rowCount={items.length}
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

export default VirtualizedList;
