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
import { LocationSearchContext } from 'contexts/locationSearch';

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

const WidgetHeader = styled.div`
  width: 100%;
  height: 35px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #0071bc;
  color: white;

  h1 {
    margin: 0 10px;
    font-family: 'Source Sans Pro', 'Helvetica Neue', 'Helvetica', 'Roboto',
      'Arial', sans-serif;
    font-size: 16px;
    line-height: 35px;
    padding: 0;
  }

  button {
    margin: 0;
  }
`;

const DragHandle = styled.div`
  width: calc(100% - 46.7px);
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

const LayerPanel = styled.div`
  display: ${({ layerPanelVisible }) => (layerPanelVisible ? 'flex' : 'none')};
  flex-flow: column;
  height: 100%;
`;

const LayerPanelHeader = styled.h2`
  height: 40px;
  margin: 0;
  padding: 7px 15px;
  border-bottom: 1px solid #ccc;
  color: #898989;
  font-size: 16px;
  font-weight: normal;
  line-height: 2;
`;

const RecordList = styled.div`
  overflow: auto;
  padding: 10px 15px;
`;

const RecordContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DeleteButton = styled.button`
  margin: 0;
  color: black;
  background-color: transparent;
`;

// --- components (AddData) ---
function AddDataWidget() {
  const { mapView } = React.useContext(LocationSearchContext);
  const {
    setAddDataWidgetVisible,
    pageNumber,
    setPageNumber,
    searchResults,
    widgetLayers,
    setWidgetLayers,
  } = React.useContext(AddDataWidgetContext);

  const [activeTabIndex, setActiveTabIndex] = React.useState(0);
  const [layerPanelVisible, setLayerPanelVisible] = React.useState(false);

  // Build an array of layers to display on the layers panel.
  // Note: ArcGIS Online has some group layers that are empty, these will not
  //  be displayed on the layers panel.
  const layersToDisplay = [];
  widgetLayers.forEach((layer) => {
    // directly add non-group layers
    if (layer.type !== 'group') {
      layersToDisplay.push({ layer, title: layer.title });
      return;
    }

    // for group layers, add each child layer separately
    layer.layers.items
      .slice()
      .reverse()
      .forEach((childLayer) => {
        // filter out tables as they don't get displayed on the map
        if (childLayer.isTable) return;

        const title = `${layer.title} - ${childLayer.title}`;
        layersToDisplay.push({ layer: childLayer, title });
      });
  });

  return (
    <React.Fragment>
      <WidgetHeader>
        <DragHandle className="drag-handle">
          <h1>Add Data</h1>
        </DragHandle>
        <button
          onClick={() => {
            const widget = document.getElementById('add-data-widget');
            widget.classList.add('hidden');
            setAddDataWidgetVisible(false);
          }}
        >
          X
        </button>
      </WidgetHeader>
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
        <LayerPanel layerPanelVisible={layerPanelVisible}>
          <LayerPanelHeader>Layers</LayerPanelHeader>
          <RecordList>
            {layersToDisplay.length === 0 && (
              <div>No layers have been added.</div>
            )}
            {layersToDisplay.length > 0 &&
              layersToDisplay.map((item) => {
                return (
                  <RecordContainer key={item.layer.id}>
                    <label htmlFor={item.layer.id}>{item.title}</label>
                    <DeleteButton
                      id={item.layer.id}
                      className="esri-icon-trash"
                      onClick={() => {
                        if (
                          !item.layer.parent?.type ||
                          item.layer.parent.type !== 'group'
                        ) {
                          setWidgetLayers((widgetLayers) =>
                            widgetLayers.filter(
                              (widgetLayer) => widgetLayer.id !== item.layer.id,
                            ),
                          );
                          mapView.map.remove(item.layer);
                          return;
                        }

                        // If the parent layer only has 1 layer left, remove the
                        // parent layer, otherwise just remove the layer from
                        // the parent layer.
                        if (item.layer.parent.layers.length > 1) {
                          item.layer.parent.remove(item.layer);
                        } else {
                          setWidgetLayers((widgetLayers) =>
                            widgetLayers.filter(
                              (widgetLayer) =>
                                widgetLayer.id !== item.layer.parent.id,
                            ),
                          );
                          mapView.map.remove(item.layer.parent);
                        }
                      }}
                    ></DeleteButton>
                  </RecordContainer>
                );
              })}
          </RecordList>
        </LayerPanel>
        <FooterBar>
          <div>
            {activeTabIndex === 0 && !layerPanelVisible && (
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
                Back <i className="fas fa-angle-double-right"></i>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <i className="fas fa-layer-group"></i> Layers
              </React.Fragment>
            )}
          </StyledLinkButton>
        </FooterBar>
      </Container>
    </React.Fragment>
  );
}

export default AddDataWidget;
