import { useEffect, useRef } from 'react';
import 'rc-tooltip/assets/bootstrap.css';
import Slider from 'rc-slider';
import raf from 'rc-util/lib/raf';
import Tooltip from 'rc-tooltip';

function HandleTooltip({
  value,
  children,
  visible,
  tipFormatter = (val) => val,
  ...props
}) {
  const tooltipRef = useRef();
  const rafRef = useRef(null);

  function cancelKeepAlign() {
    if (rafRef.current) raf.cancel(rafRef.current);
  }

  function keepAlign() {
    rafRef.current = raf(() => {
      tooltipRef.current?.forcePopupAlign();
    });
  }

  useEffect(() => {
    if (visible) {
      keepAlign();
    } else {
      cancelKeepAlign();
    }

    return cancelKeepAlign;
  }, [value, visible]);

  return (
    <Tooltip
      placement="top"
      overlay={tipFormatter(value)}
      overlayInnerStyle={{ minHeight: 'auto' }}
      ref={tooltipRef}
      visible={visible}
      {...props}
    >
      {children}
    </Tooltip>
  );
}

function TooltipSlider({ tipFormatter, tipProps, ...props }) {
  const tipHandleRender = (node, handleProps) => {
    return (
      <HandleTooltip
        value={handleProps.value}
        visible={handleProps.dragging}
        tipFormatter={tipFormatter}
        {...tipProps}
      >
        {node}
      </HandleTooltip>
    );
  };

  return <Slider {...props} handleRender={tipHandleRender} />;
}

export default TooltipSlider;
