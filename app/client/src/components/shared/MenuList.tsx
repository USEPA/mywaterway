import { useWindowSize } from '@reach/window-size';
import { useCallback, useEffect, useRef } from 'react';
import { VariableSizeList } from 'react-window';
import { components } from 'react-select';
// types
import type { MenuListProps } from 'react-select';

export default MenuList;
export function MenuList<T>(props: MenuListProps<T>) {
  const { children, maxHeight } = props;
  const { width } = useWindowSize();
  const listRef = useRef<VariableSizeList | null>(null);

  // keeps track of the size of the virtualized items. This handles
  // items where the text wraps
  const sizeMap = useRef<{ [index: number]: number }>({});
  const setSize = useCallback((index: number, size: number) => {
    sizeMap.current = { ...sizeMap.current, [index]: size };
    listRef.current?.resetAfterIndex(index);
  }, []);
  const getSize = (index: number) => sizeMap.current[index] || 70;

  // use the default style dropdown if there is no data
  if (!Array.isArray(children) || children.length === 0) {
    return <components.MenuList {...props}>{children}</components.MenuList>;
  }

  // determine if this is a group and get the children accordingly
  let childrenToDisplay = children;
  const hasSubChildren =
    Array.isArray(children) &&
    children.length === 1 &&
    children[0].props?.children;
  if (hasSubChildren) childrenToDisplay = children[0].props.children;

  return (
    <>
      {hasSubChildren && children[0].props.label}
      <VariableSizeList
        ref={listRef}
        width="100%"
        height={maxHeight}
        itemCount={childrenToDisplay.length}
        itemSize={getSize}
      >
        {({ index, style }) => (
          <div style={{ ...style, overflowX: 'hidden' }}>
            <MenuItem
              index={index}
              width={width}
              setSize={setSize}
              value={childrenToDisplay[index]}
            />
          </div>
        )}
      </VariableSizeList>
    </>
  );
}

type MenuItemProps = {
  index: number;
  width: number;
  setSize: (index: number, size: number) => void;
  value: string;
};

function MenuItem({ index, width, setSize, value }: MenuItemProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  // keep track of the height of the rows to autosize rows
  useEffect(() => {
    if (!rowRef?.current) return;

    setSize(index, rowRef.current.getBoundingClientRect().height);
  }, [setSize, index, width]);

  return <div ref={rowRef}>{value}</div>;
}
