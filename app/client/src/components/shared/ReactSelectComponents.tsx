import { css, Global } from '@emotion/react';
import { memo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { components } from 'react-select';
// types
import type { MenuListProps, OptionProps } from 'react-select';

const itemHoverStyles = css`
  .react-select__option {
    background-color: transparent !important;
    &:hover {
      background-color: #dcebff !important;
    }
  }
`;

const getListHeight = (length: number, maxHeight: number) => {
  return Math.min(length < 6 ? length * 40 : 6 * 40, maxHeight);
};

const ItemContent = ({ item }: { item: string }) => item;

export const MenuList = memo(
  (props: MenuListProps<{ label: string; value: string }>) => {
    const { children, maxHeight } = props;

    // use the default style dropdown if there is no data
    if (!Array.isArray(children) || children.length === 0) {
      return <components.MenuList {...props}>{children}</components.MenuList>;
    }

    const hasSubChildren =
      children.length === 1 && Boolean(children[0].props?.children);

    // determine if this is a group and get the children accordingly
    const childrenToDisplay = hasSubChildren
      ? children[0].props.children
      : children;

    return (
      <>
        <Global styles={itemHoverStyles} />
        {hasSubChildren && children[0].props.label}
        <Virtuoso
          data={childrenToDisplay}
          itemContent={(_index, item) => <ItemContent item={item} />}
          style={{
            height: getListHeight(childrenToDisplay.length, maxHeight),
            width: '100%',
          }}
        />
      </>
    );
  },
);

export const Option = memo(
  ({ children, ...props }: OptionProps<{ label: string; value: string }>) => {
    const { onMouseMove, onMouseOver, ...rest } = props.innerProps;
    const newProps = Object.assign(props, { innerProps: rest });
    return (
      <components.Option {...newProps} className="react-select__option">
        {children}
      </components.Option>
    );
  },
);
