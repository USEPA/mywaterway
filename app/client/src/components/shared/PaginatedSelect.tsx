import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const PAGE_SIZE = 1000;

function getListHeight(length: number, maxHeight: number) {
  return Math.min(length < 6 ? length * 40 : 6 * 40, maxHeight);
}

/*
## Components
*/

const ItemContent = ({ item }: { item: string }) => item;

function wrapMenuList(
  loadPrevious: () => boolean,
  loadNext: () => boolean,
  reset: () => void,
) {
  return (props: MenuListProps<Option>) => {
    const { children, maxHeight } = props;
    const listRef = useRef<VirtuosoHandle | null>(null);

    const handleHitBottom = (atBottom: boolean) => {
      if (!atBottom) return;
      if (loadNext()) {
        listRef.current?.scrollToIndex(PAGE_SIZE - 7); // Magic number
      }
    };

    const handleHitTop = (atTop: boolean) => {
      if (!atTop) return;
      if (loadPrevious()) {
        listRef.current?.scrollToIndex(PAGE_SIZE);
      }
    };

    useEffect(() => {
      return function cleanup() {
        reset();
      };
    }, []);

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
            height: getListHeight(childrenToDisplay.length, maxHeight),
            width: '100%',
          }}
        />
      </>
    );
  };
}

export function PaginatedSelect(props: Props) {
  const { options: optionsOrGroups, styles, ...rest } = props;

  const options = useMemo(() => {
    return optionsOrGroups.flatMap((groupOrOption) => {
      if ('options' in groupOrOption) return groupOrOption.options;
      return groupOrOption;
    });
  }, [optionsOrGroups]);

  const [startIndex, setStartIndex] = useState(0);

  const loadNext = useCallback(() => {
    let hasMore = false;
    setStartIndex((prevStart) => {
      if (prevStart + PAGE_SIZE * 2 >= options.length) return prevStart;
      hasMore = true;
      return prevStart + PAGE_SIZE;
    });
    return hasMore;
  }, [options]);

  const loadPrevious = useCallback(() => {
    let hasMore = false;
    setStartIndex((prevStart) => {
      if (prevStart <= 0) return 0;
      hasMore = true;
      return prevStart - PAGE_SIZE;
    });
    return hasMore;
  }, []);

  const reset = useCallback(() => setStartIndex(0), []);

  const optionsOrGroupsPage = useMemo(() => {
    const page = options.slice(startIndex, startIndex + PAGE_SIZE * 2);
    return 'options' in optionsOrGroups
      ? [{ label: 'Group', options: page }]
      : page;
  }, [options, optionsOrGroups, startIndex]);

  const MenuList = useMemo(
    () => wrapMenuList(loadPrevious, loadNext, reset),
    [loadNext, loadPrevious, reset],
  );

  return (
    <Select
      components={{ MenuList }}
      isMulti
      options={optionsOrGroupsPage}
      styles={{
        ...reactSelectStyles,
        ...styles,
      }}
      {...rest}
    />
  );
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
  'components' | 'isMulti'
> &
  Required<Pick<SelectProps<Option, true, GroupBase<Option>>, 'options'>>;

export default PaginatedSelect;
