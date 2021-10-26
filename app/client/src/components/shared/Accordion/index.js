// @flow

import React from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
import Select from 'react-select';
// styles
import { colors, reactSelectStyles } from 'styles/index.js';

const accordionListContainerStyles = css`
  border-bottom: 1px solid #d8dfe2;
`;

const columnsStyles = css`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const selectContainerStyles = css`
  display: flex;
  align-items: center;
  margin-bottom: 0.625em;
  width: 100%;
`;

const selectLabelStyles = css`
  margin-right: 0.625rem;
  margin-bottom: 0;
  font-size: 0.875rem;
  font-weight: bold;
  white-space: nowrap;
`;

const selectStyles = css`
  width: 100%;
`;

const expandButtonStyles = css`
  margin-bottom: 0;
  margin-left: 0.625rem;
  padding: 0.5em;
  font-size: 0.875em;
  font-weight: normal;
  color: ${colors.gray6};
  background-color: transparent;
  white-space: nowrap;
`;

const titleStyles = css`
  padding: 0.625em 0.875em;
  border-top: 1px solid #d8dfe2;
  border-bottom: 1px solid #d8dfe2;
  text-align: center;
  background-color: #f0f6f9;
`;

type AccordionListProps = {
  children: Node,
  className: string,
  title: Node,
  expandDisabled: boolean,
  sortOptions: { value: string, label: string }[],
  onSortChange: Function,
};

function AccordionList({
  children,
  className = '',
  title = null,
  expandDisabled = false,
  sortOptions = [],
  onSortChange = () => {},
}: AccordionListProps) {
  const [sortBy, setSortBy] = React.useState(
    sortOptions.length > 0 ? sortOptions[0] : null,
  );
  const [allExpanded, setAllExpanded] = React.useState(false);

  const iconClass = allExpanded
    ? 'far fa-caret-square-right'
    : 'far fa-caret-square-down';

  const buttonText = allExpanded ? 'Collapse All' : 'Expand All';

  // generate unique id for sorting label and dropdown
  const uniqueID = Date.now() + Math.random();

  return (
    <div
      css={accordionListContainerStyles}
      className={`hmw-accordions ${className}`}
    >
      <div css={columnsStyles}>
        {sortOptions.length > 0 && (
          <div css={selectContainerStyles}>
            <label css={selectLabelStyles} htmlFor={`sort-by-${uniqueID}`}>
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

        {!expandDisabled && (
          <button
            css={expandButtonStyles}
            onClick={(ev) => setAllExpanded(!allExpanded)}
          >
            {buttonText}&nbsp;&nbsp;
            <i className={iconClass} aria-hidden="true" />
          </button>
        )}
      </div>

      {title && <p css={titleStyles}>{title}</p>}

      {/* implicitly pass 'allExpanded' prop down to children (AccordionItem's) */}
      {React.Children.map(children, (childElement) => {
        return React.cloneElement(childElement, { allExpanded });
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
  padding-bottom: 0;
  word-break: break-word;
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
  children: Node,
  className: string,
  icon: ?Object,
  title: Node,
  subTitle: ?Node,
  status: ?string,
  onAddHighlight: () => void,
  onRemoveHighlight: () => void,
  onChange: (isOpen: boolean) => void,
  idKey: ?string,
  allExpanded: boolean,
  highlightContent: ?boolean,
};

function AccordionItem({
  children,
  className = '',
  icon,
  title,
  subTitle,
  status,
  onAddHighlight = () => {},
  onRemoveHighlight = () => {},
  onChange = () => {},
  idKey,
  allExpanded,
  highlightContent = true,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(allExpanded);

  React.useEffect(() => setIsOpen(allExpanded), [allExpanded]);

  const [backgroundColor, setBackgroundColor] = React.useState(
    colorMap.default,
  );
  React.useEffect(() => {
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
      className={`hmw-accordion ${className}`}
      onMouseEnter={(ev) => addHighlight()}
      onMouseLeave={(ev) => removeHighlight()}
      onFocus={(ev) => addHighlight()}
      onBlur={(ev) => removeHighlight()}
    >
      <header
        css={headerStyles}
        className="hmw-accordion-header"
        style={{ backgroundColor }}
        tabIndex="0"
        onClick={(ev) => {
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
      >
        {icon && <div css={iconStyles}>{icon}</div>}

        <span css={textStyles}>
          {title}
          {subTitle && (
            <>
              <br />
              {subTitle}
            </>
          )}
        </span>

        <i
          css={arrowStyles}
          className={`fa fa-angle-${isOpen ? 'down' : 'right'}`}
          aria-hidden="true"
        />
      </header>

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
