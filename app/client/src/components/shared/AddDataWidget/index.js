// @flow

import React from 'react';
import styled from 'styled-components';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import { ContentTabs } from 'components/shared/ContentTabs';
import { LinkButton } from 'components/shared/LinkButton';
import FilePanel from 'components/shared/AddDataWidget/FilePanel';
import SearchPanel from 'components/shared/AddDataWidget/SearchPanel';
import URLPanel from 'components/shared/AddDataWidget/URLPanel';
// contexts
import { AddDataWidgetContext } from 'contexts/AddDataWidget';
// icons
import resizeIcon from '../Icons/resize.png';

// --- styles (AddData) ---
const Container = styled.div`
  height: calc(100% - 75px);

  [data-reach-tabs] {
    height: 100%;
  }

  [data-reach-tab-panels] {
    height: 100%;
    border: none !important;
    padding: 0 1px;
  }

  [data-reach-tab-panel] {
    display: flex;
    flex-flow: column;
    height: calc(100% - 30px);
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

const FooterBar = styled.div`
  height: 40px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f8f8;
`;

const PageControl = styled.button`
  color: black;
  background-color: transparent;
  padding: 3px;
  margin: 0 3px;

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }
`;

const ButtonHiddenText = styled.span`
  font: 0/0 a, sans-serif;
  text-indent: -999em;
`;

const Total = styled.span`
  margin-left: 10px;
`;

const StyledLinkButton = styled(LinkButton)`
  margin-right: 20px;
  text-transform: uppercase;
  text-decoration: none;
  font-weight: normal;
  padding: 5px;
`;

const ResizeHandle = styled.div`
  float: right;
  position: absolute;
  right: 0;
  bottom: 0;

  .fa-rotate-45 {
    transform: rotate(45deg);
  }

  .fa-rotate-315 {
    transform: rotate(315deg);
  }
`;

// --- components (AddData) ---
function AddDataWidget() {
  const {
    setAddDataWidgetVisible,
    pageNumber,
    setPageNumber,
    searchResults,
  } = React.useContext(AddDataWidgetContext);

  const [activeTabIndex, setActiveTabIndex] = React.useState(0);
  const [layerPanelVisible, setLayerPanelVisible] = React.useState(false);

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
        <StyledContentTabs
          style={{ display: layerPanelVisible ? 'none' : 'block' }}
        >
          <Tabs
            index={activeTabIndex}
            onChange={(index) => {
              setActiveTabIndex(index);
            }}
          >
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
        <div
          style={{
            display: layerPanelVisible ? 'block' : 'none',
            height: '100%',
          }}
        >
          Layers
        </div>
        <FooterBar>
          <div>
            {activeTabIndex === 0 && (
              <React.Fragment>
                <PageControl
                  disabled={pageNumber === 1 || !searchResults?.data}
                  onClick={() => setPageNumber(1)}
                >
                  <i className="fas fa-angle-double-left"></i>
                  <ButtonHiddenText>Go to first page</ButtonHiddenText>
                </PageControl>
                <PageControl
                  disabled={pageNumber === 1 || !searchResults?.data}
                  onClick={() => setPageNumber(pageNumber - 1)}
                >
                  <i className="fas fa-angle-left"></i>
                  <ButtonHiddenText>Previous</ButtonHiddenText>
                </PageControl>
                <span>{pageNumber}</span>
                <PageControl
                  disabled={
                    !searchResults?.data ||
                    searchResults.data.nextQueryParams?.start === -1
                  }
                  onClick={() => setPageNumber(pageNumber + 1)}
                >
                  <i className="fas fa-angle-right"></i>
                  <ButtonHiddenText>Next</ButtonHiddenText>
                </PageControl>
                <Total>
                  {searchResults?.data?.total
                    ? searchResults.data.total.toLocaleString()
                    : 0}{' '}
                  Items
                </Total>
              </React.Fragment>
            )}
          </div>
          <StyledLinkButton
            onClick={() => {
              setLayerPanelVisible(!layerPanelVisible);
            }}
          >
            {layerPanelVisible ? (
              <React.Fragment>
                Back <i class="fas fa-angle-double-right"></i>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <i class="fas fa-layer-group"></i> Layers
              </React.Fragment>
            )}
          </StyledLinkButton>
        </FooterBar>
      </Container>
      <ResizeHandle>
        <img src={resizeIcon} alt="Resize Handle"></img>
      </ResizeHandle>
    </React.Fragment>
  );
}

export default AddDataWidget;
