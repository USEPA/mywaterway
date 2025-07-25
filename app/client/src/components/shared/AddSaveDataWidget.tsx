/** @jsxImportSource @emotion/react */

import { Fragment, useContext, useState } from 'react';
import { css } from '@emotion/react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@reach/tabs';
// components
import { tabsStyles } from 'components/shared/ContentTabs';
import { DisclaimerModal } from 'components/shared/Modal';
import { linkButtonStyles } from 'components/shared/LinkButton';
import FilePanel from 'components/shared/AddSaveDataWidget.FilePanel';
import SavePanel from 'components/shared/AddSaveDataWidget.SavePanel';
import SearchPanel from 'components/shared/AddSaveDataWidget.SearchPanel';
import URLPanel from 'components/shared/AddSaveDataWidget.URLPanel';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext } from 'contexts/locationSearch';
// styles
import { fonts } from 'styles';

// --- styles (AddData) ---
const containerStyles = css`
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

const widgetHeaderStyles = css`
  width: 100%;
  height: 35px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #0071bc;
  color: white;

  h2 {
    margin: 0 10px;
    font-family: ${fonts.primary};
    font-size: 16px;
    line-height: 35px;
    padding: 0;
  }

  button {
    margin: 0;
  }
`;

const dragHandleStyles = css`
  width: calc(100% - 46.7px);
`;

const styledContentTabsStyles = css`
  ${tabsStyles}
  height: 100%;
`;

const footerBarStyles = css`
  height: 40px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f8f8;
`;

const pageControlStyles = css`
  color: black;
  background-color: transparent;
  padding: 3px;
  margin: 0 3px;

  &:disabled {
    background-color: inherit;
    cursor: default;
    opacity: 0.35;
  }

  &:hover,
  &:focus {
    background-color: inherit !important;
    color: inherit !important;
  }
`;

const buttonHiddenTextStyles = css`
  font:
    0/0 a,
    sans-serif;
  text-indent: -999em;
`;

const totalStyles = css`
  margin-left: 10px;
`;

const modifiedLinkButtonStyles = css`
  ${linkButtonStyles}
  margin-right: 20px;
  text-transform: uppercase;
  text-decoration: none;
  font-weight: normal;
  padding: 5px;
`;

const layerPanelStyles = (visible) => css`
  display: ${visible ? 'flex' : 'none'};
  flex-flow: column;
  height: 100%;

  h3 {
    font-family: ${fonts.primary};
    margin: 0;
    padding: 7px 15px;
    border-bottom: 1px solid #ccc;
    color: #898989;
    font-size: 16px;
    font-weight: normal;
  }
`;

const recordListStyles = css`
  overflow: auto;
  padding: 10px 15px;
`;

const recordContainerStyles = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const layerIconButtonStyles = css`
  margin: 0;
  color: black;
  background-color: transparent;
`;

// --- components (AddData) ---
function AddSaveDataWidget() {
  const { mapView } = useContext(LocationSearchContext);
  const {
    activeTabIndex,
    setActiveTabIndex,
    setAddSaveDataWidgetVisible,
    pageNumber,
    setPageNumber,
    searchResults,
    widgetLayers,
    setWidgetLayers,
  } = useAddSaveDataWidgetState();

  const [layerPanelVisible, setLayerPanelVisible] = useState(false);

  // Build an array of layers to display on the layers panel.
  // Note: ArcGIS Online has some group layers that are empty, these will not
  //  be displayed on the layers panel.
  const layersToDisplay = [];
  widgetLayers.forEach((layer) => {
    // directly add non-group layers
    if (layer.layer.type !== 'group') {
      layersToDisplay.push({ layer: layer.layer, title: layer.layer.title });
      return;
    }

    // for group layers, add each child layer separately
    layer.layer.layers.items
      .slice()
      .reverse()
      .forEach((childLayer) => {
        // filter out tables as they don't get displayed on the map
        if (childLayer.isTable) return;

        const title = `${layer.layer.title} - ${childLayer.title}`;
        layersToDisplay.push({ layer: childLayer, title });
      });
  });

  return (
    <Fragment>
      <div css={widgetHeaderStyles}>
        <div css={dragHandleStyles} className="drag-handle">
          <h2>Add & Save Data</h2>
        </div>
        <button
          onClick={() => {
            const widget = document.getElementById('add-save-data-widget');
            widget.classList.add('hidden');
            setAddSaveDataWidgetVisible(false);
          }}
        >
          X
        </button>
      </div>
      <div css={containerStyles}>
        <div
          css={styledContentTabsStyles}
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
              <Tab>Save</Tab>
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

              <TabPanel>
                <SavePanel visible={true} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
        <div css={layerPanelStyles(layerPanelVisible)}>
          <h3>Layers</h3>
          <div css={recordListStyles}>
            {layersToDisplay.length === 0 && (
              <div>No layers have been added.</div>
            )}
            {layersToDisplay.length > 0 &&
              layersToDisplay.map((item) => {
                return (
                  <div css={recordContainerStyles} key={item.layer.id}>
                    <span>{item.title}</span>
                    <div>
                      <button
                        css={layerIconButtonStyles}
                        className="esri-icon-zoom-in-magnifying-glass"
                        onClick={() => {
                          if (!item?.layer?.fullExtent) return;
                          mapView.goTo(item.layer.fullExtent);
                        }}
                      >
                        <span css={buttonHiddenTextStyles}>Zoom to Layer</span>
                      </button>
                      <button
                        css={layerIconButtonStyles}
                        className="esri-icon-trash"
                        onClick={() => {
                          if (
                            !item.layer.parent?.type ||
                            item.layer.parent.type !== 'group'
                          ) {
                            setWidgetLayers((currentWidgetLayers) =>
                              currentWidgetLayers.filter(
                                (widgetLayer) =>
                                  widgetLayer.layer.id !== item.layer.id,
                              ),
                            );
                            return;
                          }

                          // If the parent layer only has 1 layer left, remove the
                          // parent layer, otherwise just remove the layer from
                          // the parent layer.
                          if (item.layer.parent.layers.length > 1) {
                            item.layer.parent.remove(item.layer);
                          } else {
                            setWidgetLayers((currentWidgetLayers) =>
                              currentWidgetLayers.filter(
                                (widgetLayer) =>
                                  widgetLayer.layer.id !== item.layer.parent.id,
                              ),
                            );
                          }
                        }}
                      >
                        <span css={buttonHiddenTextStyles}>Delete Layer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
        <div css={footerBarStyles}>
          <div>
            {activeTabIndex === 0 && !layerPanelVisible && (
              <Fragment>
                <button
                  css={pageControlStyles}
                  disabled={pageNumber === 1 || !searchResults?.data}
                  onClick={() => setPageNumber(1)}
                >
                  <i className="fas fa-angle-double-left"></i>
                  <span css={buttonHiddenTextStyles}>Go to first page</span>
                </button>
                <button
                  css={pageControlStyles}
                  disabled={pageNumber === 1 || !searchResults?.data}
                  onClick={() => setPageNumber(pageNumber - 1)}
                >
                  <i className="fas fa-angle-left"></i>
                  <span css={buttonHiddenTextStyles}>Previous</span>
                </button>
                <span>{pageNumber}</span>
                <button
                  css={pageControlStyles}
                  disabled={
                    !searchResults?.data ||
                    searchResults.data.nextQueryParams?.start === -1
                  }
                  onClick={() => setPageNumber(pageNumber + 1)}
                >
                  <i className="fas fa-angle-right"></i>
                  <span css={buttonHiddenTextStyles}>Next</span>
                </button>
                <span css={totalStyles}>
                  {searchResults?.data?.total
                    ? searchResults.data.total.toLocaleString()
                    : 0}{' '}
                  Items
                </span>
              </Fragment>
            )}
          </div>
          <DisclaimerModal disclaimerKey="addSaveDataWidget" />
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => {
              setLayerPanelVisible(!layerPanelVisible);
            }}
          >
            {layerPanelVisible ? (
              <Fragment>
                Back <i className="fas fa-angle-double-right"></i>
              </Fragment>
            ) : (
              <Fragment>
                <i className="fas fa-layer-group"></i> Layers
              </Fragment>
            )}
          </button>
        </div>
      </div>
    </Fragment>
  );
}

export default AddSaveDataWidget;
