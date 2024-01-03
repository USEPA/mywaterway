// @flow

import React, { Component } from 'react';
import type { Node } from 'react';
import { css } from 'styled-components/macro';
// components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { LookupFilesContext } from 'contexts/LookupFiles';
// utilities
import { createMarkup } from 'utils/utils';

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  margin: 1rem;
  text-align: center;
`;

const errorBannerStyles = css`
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

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static contextType = LookupFilesContext;

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(error);

    try {
      throw error;
    } catch (err) {
      window.logErrorToGa(err, true);
    }
  }

  render() {
    const notifications = this.context.notifications;
    const page = window.location.pathname.split('/')[1];
    const data = notifications.status === 'success' ? notifications.data : {};

    if (this.state.hasError) {
      return (
        <>
          {data?.['all'] && (
            <div
              css={errorBannerStyles}
              color={data['all'].color}
              backgroundColor={data['all'].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data['all'].message)}
            />
          )}
          {data && Object.keys(data).includes(page) && (
            <div
              css={errorBannerStyles}
              color={data[page].color}
              backgroundColor={data[page].backgroundColor}
              dangerouslySetInnerHTML={createMarkup(data[page].message)}
            />
          )}
          <div css={modifiedErrorBoxStyles}>{this.props.message}</div>
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
