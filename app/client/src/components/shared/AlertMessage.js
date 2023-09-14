// @flow

import React from 'react';
import { css } from 'styled-components/macro';
import { useLocation } from 'react-router-dom';
// styles
import { colors } from 'styles/index';
// contexts
import { useNotificationsContext } from 'contexts/LookupFiles';
// utilities
import { createMarkup } from 'utils/utils';

const bannerStyles = (color, backgroundColor) => {
  return css`
    background-color: ${backgroundColor};
    color: ${color};
    width: 100%;
    margin: 0 auto;
    padding: 10px 5px;
    text-align: center;

    p {
      padding: 0;
      margin: 0;
    }
  `;
};

const separatorStyles = css`
  margin: 0;
  background-color: ${colors.gray9};
`;

function AlertMessage() {
  const location = useLocation();

  const notifications = useNotificationsContext();

  if (notifications.status === 'failure') return null;

  if (notifications.status === 'fetching') return null;

  if (notifications.status === 'success') {
    if (!notifications.data || Object.keys(notifications.data).length === 0) {
      return null;
    }

    const data = notifications.data;

    // create a banner that applies to all pages
    const allPagesBanner = data?.['all'] && (
      <div
        css={bannerStyles(data['all'].color, data['all'].backgroundColor)}
        dangerouslySetInnerHTML={createMarkup(data['all'].message)}
        data-testid="all-pages-notifications-banner"
      ></div>
    );

    // parse page name out of url:
    // localhost:3000/community/dc/overview would be 'community'
    const page = location.pathname.split('/')[1];

    const specificPageBanner = data && Object.keys(data).includes(page) && (
      <div
        css={bannerStyles(data[page].color, data[page].backgroundColor)}
        dangerouslySetInnerHTML={createMarkup(data[page].message)}
        data-testid="specific-page-notifications-banner"
      ></div>
    );

    return (
      <>
        {allPagesBanner}

        {/* if both banners have content render a HR element between them. */}
        {allPagesBanner && specificPageBanner && <hr css={separatorStyles} />}

        {specificPageBanner}
      </>
    );
  }
}

export default AlertMessage;
