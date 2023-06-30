// @flow

import { css } from 'styled-components/macro';
// contexts
import { useLayers } from 'contexts/Layers';
import { useMapHighlightState } from 'contexts/MapHighlight';
// styles
import { colors } from 'styles/index.js';

const buttonStyles = css`
  margin-bottom: 0;
  font-size: 0.875em;

  @media (min-width: 560px) {
    font-size: 1em;
  }

  &:not([disabled]):hover,
  &:not([disabled]):focus {
    background-color: ${colors.navyBlue()};
  }

  &:disabled {
    opacity: 0.625;
    cursor: default;
  }
`;

type Props = {
  feature: Object,
  fieldName?: string,
  idField?: string,
  layers?: Array<Object>,
  customQuery?: Function,
  onClick?: Function,
  disabled?: boolean,
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
  const { waterbodyPoints, waterbodyLines, waterbodyAreas } = useLayers();

  const { setSelectedGraphic } = useMapHighlightState();

  function viewClick(featureParam) {
    // update context with the new selected graphic
    featureParam.attributes.zoom = true;
    featureParam.attributes.fieldName =
      !fieldName && featureParam.attributes.assessmentunitidentifier
        ? 'Waterbody'
        : fieldName;

    setSelectedGraphic(featureParam);
  }

  const { organizationid, assessmentunitidentifier } = feature.attributes;

  // Get the geometry by querying all of the feature layers.
  // The layers are processed in order of decreasing level of detail.
  // Uses the organizationid and assessmentunitidentifier to get the item.
  function getGeometry(callback: Function) {
    let searchLayers = [waterbodyAreas, waterbodyLines, waterbodyPoints];
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
          : `organizationid = '${organizationid}' And assessmentunitidentifier = '${assessmentunitidentifier}'`;
        params.outFields = ['*'];
        params.outSpatialReference = 102100;
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
      }

      if (layer.type === 'graphics') {
        for (const graphic of layer.graphics.items) {
          const graphicOrgId = graphic?.attributes?.organizationid;
          const graphicAuId = graphic?.attributes?.assessmentunitidentifier;
          if (
            graphicOrgId === organizationid &&
            graphicAuId === assessmentunitidentifier
          ) {
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
    <button
      css={buttonStyles}
      onClick={(_ev) => {
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
    </button>
  );
}

export default ViewOnMapButton;
