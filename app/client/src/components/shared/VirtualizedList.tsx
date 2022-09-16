import { useCallback, useEffect, useRef } from 'react';
import { useWindowSize } from '@reach/window-size';
import { VariableSizeList } from 'react-window';
import throttle from 'lodash/throttle';
// utils
import { useOnScreen } from 'utils/hooks';
// types
import type { MutableRefObject } from 'react';

type RowRendererProps = {
  index: number;
  width: number;
  listRef: MutableRefObject<VariableSizeList<any> | null>;
  setSize: Function;
  renderer: Function;
};

function RowRenderer({
  index,
  width,
  listRef,
  setSize,
  renderer,
}: RowRendererProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  // keep track of the height of the rows to autosize rows
  useEffect(() => {
    if (!rowRef?.current) return;

    setSize(index, rowRef.current.getBoundingClientRect().height, listRef);
  }, [setSize, index, width, listRef]);

  return <div ref={rowRef}>{renderer({ index })}</div>;
}

type Props = {
  items: Array<Object>;
  renderer: Function;
};

function VirtualizedListInner({ items, renderer }: Props) {
  const innerRef = useRef<VariableSizeList<any> | null>(null);
  const outerRef = useRef();
  const sizeMap = useRef<{ [index: string]: number }>({});
  const setSize = useCallback((index: number, size: number, listRef: any) => {
    sizeMap.current = { ...sizeMap.current, [index]: size };
    listRef.current.resetAfterIndex(index);
  }, []);
  const getSize = (index: number) => sizeMap.current[index] || 150;
  const { width } = useWindowSize();

  // make the virtualized list use the window's scroll bar
  useEffect(() => {
    const throttleTime = 10;
    const handleWindowScroll = throttle(() => {
      const { offsetTop } = outerRef.current || { offsetTop: 0 };

      const scrollPosition =
        window['pageYOffset'] ||
        document.documentElement['scrollTop'] ||
        document.body['scrollTop'] ||
        0;

      const scrollTop = scrollPosition - offsetTop;
      innerRef.current && innerRef.current.scrollTo(scrollTop);
    }, throttleTime);

    window.addEventListener('scroll', handleWindowScroll);
    return () => {
      handleWindowScroll.cancel();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  return (
    <VariableSizeList
      height={window.innerHeight}
      itemCount={items.length}
      itemSize={getSize}
      width="100%"
      ref={innerRef}
      outerRef={outerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'inline-block',
      }}
    >
      {({ index, style }) => (
        <div style={{ ...style, overflowX: 'hidden' }}>
          <RowRenderer
            listRef={innerRef}
            index={index}
            setSize={setSize}
            width={width}
            renderer={renderer}
          />
        </div>
      )}
    </VariableSizeList>
  );
}

// This is a wrapper component that ensures this component
// is visible on the DOM prior to rendering the actual
// virtualized list. This component was added as a workaround
// for an issue where the list would not display anything
// or jump around when the list is not immediatly visible
// on the dom (i.e., the list is on the second tab).
function VirtualizedList({ items, renderer }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isVisible = useOnScreen(ref?.current);

  return (
    <div ref={ref}>
      {isVisible && <VirtualizedListInner items={items} renderer={renderer} />}
    </div>
  );
}

export default VirtualizedList;
