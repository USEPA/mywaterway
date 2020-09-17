// @flow

import React from 'react';
import type { Node } from 'react';
import styled from 'styled-components';
// components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// contexts
import { LookupFilesContext } from 'contexts/LookupFiles';
// utilities
import { createMarkup } from 'utils/utils';

// --- styled components ---
const ErrorBox = styled(StyledErrorBox)`
  margin: 1rem;
  text-align: center;
`;

const ErrorBanner = styled.div`
  margin: 1rem;
  text-align: center;
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.color};
  padding: 10px 5px;
  text-align: center;
  p {
    padding: 0;
    margin: 0;
  }
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

  static contextType = LookupFilesContext;

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn(error);

    if (document.location.hostname === 'localhost') return;

    throw error;
  }

  render() {
    const notifications = this.context.notifications;
    const page = window.location.pathname.split('/')[1];
    const data = notifications.status === 'success' ? notifications.data : {};

    if (this.state.hasError) {
      return (
        <>
          {data && data['all'] && (
            <ErrorBanner
              color={data['all'].color}
              backgroundColor={data['all'].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data['all'].message)}
            />
          )}
          {data && Object.keys(data).includes(page) && (
            <ErrorBanner
              color={data[page].color}
              backgroundColor={data[page].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data[page].message)}
            />
          )}
          <ErrorBox>{this.props.message}</ErrorBox>
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
