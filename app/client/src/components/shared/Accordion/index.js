// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
import Select from 'react-select';
// styles
import { colors, reactSelectStyles } from 'styles/index.js';

// --- styled components (AccordionList) ---
const AccordionListContainer = styled.div`
  border-bottom: 1px solid #d8dfe2;
`;

const Columns = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const SelectContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.625em;
  width: 100%;
`;

const SelectLabel = styled.label`
  margin-right: 0.625rem;
  margin-bottom: 0;
  font-size: 0.875rem;
  font-weight: bold;
  white-space: nowrap;
`;

const StyledSelect = styled(Select)`
  width: 100%;
`;

const ExpandButton = styled.button`
  margin-bottom: 0;
  margin-left: 0.625rem;
  padding: 0.5em;
  font-size: 0.875em;
  font-weight: normal;
  color: ${colors.gray6};
  background-color: transparent;
  white-space: nowrap;
`;

const Title = styled.p`
  padding: 0.625em 0.875em;
  border-top: 1px solid #d8dfe2;
  border-bottom: 1px solid #d8dfe2;
  text-align: center;
  background-color: #f0f6f9;
`;

// --- components (AccordionList) ---
type AccordionListProps = {
  children: Node,
  className: string,
  title: string,
  expandDisabled: boolean,
  sortOptions: Array<{ value: string, label: string }>,
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
  const [
    sortBy,
    setSortBy, //
  ] = React.useState(sortOptions.length > 0 ? sortOptions[0] : null);
  const [allExpanded, setAllExpanded] = React.useState(false);

  const iconClass = allExpanded
    ? 'far fa-caret-square-right'
    : 'far fa-caret-square-down';

  const buttonText = allExpanded ? 'Collapse All' : 'Expand All';

  // generate unique id for sorting label and dropdown
  const uniqueID = Date.now() + Math.random();

  return (
    <AccordionListContainer className={`hmw-accordions ${className}`}>
      <Columns>
        {sortOptions.length > 0 && (
          <SelectContainer>
            <SelectLabel htmlFor={`sort-by-${uniqueID}`}>Sort By:</SelectLabel>
            <StyledSelect
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
          </SelectContainer>
        )}

        {!expandDisabled && (
          <ExpandButton onClick={(ev) => setAllExpanded(!allExpanded)}>
            {buttonText}&nbsp;&nbsp;
            <i className={iconClass} aria-hidden="true" />
          </ExpandButton>
        )}
      </Columns>

      {title && <Title>{title}</Title>}

      {/* implicitly pass 'allExpanded' prop down to children (AccordionItem's) */}
      {React.Children.map(children, (childElement) => {
        return React.cloneElement(childElement, { allExpanded });
      })}
    </AccordionListContainer>
  );
}

// defaultProp set here just to satisfy flow, even though props are passed as a default function params
AccordionList.defaultProps = {
  expandDisabled: false,
  sortOptions: [],
  onSortChange: () => {},
};

// --- styled components (AccordionItem) ---
const AccordionItemContainer = styled.div`
  border-top: 1px solid #d8dfe2;
`;

const Header = styled.header`
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

const Icon = styled.div`
  margin-right: 0.875em;
`;

const Text = styled.span`
  flex: 1;
  padding-bottom: 0;
  word-break: break-word;
`;

const Arrow = styled.i`
  font-size: 1.25em;
  color: #526571;
`;

const colorMap = {
  default: 'white',
  highlighted: '#f0f6f9',
  selected: 'rgba(0, 123, 255, 0.25)',
};

// --- components (AccordionItem) ---
type AccordionItemProps = {
  className: string,
  icon: ?Object,
  title: Node,
  subTitle: ?Node,
  status: ?string,
  onAddHighlight: Function,
  onRemoveHighlight: Function,
  onChange: (isOpen: boolean) => void,
  idKey: ?string,
  allExpanded: boolean,
  highlightContent: ?boolean,
  children: Node,
};

function AccordionItem({
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
  children,
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
    <AccordionItemContainer
      className={`hmw-accordion ${className}`}
      onMouseEnter={(ev) => addHighlight()}
      onMouseLeave={(ev) => removeHighlight()}
      onFocus={(ev) => addHighlight()}
      onBlur={(ev) => removeHighlight()}
    >
      <Header
        className="hmw-accordion-header"
        tabIndex="0"
        style={{ backgroundColor }}
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
        {icon && <Icon>{icon}</Icon>}

        <Text>
          {title}
          {subTitle && (
            <>
              <br />
              {subTitle}
            </>
          )}
        </Text>

        <Arrow
          className={`fa fa-angle-${isOpen ? 'down' : 'right'}`}
          aria-hidden="true"
        />
      </Header>

      <div
        style={
          highlightContent
            ? { backgroundColor }
            : { backgroundColor: colorMap.default }
        }
      >
        {isOpen && children}
      </div>
    </AccordionItemContainer>
  );
}

export { AccordionList, AccordionItem };
