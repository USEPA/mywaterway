import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList } from 'react-window';
import throttle from 'lodash/throttle';
import uniqueId from 'lodash/uniqueId';
// utils
import { useOnScreen } from 'utils/hooks';
import type { CSSProperties, ReactNode } from 'react';

type RowRendererProps = {
  data: {
    listId: string;
    renderer: ({ index }: { index: number }) => ReactNode;
    resizeObserver: ResizeObserver;
  };
  index: number;
  style: CSSProperties;
};

function RowRenderer({ data, index, style }: RowRendererProps) {
  const { listId, renderer, resizeObserver } = data;
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return function cleanup() {
      if (rowRef.current) resizeObserver.unobserve(rowRef.current);
    };
  }, [resizeObserver]);

  const callbackRef = useCallback(
    (node: HTMLDivElement) => {
      if (!node) return;
      resizeObserver.observe(node);
      rowRef.current = node;
    },
    [resizeObserver],
  );

  return (
    <div style={{ ...style, overflow: 'hidden' }}>
      <div id={`${listId}-row-${index}`} ref={callbackRef}>
        {renderer({ index })}
      </div>
    </div>
  );
}

type Props = {
  items: Array<Object>;
  renderer: ({ index }: { index: number }) => ReactNode;
};

function VirtualizedListInner({ items, renderer }: Props) {
  const innerRef = useRef<VariableSizeList<any> | null>(null);
  const outerRef = useRef();
  const sizeMap = useRef<{ [index: string]: number }>({});
  const setSize = useCallback((index: number, size: number) => {
    sizeMap.current = { ...sizeMap.current, [index]: size };
    innerRef.current?.resetAfterIndex(index);
  }, []);
  const getSize = (index: number) => sizeMap.current[index] || 150;
  const [listId] = useState(uniqueId('list-'));

  const resizeObserver = useMemo(
    () =>
      new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.id.split('-')[3]);
          if (entry.borderBoxSize?.length) {
            setSize(index, entry.borderBoxSize[0].blockSize);
          } else {
            setSize(index, entry.contentRect.height);
          }
        });
      }),
    [setSize],
  );

  useEffect(() => {
    return function cleanup() {
      resizeObserver.disconnect();
    };
  }, [resizeObserver]);

  // make the virtualized list use the window's scroll bar
  useEffect(() => {
    const throttleTime = 10;
    const handleWindowScroll = throttle(() => {
      const { offsetTop } = outerRef.current || { offsetTop: 0 };

      const scrollPosition =
        window['scrollY'] ||
        document.documentElement['scrollTop'] ||
        document.body['scrollTop'] ||
        0;

      const scrollTop = scrollPosition - offsetTop;
      innerRef.current?.scrollTo(scrollTop);
    }, throttleTime);

    window.addEventListener('scroll', handleWindowScroll);
    return () => {
      handleWindowScroll.cancel();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);

  const itemData = useMemo(() => {
    return {
      listId,
      renderer,
      resizeObserver,
    };
  }, [listId, renderer, resizeObserver]);

  return (
    <VariableSizeList
      height={window.innerHeight}
      itemCount={items.length}
      itemData={itemData}
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
      {RowRenderer}
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
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const isVisible = useOnScreen(ref);

  return (
    <div ref={(newRef) => setRef(newRef)}>
      {isVisible && <VirtualizedListInner items={items} renderer={renderer} />}
    </div>
  );
}

export default VirtualizedList;
