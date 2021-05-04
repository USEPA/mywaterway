// @flow

import React from 'react';
import styled from 'styled-components';
// contexts
import { LocationSearchContext } from 'contexts/locationSearch';
import { MapHighlightContext } from 'contexts/MapHighlight';
// styles
import { colors } from 'styles/index.js';

// --- styled components ---
const Button = styled.button`
  &:hover,
  &:focus {
    background-color: ${colors.navyBlue()};
  }
  &:disabled {
    opacity: 0.65;
    cursor: default;
  }
`;

// --- components ---
type Props = {
  feature: Object,
  fieldName: ?fieldName,
  idField: ?string,
  layers: ?Array<Object>,
  customQuery: ?Function,
  onClick: ?Function,
  disabled: boolean,
};

function ViewOnMapButton({
  feature,
  fieldName,
  idField,
  layers,
  customQuery,
  onClick,
  disabled = false,
}: Props) {
  const {
    pointsLayer,
    linesLayer,
    areasLayer, //
  } = React.useContext(LocationSearchContext);

  const { setSelectedGraphic } = React.useContext(MapHighlightContext);

  function viewClick(feature: Object) {
    // update context with the new selected graphic
    feature.attributes['zoom'] = true;
    feature.attributes['fieldName'] =
      !fieldName && feature.attributes.assessmentunitidentifier
        ? 'Waterbody'
        : fieldName;
    setSelectedGraphic(feature);
  }

  const {
    organizationid: orgId,
    assessmentunitidentifier: auId,
  } = feature.attributes;

  // Get the geometry by querying all of the feature layers.
  // The layers are processed in order of decreasing level of detail.
  // Uses the organizationid and assessmentunitidentifier to get the item.
  function getGeometry(callback: Function) {
    let searchLayers = [areasLayer, linesLayer, pointsLayer];
    if (layers) searchLayers = layers;

    if (searchLayers.length === 0) return;

    // Recursive function for querying each layer. Once the item is found
    // no additional layers will be queried.
    function queryLayers(index = 0) {
      const layer = searchLayers[index];
      if (layer.type === 'feature') {
        const params = layer.createQuery();
        params.returnGeometry = true;
        params.where = idField
          ? `${idField} = '${feature.attributes[idField]}'`
          : `organizationid = '${orgId}' And assessmentunitidentifier = '${auId}'`;
        params.outFields = ['*'];
        layer
          .queryFeatures(params)
          .then((res) => {
            // if the feature was found, execute the call back and return
            if (res.features.length > 0) {
              callback(res.features[0]);
              return; // exit recursive function
            }
            // if there are more layers query the next layer in the array
            if (index < searchLayers.length) {
              queryLayers(index + 1); // recursive call
            }
          })
          .catch((err) => console.error(err));
      } else if (layer.type === 'graphics') {
        const { organizationid } = feature.attributes;

        for (const graphic of layer.graphics.items) {
          const graphicOrgId =
            graphic && graphic.attributes && graphic.attributes.organizationid;
          const graphicAuId =
            graphic &&
            graphic.attributes &&
            graphic.attributes.assessmentunitidentifier;
          if (graphicOrgId === organizationid && graphicAuId === auId) {
            callback(graphic);
            return;
          }
        }

        // continue recursive call if there are more layers
        if (index + 1 <= searchLayers.length) queryLayers(index + 1);
      }
    }

    queryLayers(); // initiate the recursive layer query
  }

  return (
    <Button
      onClick={(ev) => {
        if (onClick) onClick();

        if (!feature) return;
        if (feature.geometry) {
          viewClick(feature);
        } else if (customQuery) {
          customQuery(viewClick);
        } else {
          getGeometry((feature) => viewClick(feature));
        }
      }}
      disabled={disabled}
    >
      <i className="fas fa-map-marker-alt" aria-hidden="true" />
      &nbsp;&nbsp;View on Map
    </Button>
  );
}

export default ViewOnMapButton;
