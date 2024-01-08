// @flow

import { css } from '@emotion/react';

const keyMetricsStyles = css`
  display: flex;
  margin-bottom: 1em;
`;

const keyMetricStyles = css`
  flex: 1;
  padding: 0 0.25em;
  text-align: center;
`;

const keyMetricNumberStyles = css`
  display: block;
  padding-bottom: 0.25rem;
  font-size: 1.375em;
  font-weight: bold;

  @media (min-width: 560px) {
    font-size: 1.875em;
  }
`;

const keyMetricLabelStyles = css`
  padding-bottom: 0;
  font-size: 0.8125em;

  @media (min-width: 560px) {
    font-size: 0.9375em;
  }
`;

export {
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
};
