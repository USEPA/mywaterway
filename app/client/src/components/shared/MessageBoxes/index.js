// @flow

import styled from 'styled-components';

// --- styled components ---
const Box = styled.div`
  padding: 0.5em 0.75em;
  border-width: 1px;
  border-style: solid;
  border-radius: 0.25em;

  p {
    margin-top: 0.75em;
    padding-bottom: 0;

    :first-of-type {
      margin-top: 0;
    }
  }
`;

const StyledTextBox = styled(Box)`
  border-color: #ded9d9;
  color: #444;
  background-color: #f9f9f9;
`;

const StyledInfoBox = styled(Box)`
  border-color: #bee5eb;
  color: #0c5460;
  background-color: #d1ecf1;
`;

const StyledSuccessBox = styled(Box)`
  border-color: #c3e6cb;
  color: #155724;
  background-color: #d4edda;
`;

const StyledErrorBox = styled(Box)`
  border-color: #f5c6cb;
  color: #721c24;
  background-color: #f8d7da;
`;

const StyledNoteBox = styled(Box)`
  border-color: #d8dfe2;
  color: #444;
  background-color: #f0f6f9;
`;

export {
  StyledTextBox,
  StyledInfoBox,
  StyledSuccessBox,
  StyledErrorBox,
  StyledNoteBox,
};
