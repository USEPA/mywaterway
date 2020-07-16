// @flow

import React from 'react';
import styled from 'styled-components';
import { globalHistory } from '@reach/router';
// styles
import { colors } from 'styles/index.js';
// contexts
import { useNotificationsContext } from 'contexts/LookupFiles';
// utilities
import { createMarkup } from 'utils/utils';

// --- components ---
type Props = {};

// --- styled components ---
const Banner = styled.div`
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.color};
  width: 100%;
  margin: 0 auto;
  padding: 10px 5px;
  text-align: center;

  p {
    padding: 0;
    margin: 0;
  }
`;

const Separator = styled.hr`
  margin: 0;
  background-color: ${colors.gray9};
`;

function AlertMessage({ ...props }: Props) {
  const notifications = useNotificationsContext();

  const [pathname, setPathname] = React.useState('');

  if (notifications.status === 'failure') return null;

  if (notifications.status === 'fetching') return null;

  if (notifications.status === 'success') {
    if (!notifications.data || Object.keys(notifications.data).length === 0) {
      return null;
    }

    const data = notifications.data;

    if (pathname !== window.location.pathname) {
      setPathname(window.location.pathname);
    }

    // watch for history changes that wouldn't trigger a re-render of this component
    globalHistory.listen(() => {
      if (pathname !== window.location.pathname) {
        setPathname(window.location.pathname);
      }
    });

    // create a banner that applies to all pages
    const allPagesBanner = data && data['all'] && (
      <Banner
        color={data['all'].color}
        backgroundColor={data['all'].backgroundColor}
        dangerouslySetInnerHTML={createMarkup(data['all'].message)}
      ></Banner>
    );

    // parse page name out of url:
    // localhost:3000/community/dc/overview would be 'community'
    const page = pathname.split('/')[1];

    const specificPageBanner = data && Object.keys(data).includes(page) && (
      <Banner
        color={data[page].color}
        backgroundColor={data[page].backgroundColor}
        dangerouslySetInnerHTML={createMarkup(data[page].message)}
      ></Banner>
    );

    return (
      <>
        {allPagesBanner}

        {/* if both banners have content render a HR element between them. */}
        {allPagesBanner && specificPageBanner && <Separator />}

        {specificPageBanner}
      </>
    );
  }
}

export default AlertMessage;
