import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
// utils
import { useOnScreen } from '@/utils/hooks';
import type { ReactNode } from 'react';

type Props = {
  items: Array<Object>;
  renderer: ({ index }: { index: number }) => ReactNode;
};

function VirtualizedListInner({ items, renderer }: Readonly<Props>) {
  return (
    <Virtuoso
      style={{ height: window.innerHeight }}
      totalCount={items.length}
      itemContent={(index) => renderer({ index })}
      useWindowScroll
    />
  );
}

// This is a wrapper component that ensures this component
// is visible on the DOM prior to rendering the actual
// virtualized list. This component was added as a workaround
// for an issue where the list would not display anything
// or jump around when the list is not immediately visible
// on the dom (i.e., the list is on the second tab).
function VirtualizedList({ items, renderer }: Readonly<Props>) {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const isVisible = useOnScreen(ref);

  return (
    <div ref={(newRef) => setRef(newRef)}>
      {isVisible && <VirtualizedListInner items={items} renderer={renderer} />}
    </div>
  );
}

export default VirtualizedList;
