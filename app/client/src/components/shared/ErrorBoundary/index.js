// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
// components
import { StyledErrorBox } from 'components/shared/MessageBoxes';

// --- styled components ---
const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
  text-align: center;
`;

// --- components ---
type Props = {
  message: Node,
  children: Node,
};

type State = {
  hasError: boolean,
};

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(error);

    // log to google analytics
    if (window.isIdSet) {
      window.ga('send', 'exception', {
        exDescription: error,
        exFatal: true,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBox>{this.props.message}</ErrorBox>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
