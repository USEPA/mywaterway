// @flow

import styled from 'styled-components';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const StyledIntroBox = styled.div`
  background-color: whitesmoke;
  padding: 2rem;
`;

const StyledIntroHeading = styled.h2`
  text-align: center;
  font-family: ${fonts.primary};
`;

const StyledIntroText = styled.p`
  padding-bottom: 0;
  font-size: 1.25rem;
  font-weight: 300;
  line-height: 1.5;
`;

export { StyledIntroBox, StyledIntroHeading, StyledIntroText };
