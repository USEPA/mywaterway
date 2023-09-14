import { Children, cloneElement, useEffect, useState } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
// styles
import { colors, reactSelectStyles } from 'styles/index';
// types
import type { ReactElement, ReactNode } from 'react';

const accordionListContainerStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const accordionOptionsContainerStyles = (
  includeTopMargin: boolean,
  displayTitleInFlex: boolean,
) => css`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-bottom: 0;
  ${includeTopMargin ? 'margin-top: 0.625rem;' : ''}
  ${displayTitleInFlex
    ? 'justify-content: space-between; align-items: center;'
    : ''}
`;

const columnsStyles = css`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
`;

const selectContainerStyles = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;

  @media (min-width: 560px) {
    flex-wrap: nowrap;
  }
`;

const selectLabelStyles = css`
  margin-right: 0.625rem;
  margin-bottom: 0.125rem;
  font-size: 0.875rem;
  font-weight: bold;
  white-space: nowrap;

  @media (min-width: 560px) {
    margin-bottom: 0;
  }
`;

const selectStyles = css`
  width: 100%;
`;

const expandButtonStyles = (includeSort: boolean) => css`
  margin: 0 0 0 0.625rem;
  padding: 0.5rem;
  ${includeSort ? 'padding-bottom: 0;' : ''}
  font-size: 0.8125em;
  font-weight: normal;
  color: ${colors.gray6};
  background-color: transparent;
  white-space: nowrap;
`;

const listHeaderStyles = (includePadding: boolean) => css`
  padding: ${includePadding ? '0.625em 0.875em' : '0'};
  border-top: 1px solid #d8dfe2;
  border-bottom: 1px solid #d8dfe2;
  background-color: #f0f6f9;
`;

const titleStyles = css`
  text-align: center;
  padding-bottom: 0;
`;

function isReactElement(child: ReactNode): child is ReactElement {
  return (
    typeof child !== 'string' &&
    typeof child !== 'number' &&
    typeof child !== 'boolean' &&
    child !== undefined &&
    child !== null
  );
}

type AccordionListProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  displayTitleInFlex?: boolean;
  title?: ReactNode;
  expandDisabled?: boolean;
  sortOptions?: { value: string; label: string }[];
  onSortChange?: Function;
  onExpandCollapse?: Function;
  contentExpandCollapse?: ReactNode;
  extraListHeaderContent?: ReactNode;
};

function AccordionList({
  ariaLabel = '',
  children,
  className = '',
  displayTitleInFlex = false,
  title = null,
  expandDisabled = false,
  sortOptions = [],
  onSortChange = () => {},
  onExpandCollapse = () => {},
  contentExpandCollapse,
  extraListHeaderContent,
}: AccordionListProps) {
  const [sortBy, setSortBy] = useState(
    sortOptions.length > 0 ? sortOptions[0] : null,
  );
  const [allExpanded, setAllExpanded] = useState(false);

  const iconClassName = allExpanded
    ? 'far fa-caret-square-right'
    : 'far fa-caret-square-down';

  // generate unique id for sorting label and dropdown
  const uniqueID = Date.now() + Math.random();

  const includeSort = sortOptions.length > 0;

  return (
    <div
      aria-label={ariaLabel}
      css={accordionListContainerStyles}
      className={`hmw-accordions ${className}`}
      role="list"
    >
      {(includeSort || title || contentExpandCollapse || !expandDisabled) && (
        <div css={listHeaderStyles(includeSort || !!title)}>
          {title && !displayTitleInFlex && <p css={titleStyles}>{title}</p>}
          <div css={columnsStyles}>
            <div
              css={accordionOptionsContainerStyles(
                includeSort && !!title,
                displayTitleInFlex,
              )}
            >
              {title && displayTitleInFlex && <p css={titleStyles}>{title}</p>}

              {includeSort && (
                <div css={selectContainerStyles}>
                  <label
                    css={selectLabelStyles}
                    htmlFor={`sort-by-${uniqueID}`}
                  >
                    Sort By:
                  </label>
                  <Select
                    css={selectStyles}
                    inputId={`sort-by-${uniqueID}`}
                    isSearchable={false}
                    options={sortOptions}
                    value={sortBy}
                    onChange={(ev) => {
                      setSortBy(ev);
                      onSortChange(ev);
                    }}
                    styles={reactSelectStyles}
                  />
                </div>
              )}

              {contentExpandCollapse}

              {!expandDisabled && (
                <button
                  css={expandButtonStyles(includeSort)}
                  onClick={(_ev) => {
                    const newAllExpanded = !allExpanded;
                    setAllExpanded(newAllExpanded);
                    onExpandCollapse(newAllExpanded);
                  }}
                >
                  {allExpanded ? 'Collapse All' : 'Expand All'}&nbsp;&nbsp;
                  <i className={iconClassName} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {extraListHeaderContent && (
            <>
              <hr />
              {extraListHeaderContent}
            </>
          )}
        </div>
      )}

      {/* implicitly pass 'allExpanded' prop down to children (AccordionItem's) */}
      {Children.map(children, (childElement) => {
        if (isReactElement(childElement)) {
          return cloneElement(childElement, { allExpanded });
        }
      })}
    </div>
  );
}

// defaultProp set here just to satisfy flow, even though props are passed as a default function params
AccordionList.defaultProps = {
  expandDisabled: false,
  sortOptions: [],
  onSortChange: () => {},
};

const accordionItemContainerStyles = css`
  border-top: 1px solid #d8dfe2;
`;

const headerStyles = css`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  justify-content: space-between;
  padding: 0.75em 0.875em;
  line-height: 1.125;
  cursor: pointer;

  &:hover,
  &:focus {
    background-color: #f0f6f9;
  }

  .fa-angle-down {
    margin-left: 0.75em;
  }

  .fa-angle-right {
    margin-left: 0.875em;
  }
`;

const iconStyles = css`
  margin-right: 0.875em;
`;

const textStyles = css`
  flex: 1;
  margin-top: 0 !important;
  padding-bottom: 0;
  overflow-wrap: anywhere;
`;

const subtitleStyles = css`
  font-size: 0.8125em;
`;

const arrowStyles = css`
  font-size: 1.25em;
  color: #526571;
`;

const colorMap = {
  default: 'white',
  highlighted: '#f0f6f9',
  selected: 'rgba(0, 123, 255, 0.25)',
};

type AccordionItemProps = {
  ariaLabel?: string;
  children: ReactNode;
  icon?: Object;
  title: ReactNode;
  subTitle?: ReactNode;
  status?: string | null;
  onAddHighlight?: () => void;
  onRemoveHighlight?: () => void;
  onChange?: (isOpen: boolean) => void;
  allExpanded?: boolean;
  highlightContent?: boolean;
};

function AccordionItem({
  ariaLabel = '',
  children,
  icon,
  title,
  subTitle,
  status,
  onAddHighlight = () => {},
  onRemoveHighlight = () => {},
  onChange = () => {},
  allExpanded,
  highlightContent = true,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(allExpanded);

  useEffect(() => setIsOpen(allExpanded), [allExpanded]);

  const [backgroundColor, setBackgroundColor] = useState(colorMap.default);
  useEffect(() => {
    if (status === 'selected') setBackgroundColor(colorMap.selected);
    if (status === 'highlighted') setBackgroundColor(colorMap.highlighted);
    if (!status) setBackgroundColor(colorMap.default);
  }, [status]);

  const addHighlight = () => {
    if (!status) setBackgroundColor(colorMap.highlighted);
    onAddHighlight();
  };

  const removeHighlight = () => {
    if (!status) setBackgroundColor(colorMap.default);
    onRemoveHighlight();
  };

  return (
    <div
      css={accordionItemContainerStyles}
      className={`hmw-accordion`}
      onMouseEnter={(_ev) => addHighlight()}
      onMouseLeave={(_ev) => removeHighlight()}
      onFocus={(_ev) => addHighlight()}
      onBlur={(_ev) => removeHighlight()}
      role="listitem"
    >
      <div
        aria-label={ariaLabel}
        css={headerStyles}
        className="hmw-accordion-header"
        style={{ backgroundColor }}
        onClick={(_ev) => {
          const newIsOpen = !isOpen;
          setIsOpen(newIsOpen);
          onChange(newIsOpen);
        }}
        onKeyUp={(ev) => {
          if (ev.key === 'Enter') {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            onChange(newIsOpen);
          }
        }}
        role="button"
        tabIndex={0}
      >
        {icon && <div css={iconStyles}>{icon}</div>}

        <div css={textStyles}>
          {title}
          {subTitle && (
            <>
              <br />
              <span css={subtitleStyles}>{subTitle}</span>
            </>
          )}
        </div>

        <i
          css={arrowStyles}
          className={`fa fa-angle-${isOpen ? 'down' : 'right'}`}
          aria-hidden="true"
        />
      </div>

      <div
        style={
          highlightContent
            ? { backgroundColor }
            : { backgroundColor: colorMap.default }
        }
      >
        {isOpen && children}
      </div>
    </div>
  );
}

export { AccordionList, AccordionItem };
