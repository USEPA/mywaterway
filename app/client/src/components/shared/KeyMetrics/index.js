// @flow

import styled from 'styled-components';

// --- styled components ---
export const StyledMetrics = styled.div`
  display: flex;
  margin-bottom: 1em;
`;

export const StyledMetric = styled.div`
  flex: 1;
  padding: 0 0.25em;
  text-align: center;
`;

export const StyledNumber = styled.span`
  display: block;
  padding-bottom: 0.25rem;
  font-size: 1.875em;
  font-weight: bold;

  @media (max-width: 400px) {
    font-size: 1.1em;
  }
`;

export const StyledLabel = styled.p`
  padding-bottom: 0;
  font-size: 0.8125em;

  @media (min-width: 400px) {
    font-size: 0.9375em;
  }
`;
