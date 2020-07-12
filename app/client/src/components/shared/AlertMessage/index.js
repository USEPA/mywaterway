// @flow

import React from 'react';
import styled from 'styled-components';
import data from './data';

// --- components ---
type Props = {};

function AlertMessage({ ...props }: Props) {
  React.useEffect(() => {
    console.log('mounted');
    console.log(data);
  });

  return (
    <div>
      {/* on mount, check if localhost. if localhost, use the local public/data.json. */}
      {/* if not localhost, fetch from S3 */}

      {/* put this component at of of app index. Page component? and
 check Amazon extension banner for how to static append to top of page */}

      {/* class=data.json className */}
      {/* data.json.forEach() */}
      {/* if window.location.path === data.json, show message on that page.... */}

      {/* if data.json is empty or {}, then return null in this component */}

      {/* To create a fixed top menu, use position:fixed and top:0. 
 Note that the fixed menu will overlay your other content. 
 To fix this, add a margin-top (to the content) that is equal or larger than the height of your menu. */}

      <p>TEST CONTENT</p>
    </div>
  );
}

export default AlertMessage;
