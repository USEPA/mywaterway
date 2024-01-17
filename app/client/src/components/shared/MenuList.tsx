import { Virtuoso } from 'react-virtuoso';
import { components } from 'react-select';
// types
import type { MenuListProps } from 'react-select';

export function MenuList<T>(props: MenuListProps<T>) {
  const { children, maxHeight } = props;

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
      <Virtuoso
        itemContent={(index) => <div>{childrenToDisplay[index]}</div>}
        style={{ height: maxHeight, width: '100%' }}
        totalCount={childrenToDisplay.length}
      />
    </>
  );
}

export default MenuList;
