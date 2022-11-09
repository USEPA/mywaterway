import { useCallback, useContext, useEffect, useState } from 'react';
// components
import {
  AccordionList,
  AccordionItem as AccordionItemSimple,
} from 'components/shared/Accordion';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { useMapHighlightState } from 'contexts/MapHighlight';
// types
import type { ReactNode } from 'react';

type AccordionItemProps = {
  icon?: Object;
  title: ReactNode;
  subTitle?: ReactNode;
  feature?: __esri.Graphic;
  idKey?: string;
  allExpanded: boolean;
  onChange: (isOpen: boolean) => void;
  children: ReactNode;
};

function AccordionItem({
  icon,
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
  const [status, setStatus] = useState<string | null>(null);

  const checkHighlight = useCallback(() => {
    // ensure the key exists prior to deciding to highlight
    if (idKey && feature?.attributes?.[idKey]) {
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
      title={title}
      subTitle={subTitle}
      status={status}
      onAddHighlight={addHighlight}
      onRemoveHighlight={removeHighlight}
      allExpanded={allExpanded}
      onChange={onChange}
    >
      {children}
    </AccordionItemSimple>
  );
}

export { AccordionList, AccordionItem };
