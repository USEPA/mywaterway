// @flow

import React from 'react';
import styled from 'styled-components';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import { ContentTabs } from 'components/shared/ContentTabs';
import FilePanel from 'components/shared/AddDataWidget/FilePanel';
import SearchPanel from 'components/shared/AddDataWidget/SearchPanel';
import URLPanel from 'components/shared/AddDataWidget/URLPanel';
// contexts
import { AddDataWidgetContext } from 'contexts/AddDataWidget';

// --- styles (AddData) ---
const Container = styled.div`
  height: calc(100% - 75px);

  [data-reach-tabs] {
    height: 100%;
  }

  [data-reach-tab-panels] {
    height: 100%;
    border: none !important;
  }

  [data-reach-tab-panel] {
    height: calc(100% - 40px);
    padding: 0 !important;

    h3 {
      margin: 0 5px;
      padding: 0;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.3;
    }
  }
`;

const StyledContentTabs = styled(ContentTabs)`
  height: 100%;
`;

// --- components (AddData) ---
function AddDataWidget() {
  const { setAddDataWidgetVisible } = React.useContext(AddDataWidgetContext);

  return (
    <React.Fragment>
      <div
        className="drag-handle"
        style={{
          width: '100%',
          height: '35px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#0071bc',
          color: 'white',
        }}
      >
        <strong style={{ margin: '0 10px' }}>Add Data</strong>
        <button
          style={{ margin: '0' }}
          onClick={() => {
            setAddDataWidgetVisible(false);
          }}
        >
          X
        </button>
      </div>
      <Container>
        <StyledContentTabs>
          <Tabs>
            <TabList>
              <Tab>Search</Tab>
              <Tab>URL</Tab>
              <Tab>File</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <SearchPanel />
              </TabPanel>

              <TabPanel>
                <URLPanel />
              </TabPanel>

              <TabPanel>
                <FilePanel />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </StyledContentTabs>
        <div style={{ height: '40px', width: '100%' }}>
          Bottom toolbar goes here
        </div>
      </Container>
      <div
        className="drag-handle"
        style={{
          float: 'right',
          position: 'absolute',
          right: 0,
          bottom: 0,
        }}
      >
        Handle
      </div>
    </React.Fragment>
  );
}

export default AddDataWidget;
