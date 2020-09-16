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

const Banner = styled.div`
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(error);
  }

  render() {
    const notifications = this.context.notifications;
    const page = window.location.pathname.split('/')[1];
    const data = notifications.status === 'success' ? notifications.data : {};

    const allPagesBanner = data && data['all'] && (
      <Banner
        color={data['all'].color}
        backgroundColor={data['all'].backgroundColor}
        dangerouslySetInnerHTML={createMarkup(data['all'].message)}
      ></Banner>
    );

    if (this.state.hasError) {
      return (
        <>
          {data && Object.keys(data).includes(page) && (
            <Banner
              color={data[page].color}
              backgroundColor={data[page].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data[page].message)}
            ></Banner>
          )}
          {data && Object.keys(data).includes(page) && (
            <Banner
              color={data[page].color}
              backgroundColor={data[page].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data[page].message)}
            ></Banner>
          )}
          <ErrorBox>{this.props.message}</ErrorBox>
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
