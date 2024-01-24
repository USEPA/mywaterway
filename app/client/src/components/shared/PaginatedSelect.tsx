import { useCallback, useMemo, useRef, useState } from 'react';
import Select, { components } from 'react-select';
import { Virtuoso } from 'react-virtuoso';
// styles
import { reactSelectStyles } from 'styles/index';
// types
import type {
  GroupBase,
  MenuListProps,
  Props as SelectProps,
} from 'react-select';
import type { VirtuosoHandle } from 'react-virtuoso';

const ITEM_HEIGHT = 32;
const PAGE_SIZE = 1000;

function getListHeight(length: number | null) {
  const maxItemsShown = 7;
  return length && length < maxItemsShown
    ? length * ITEM_HEIGHT
    : maxItemsShown * ITEM_HEIGHT;
}

/*
## Components
*/

const ItemContent = ({ item }: { item: string }) => item;

export function PaginatedSelect(props: Props) {
  const { options: optionsOrGroups, styles, ...rest } = props;

  const options = useMemo(() => {
    return optionsOrGroups.flatMap((optionOrGroup) => {
      if ('options' in optionOrGroup) return optionOrGroup.options;
      return optionOrGroup;
    });
  }, [optionsOrGroups]);

  const [inputValue, setInputValue] = useState('');

  const filteredOptions = useMemo(() => {
    return options.filter((option) => {
      return option.label.toLowerCase().includes(inputValue.toLowerCase());
    });
  }, [inputValue, options]);

  const [startIndex, setStartIndex] = useState(0);

  const loadNext = useCallback(() => {
    let hasMore = false;
    setStartIndex((prevStart) => {
      if (prevStart + PAGE_SIZE * 2 >= filteredOptions.length) return prevStart;
      hasMore = true;
      return prevStart + PAGE_SIZE;
    });
    return hasMore;
  }, [filteredOptions]);

  const loadPrevious = useCallback(() => {
    let hasMore = false;
    setStartIndex((prevStart) => {
      if (prevStart <= 0) return 0;
      hasMore = true;
      return prevStart - PAGE_SIZE;
    });
    return hasMore;
  }, []);

  const optionsOrGroupsPage = useMemo(() => {
    const page = filteredOptions.slice(startIndex, startIndex + PAGE_SIZE * 2);
    const optionOrGroup = optionsOrGroups[0];
    return optionOrGroup && 'options' in optionOrGroup
      ? [{ label: 'Group', options: page }]
      : page;
  }, [filteredOptions, optionsOrGroups, startIndex]);

  const MenuList = useMemo(
    () => wrapMenuList(loadPrevious, loadNext),
    [loadNext, loadPrevious],
  );

  return (
    <Select
      components={{ MenuList }}
      isMulti
      onInputChange={(newValue) => {
        setInputValue(newValue);
        setStartIndex(0);
      }}
      onMenuClose={() => {
        setInputValue('');
        setStartIndex(0);
      }}
      options={optionsOrGroupsPage}
      styles={{
        ...reactSelectStyles,
        ...styles,
      }}
      {...rest}
    />
  );
}

function wrapMenuList(loadPrevious: () => boolean, loadNext: () => boolean) {
  return (props: MenuListProps<Option>) => {
    const { children } = props;
    const listRef = useRef<VirtuosoHandle | null>(null);

    const handleHitBottom = (atBottom: boolean) => {
      if (!atBottom) return;
      if (loadNext()) {
        listRef.current?.scrollToIndex(
          PAGE_SIZE - Math.round(getListHeight(null) / ITEM_HEIGHT),
        );
      }
    };

    const handleHitTop = (atTop: boolean) => {
      if (!atTop) return;
      if (loadPrevious()) {
        listRef.current?.scrollToIndex(PAGE_SIZE);
      }
    };

    // Use the default style dropdown if there is no data.
    if (!Array.isArray(children) || children.length === 0) {
      return <components.MenuList {...props}>{children}</components.MenuList>;
    }

    const hasSubChildren =
      children.length === 1 && Boolean(children[0].props?.children);

    // Determine if this is a group and get the children accordingly.
    const childrenToDisplay = hasSubChildren
      ? children[0].props.children
      : children;

    return (
      <>
        {hasSubChildren && children[0].props.label}
        <Virtuoso
          atBottomStateChange={handleHitBottom}
          atTopStateChange={handleHitTop}
          data={childrenToDisplay}
          itemContent={(_index, item) => <ItemContent item={item} />}
          ref={listRef}
          style={{
            height: getListHeight(childrenToDisplay.length),
            width: '100%',
          }}
        />
      </>
    );
  };
}

/*
## Types
*/

type Option = {
  label: string;
  value: string;
};

type Props = Omit<
  SelectProps<Option, true, GroupBase<Option>>,
  'components' | 'isMulti' | 'onInputChange' | 'onMenuClose'
> &
  Required<Pick<SelectProps<Option, true, GroupBase<Option>>, 'options'>>;

export default PaginatedSelect;
