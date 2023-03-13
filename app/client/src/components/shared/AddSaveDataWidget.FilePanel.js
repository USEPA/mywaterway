// @flow

import React, {
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { css } from 'styled-components/macro';
import { useDropzone } from 'react-dropzone';
import { DialogOverlay, DialogContent } from '@reach/dialog';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Field from '@arcgis/core/layers/support/Field';
import Graphic from '@arcgis/core/Graphic';
import * as rendererJsonUtils from '@arcgis/core/renderers/support/jsonUtils';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles, noteBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useAddSaveDataWidgetState } from 'contexts/AddSaveDataWidget';
import { LocationSearchContext } from 'contexts/locationSearch';
// utils
import { fetchPostFile, fetchPostForm } from 'utils/fetchUtils';
import { getSimplePopupTemplate } from 'utils/utils';
// config
import {
  fileReadErrorMessage,
  importErrorMessage,
  invalidFileTypeMessage,
  noDataMessage,
  uploadSuccessMessage,
  webServiceErrorMessage,
} from 'config/errorMessages';
// styles
import { colors } from 'styles/index.js';

/**
 * Gets the number from the last parentheses. If the value
 * is not a number NaN is returned.
 *
 * @param str String to get number in last parentheses
 * @returns number in last set of parentheses or NaN if no parentheses
 */
function getNumberFromParen(str: string) {
  const splitLabel = str.split('(');
  return parseInt(splitLabel[splitLabel.length - 1].replace(')', ''));
}

/**
 * Determines if the desired name has already been used. If it has
 * it appends in index to the end (i.e. '<desiredName> (2)').
 * 
 * @param layers Layers to search in for determining if name is in use
 * @param desiredName Name to check if in use 
 * @returns The desired name with in index value if it is already in use
 */
function getLayerName(layers, desiredName) {
  const numInDesiredName = getNumberFromParen(desiredName);
  let newName =
    numInDesiredName || numInDesiredName === 0
      ? desiredName.replace(`(${numInDesiredName})`, '').trim()
      : desiredName;

  // get a list of names in use
  let duplicateCount = 0;
  layers.forEach((layer) => {
    // remove any counts from the end of the name to ge an accurate count
    // for the new name
    const numInParen = getNumberFromParen(layer.layer.title);
    const possibleName =
      numInParen || numInParen === 0
        ? layer.layer.title.replaceAll(`(${numInParen})`, '').trim()
        : layer.layer.title;

    if (possibleName === newName) duplicateCount += 1;
  });

  if (duplicateCount === 0) return newName;
  else
    return `${newName} (${
      duplicateCount === numInDesiredName ? duplicateCount + 1 : duplicateCount
    })`;
}

// --- styles (FileIcon) ---
const overlayStyles = css`
  &[data-reach-dialog-overlay] {
    z-index: 1000;
    background-color: ${colors.black(0.75)};
  }
`;

const contentStyles = css`
  &[data-reach-dialog-content] {
    position: relative;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    margin: 0;
    padding: 1.5rem;
    width: auto;
    max-width: 25rem;
  }

  p {
    margin-top: 1rem;
    margin-bottom: 0;
    padding-bottom: 0;
    font-size: 0.875rem;
    line-height: 1.375;

    &:first-of-type {
      margin-top: 0;
    }
  }

  ul {
    margin-bottom: 0;
    padding-bottom: 0;
  }
`;

const closeButtonStyles = css`
  position: absolute;
  top: 0;
  right: 0;
  padding: 0;
  border: none;
  width: 1.5rem;
  height: 1.5rem;
  color: white;
  background-color: ${colors.black(0.5)};

  &:hover,
  &:focus {
    background-color: ${colors.black(0.75)};
  }
`;

const fileIconOuterContainerStyles = css`
  width: 2em;
  line-height: 1;
  margin: 2px;
`;

const fileIconContainerStyles = css`
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  vertical-align: middle;
`;

const fileIconIStyles = css`
  color: #e6e8ed;
  width: 100%;
`;

const fileIconTextColor = `
  color: #545454;
`;

const fileIconTextColorDivStyles = css`
  ${fileIconTextColor}
`;

const fileIconTextStyles = css`
  ${fileIconTextColor}
  font-size: 16px;
  margin-top: 5px;
  width: 100%;
`;

const checkBoxStyles = css`
  margin-right: 5px;
`;

const helpIconStyles = css`
  position: absolute;
  top: 5px;
  right: 5px;
  color: #485566;
`;

// --- components (FileIcon) ---
type FileIconProps = {
  label: string,
};

function FileIcon({ label }: FileIconProps) {
  return (
    <span css={fileIconOuterContainerStyles} className="fa-stack fa-2x">
      <span css={fileIconContainerStyles}>
        <i css={fileIconIStyles} className="fas fa-file fa-stack-2x"></i>
        <span css={fileIconTextStyles} className="fa-stack-text fa-stack-1x">
          {label}
        </span>
      </span>
    </span>
  );
}

// --- styles (FilePanel) ---
const MessageBoxStyles = `
  margin-bottom: 10px;
  overflow-wrap: anywhere;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}
  ${MessageBoxStyles}
`;

const modifiedNoteBoxStyles = css`
  ${noteBoxStyles}
  ${MessageBoxStyles}
`;

const searchContainerStyles = css`
  height: 100%;
  overflow: auto;
  padding: 1em;

  .dropzone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    border-width: 2px;
    border-radius: 2px;
    border-color: #eee;
    border-style: dashed;
    background-color: #fafafa;
    color: #bdbdbd;
    outline: none;
    transition: border 0.24s ease-in-out;
    text-align: center;

    .div {
      color: #545454;
    }
  }
`;

// --- components (FilePanel) ---
type UploadStatusType =
  | ''
  | 'fetching'
  | 'success'
  | 'failure'
  | 'no-data'
  | 'invalid-file-type'
  | 'import-error'
  | 'file-read-error';

function FilePanel() {
  const { widgetLayers, setWidgetLayers } = useAddSaveDataWidgetState();
  const { mapView } = useContext(LocationSearchContext);

  const [generalizeFeatures, setGeneralizeFeatures] = useState(false);
  const [analyzeResponse, setAnalyzeResponse] = useState<any>(null);
  const [generateResponse, setGenerateResponse] = useState<any>(null);
  const [featuresAdded, setFeaturesAdded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatusType>('');

  // Handles the user uploading a file
  const [file, setFile] = useState<any>(null);
  const onDrop = useCallback((acceptedFiles) => {
    // Do something with the files
    if (
      !acceptedFiles ||
      acceptedFiles.length === 0 ||
      !acceptedFiles[0].name
    ) {
      return;
    }

    // get the filetype
    const tempFile = acceptedFiles[0];
    let fileType = '';
    if (tempFile.name.endsWith('.zip')) fileType = 'shapefile';
    if (tempFile.name.endsWith('.csv')) fileType = 'csv';
    if (tempFile.name.endsWith('.kml')) fileType = 'kml';
    if (tempFile.name.endsWith('.geojson')) fileType = 'geojson';
    if (tempFile.name.endsWith('.geo.json')) fileType = 'geojson';
    if (tempFile.name.endsWith('.gpx')) fileType = 'gpx';

    // set the file state
    tempFile['esriFileType'] = fileType;
    setFile({
      file: tempFile,
      lastFileName: '',
      analyzeCalled: false,
    });

    // reset state management values
    setUploadStatus('fetching');
    setAnalyzeResponse(null);
    setGenerateResponse(null);
    setFeaturesAdded(false);

    if (!fileType) {
      setUploadStatus('invalid-file-type');
    }
  }, []);

  // Configuration for the dropzone component
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  // analyze csv files
  useEffect(() => {
    if (!file?.file?.esriFileType || file.analyzeCalled) return;
    if (
      file.file.name === file.lastFileName ||
      file.file.esriFileType !== 'csv'
    ) {
      return;
    }

    setFile((currentFile: any) => {
      return {
        ...currentFile,
        analyzeCalled: true,
      };
    });

    // build request
    const analyzeParams: any = { enableGlobalGeocoding: true };

    const params: any = {
      f: 'json',
      fileType: file.file.esriFileType,
      analyzeParameters: analyzeParams,
    };

    const analyzeUrl = `https://www.arcgis.com/sharing/rest/content/features/analyze`;
    fetchPostFile(analyzeUrl, params, file.file)
      .then((res: any) => {
        setAnalyzeResponse(res);
      })
      .catch((err) => {
        console.error(err);
        setUploadStatus('failure');
      });
  }, [file]);

  // get features from file
  useEffect(() => {
    if (
      !mapView ||
      !file?.file?.esriFileType ||
      file.file.name === file.lastFileName
    ) {
      return;
    }
    if (file.file.esriFileType === 'kml') return; // KML doesn't need to do this
    if (file.file.esriFileType === 'csv' && !analyzeResponse) return; // CSV needs to wait for the analyze response

    setFile((currentFile: any) => {
      return {
        ...currentFile,
        lastFileName: file.file.name,
      };
    });

    const generateUrl = `https://www.arcgis.com/sharing/rest/content/features/generate`;

    let resParameters = {};
    if (file.file.esriFileType === 'csv' && analyzeResponse) {
      resParameters = analyzeResponse.publishParameters;
    }
    const fileForm = new FormData();
    fileForm.append('file', file.file);
    const publishParameters: any = {
      ...resParameters,
      name: file.file.name,
      targetSR: mapView.spatialReference,
      maxRecordCount: 4000, // 4000 is the absolute max for this service.
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
    };

    // generalize features since this option was selected
    if (generalizeFeatures) {
      // save the current scale
      const originalScale = mapView.scale;

      // get the width for a scale of 40000
      mapView.scale = 40000;
      const extent = mapView.extent;

      // revert the scale back to the original value
      mapView.scale = originalScale;

      // get the resolution
      let resolution = extent.width / mapView.width;

      // append the publish parameters
      publishParameters['generalize'] = true;
      publishParameters['maxAllowableOffset'] = resolution;
      publishParameters['reducePrecision'] = true;

      // get the number of digits after the decimal
      let numDecimals = 0;
      while (resolution < 1) {
        resolution = resolution * 10;
        numDecimals++;
      }
      publishParameters['numberOfDigitsAfterDecimal'] = numDecimals;
    }

    let fileTypeToSend = file.file.esriFileType;

    // generate the features
    const params = {
      f: 'json',
      filetype: fileTypeToSend,
      publishParameters,
    };
    fetchPostFile(generateUrl, params, file.file)
      .then((res: any) => {
        if (res.error) {
          setUploadStatus('import-error');
          return;
        }

        setGenerateResponse(res);
      })
      .catch((err) => {
        console.error(err);
        setUploadStatus('failure');
      });
  }, [generalizeFeatures, analyzeResponse, file, mapView]);

  // add features to the map as feature layers. This is only for reference layer
  // types. This is so users can view popups but not edit the features.
  const [newLayerName, setNewLayerName] = useState('');
  useEffect(() => {
    if (!mapView?.map || !file?.file?.esriFileType || featuresAdded) {
      return;
    }
    if (!generateResponse) return;
    if (
      !generateResponse.featureCollection?.layers ||
      generateResponse.featureCollection.layers.length === 0
    ) {
      setUploadStatus('no-data');
      return;
    }

    setFeaturesAdded(true);

    const featureLayers: WidgetLayer[] = [];
    generateResponse.featureCollection.layers.forEach((layer: any) => {
      if (
        !layer?.featureSet?.features ||
        layer.featureSet.features.length === 0
      ) {
        return;
      }

      // get the list of fields
      let fields: __esri.Field[] = [];
      layer.layerDefinition.fields.forEach((field: __esri.Field) => {
        // Using Field.fromJSON to convert the Rest fields to the ArcGIS JS fields
        fields.push(Field.fromJSON(field));
      });

      // get the features from the response and add the correct type value
      const features: __esri.Graphic[] = [];
      layer.featureSet.features.forEach((feature: any) => {
        if (
          !feature?.geometry?.spatialReference &&
          file.file.esriFileType === 'kml'
        ) {
          feature.geometry['spatialReference'] =
            generateResponse.lookAtExtent.spatialReference;
        }
        const graphic = Graphic.fromJSON(feature);
        features.push(graphic);
      });

      // use jsonUtils to convert the REST API renderer to an ArcGIS JS renderer
      const renderer: __esri.Renderer = rendererJsonUtils.fromJSON(
        layer.layerDefinition.drawingInfo.renderer,
      );

      const layerName = getLayerName(widgetLayers, file.file.name);
      setNewLayerName(layerName);

      // create the popup template if popup information was provided
      let popupTemplate;
      if (layer.popupInfo) {
        popupTemplate = {
          title: layer.popupInfo.title,
          content: layer.popupInfo.description,
        };
      }
      // if no popup template, then make the template all of the attributes
      if (!layer.popupInfo && features.length > 0) {
        popupTemplate = getSimplePopupTemplate(
          layerName,
          features[0].attributes,
        );
      }

      const layerProps: __esri.FeatureLayerProperties = {
        fields,
        objectIdField: layer.layerDefinition.objectIdField,
        outFields: ['*'],
        source: features,
        title: layerName,
        renderer,
        popupTemplate,
      };

      // create the feature layer
      const newLayer = new FeatureLayer(layerProps);
      const layerToAdd = {
        ...layerProps,
        type: 'file',
        layerId: newLayer.id,
        layer: newLayer,
        rawLayer: layer,
      };
      featureLayers.push(layerToAdd);
    });

    setWidgetLayers((currentWidgetLayers) => [
      ...currentWidgetLayers,
      ...featureLayers,
    ]);

    setUploadStatus('success');
  }, [
    generateResponse,
    featuresAdded,
    file,
    mapView,
    widgetLayers,
    setWidgetLayers,
  ]);

  // handle loading of the KMLLayer
  useEffect(() => {
    if (
      !file?.file?.esriFileType ||
      !mapView ||
      file.file.esriFileType !== 'kml'
    ) {
      return;
    }
    if (file.file.name === file.lastFileName) return;

    // read in the file
    const reader = new FileReader();
    reader.onload = function (event: Event) {
      if (reader.error || !event || !reader.result) {
        console.error('File Read Error: ', reader.error);
        setUploadStatus('file-read-error');
        return;
      }

      // build the arcgis kml call
      // this data is used to get the renderers
      const kmlUrl = 'https://utility.arcgis.com/sharing/kml';
      const contents = reader.result;
      const params = {
        kmlString: encodeURIComponent(contents),
        model: 'simple',
        folders: '',
        outSR: mapView.spatialReference,
      };
      fetchPostForm(kmlUrl, params)
        .then((res: any) => {
          setGenerateResponse(res);
        })
        .catch((err) => {
          console.error(err);
          setUploadStatus('failure');
        });
    };

    try {
      reader.readAsText(file.file);
    } catch (ex) {
      console.error('File Read Error: ', ex);
      setUploadStatus('file-read-error');
    }
  }, [mapView, file]);

  const filename = file?.file?.name ? file.file.name : '';

  const [dialogShown, setDialogShown] = useState(false);

  return (
    <div css={searchContainerStyles}>
      {uploadStatus === 'fetching' && <LoadingSpinner />}
      {uploadStatus !== 'fetching' && (
        <Fragment>
          {uploadStatus === 'invalid-file-type' && (
            <div css={modifiedErrorBoxStyles}>
              {invalidFileTypeMessage(filename)}
            </div>
          )}
          {uploadStatus === 'import-error' && (
            <div css={modifiedErrorBoxStyles}>{importErrorMessage}</div>
          )}
          {uploadStatus === 'file-read-error' && (
            <div css={modifiedErrorBoxStyles}>
              {fileReadErrorMessage(filename)}
            </div>
          )}
          {uploadStatus === 'no-data' && (
            <div css={modifiedErrorBoxStyles}>{noDataMessage(filename)}</div>
          )}
          {uploadStatus === 'failure' && (
            <div css={modifiedErrorBoxStyles}>{webServiceErrorMessage}</div>
          )}
          {uploadStatus === 'success' && (
            <div css={modifiedNoteBoxStyles}>
              {uploadSuccessMessage(filename, newLayerName)}
            </div>
          )}
          <input
            css={checkBoxStyles}
            id="generalize-features-input"
            type="checkbox"
            checked={generalizeFeatures}
            onChange={(ev) => setGeneralizeFeatures(!generalizeFeatures)}
          />
          <label htmlFor="generalize-features-input">
            Generalize features for web display
          </label>
          <br />
          <div
            {...getRootProps({ className: 'dropzone' })}
            style={{ padding: '10px', position: 'relative' }}
          >
            <input
              id="hmw-dropzone"
              data-testid="hmw-dropzone"
              {...getInputProps()}
            />
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <div css={fileIconTextColorDivStyles}>
                <div>
                  <FileIcon label="Shape File" />
                  <FileIcon label="CSV" />
                  <FileIcon label="KML" />
                  <FileIcon label="GPX" />
                  <FileIcon label="Geo JSON" />
                </div>
                <label htmlFor="hmw-dropzone">Drop or Browse</label>
                <br />
                <button onClick={open}>Browse</button>
              </div>
            )}

            <i
              css={helpIconStyles}
              className="fas fa-question-circle"
              onClick={() => {
                setDialogShown(true);
              }}
            ></i>
          </div>
        </Fragment>
      )}

      <DialogOverlay
        css={overlayStyles}
        isOpen={dialogShown}
        onDismiss={() => setDialogShown(false)}
      >
        <DialogContent css={contentStyles} aria-label="Disclaimer">
          <label>
            You can drop or browse for one the following file types:
          </label>
          <ul>
            <li>
              A Shapefile (.zip, ZIP archive containing all shapefile files)
            </li>
            <li>
              A CSV File (.csv, with address or latitude, longitude and comma,
              semi-colon or tab delimited)
            </li>
            <li>A KML File (.kml)</li>
            <li>A GPX File (.gpx, GPS Exchange Format)</li>
            <li>A GeoJSON File (.geo.json or .geojson)</li>
            <li>A maximum of 1000 features is allowed</li>
          </ul>
          <button
            css={closeButtonStyles}
            title="Close disclaimer"
            onClick={(ev) => setDialogShown(false)}
          >
            ×
          </button>
        </DialogContent>
      </DialogOverlay>
    </div>
  );
}

export default FilePanel;
