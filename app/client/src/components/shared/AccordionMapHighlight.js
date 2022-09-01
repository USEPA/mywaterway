// @flow

import React, { useContext, useState, useCallback, useEffect } from 'react';
import type { Node } from 'react';
// components
import {
  AccordionList,
  AccordionItem as AccordionItemSimple,
} from 'components/shared/Accordion';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';

type AccordionItemProps = {
  icon: ?Object,
  mapIcon: Object,
  title: Node,
  subTitle: ?Node,
  feature: ?Object,
  idKey: ?string,
  allExpanded: boolean,
  onChange: (isOpen: boolean) => void,
  children: Node,
};

function AccordionItem({
  icon,
  mapIcon, // icon for highlights on the esri map
  title,
  subTitle,
  feature,
  idKey,
  allExpanded,
  onChange = () => {},
  children,
}: AccordionItemProps) {
  const { mapView } = useContext(LocationSearchContext);

  const { highlightedGraphic, selectedGraphic, setHighlightedGraphic } =
    useMapHighlightState();

  // the accordion item's highlight status
  const [status, setStatus] = useState(null);

  const checkHighlight = useCallback(() => {
    // ensure the key exists prior to deciding to highlight
    if (feature && feature.attributes && feature.attributes[idKey]) {
      const id = feature.attributes[idKey];

      const isSelected =
        selectedGraphic && selectedGraphic.attributes
          ? selectedGraphic.attributes[idKey] === id
          : false;

      const isHighlighted =
        highlightedGraphic && highlightedGraphic.attributes
          ? highlightedGraphic.attributes[idKey] === id
          : false;

      if (isSelected) setStatus('selected');
      else if (isHighlighted && !isSelected) setStatus('highlighted');
      else setStatus(null);
    } else setStatus(null);
  }, [feature, highlightedGraphic, idKey, selectedGraphic]);

  useEffect(() => {
    checkHighlight();
  }, [checkHighlight, feature, highlightedGraphic, selectedGraphic]);

  const addHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(feature);
    checkHighlight();
  };

  const removeHighlight = () => {
    if (!feature || !mapView) return;
    setHighlightedGraphic(null);
    checkHighlight();
  };

  return (
    <AccordionItemSimple
      icon={icon}
      mapIcon={mapIcon}
      title={title}
      subTitle={subTitle}
      status={status}
      onAddHighlight={addHighlight}
      onRemoveHighlight={removeHighlight}
      idKey={idKey}
      allExpanded={allExpanded}
      onChange={onChange}
    >
      {children}
    </AccordionItemSimple>
  );
}

export { AccordionList, AccordionItem };
