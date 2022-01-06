// @flow

import styled, { css } from 'styled-components';

const StyledMetrics = styled.div`
  display: flex;
  margin-bottom: 1em;
`;

const StyledMetric = styled.div`
  flex: 1;
  padding: 0 0.25em;
  text-align: center;
`;

const StyledNumber = styled.span`
  display: block;
  padding-bottom: 0.25rem;
  font-size: 1.875em;
  font-weight: bold;

  @media (max-width: 400px) {
    font-size: 1.1em;
  }
`;

const StyledLabel = styled.p`
  padding-bottom: 0;
  font-size: 0.8125em;

  @media (min-width: 400px) {
    font-size: 0.9375em;
  }
`;

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
  font-size: 1.875em;
  font-weight: bold;

  @media (max-width: 400px) {
    font-size: 1.1em;
  }
`;

const keyMetricLabelStyles = css`
  padding-bottom: 0;
  font-size: 0.8125em;

  @media (min-width: 400px) {
    font-size: 0.9375em;
  }
`;

export {
  StyledMetrics, // TODO: remove
  StyledMetric, // TODO: remove
  StyledNumber, // TODO: remove
  StyledLabel, // TODO: remove
  keyMetricsStyles,
  keyMetricStyles,
  keyMetricNumberStyles,
  keyMetricLabelStyles,
};
