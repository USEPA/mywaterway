describe('Add Data Widget', () => {
  const adwId = '#add-data-widget';
  const dropzoneId = 'tots-dropzone';

  function openWidget(path = '/community') {
    cy.visit(path);

    // wait for the web services to finish
    cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
      'not.exist',
    );

    // this a work around to an issue where doing
    // "cy.findByTitle('Add Data Widget').click()" does not work for esri
    // widget buttons
    cy.get('div[title="Add Data Widget"]').then((button) => button.click());

    cy.get(adwId).should('be.visible');
  }

  beforeEach(() => {
    openWidget();
  });

  it('Verify disclaimer modal works', () => {
    const disclaimerText =
      'EPA cannot attest to the accuracy of data provided by organizations outside of the federal government.';

    cy.findByText('DISCLAIMER').click();

    // verify the disclaimer text is visible
    cy.findByText(disclaimerText).should('be.visible');

    // close the disclaimr and verify it is no longer visible
    cy.findByTitle('Close disclaimer').click();
    cy.findByText(disclaimerText).should('not.exist');
  });

  it('Test add data widget tab navigation', () => {
    cy.get(adwId).within(($adw) => {
      // verify the search panel shows by default
      cy.findByText('Suggested Content');

      // verify url panel
      cy.get('button:contains("URL")').filter(':visible').click();
      cy.findByText('An ArcGIS Server Web Service');

      // verify file panel
      cy.get('button:contains("File")').filter(':visible').click();
      cy.findByText('Generalize features for web display');

      // verify search panel navigation
      cy.get('button:contains("Search")').filter(':visible').click();
      cy.findByText('Suggested Content');
    });
  });

  it('Test search feature', () => {
    function runSearchTests(layer) {
      cy.findByPlaceholderText('Search...').clear().type(layer).type('{enter}');

      // wait for the web services to finish
      cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
        'not.exist',
      );

      // verify the layer is in the results
      cy.findByText(layer);
      cy.get(`div[title="${layer}"]`)
        .parent()
        .within(($el) => {
          // add the layer
          cy.findByText('Add').click();

          // verify the add button now says remove
          cy.findByText('Add').should('not.exist');
          cy.findByText('Remove');

          // remove the layer and verify the button says add again
          cy.findByText('Remove').click();
          cy.findByText('Add');
          cy.findByText('Remove').should('not.exist');

          // add the layer again to test the layers page
          cy.findByText('Add').click();
        });

      cy.get(adwId).within(($adw) => {
        // open the layers panel
        cy.get('button:contains("Layers")').click();

        // verify the layer is visible on the layers panel
        cy.findByText(layer, { exact: false });

        // delete the layer
        cy.get('span:contains("Delete Layer")').parent().click();
        cy.findByText('No layers have been added.');
        cy.get('button:contains("Back")').click();
      });

      cy.get(`div[title="${layer}"]`)
        .parent()
        .within(($el) => {
          // verify the layer was removed
          cy.findByText('Add');
          cy.findByText('Remove').should('not.exist');
        });
    }

    // Run tests against "Suggested Content"
    runSearchTests('NEP Coastal Watersheds');

    // switch to "ArcGIS Online"
    cy.findByText('Suggested Content').click();
    cy.findByText('ArcGIS Online').click();

    // filter to feature service layers
    cy.get(adwId).within(($adw) => {
      cy.get('span:contains("Type")').then(($el) => $el.click());
      cy.findByText('Map Service').then(($el) => $el.click());
      cy.findByText('Feature Service').then(($el) => $el.click());
      cy.findByText('Image Service').then(($el) => $el.click());
      cy.findByText('Vector Tile Service').then(($el) => $el.click());
      cy.get('#kml_filter').then(($el) => $el.click());
      cy.get('#wms_filter').then(($el) => $el.click());
    });

    // Run tests against "ArcGIS Online"
    runSearchTests('USA Counties (Generalized)');
  });

  it('Test URL feature', () => {
    const urlSuccess = 'The layer was successfully added to the map';

    openWidget('/community/dc');

    cy.get(adwId).within(($adw) => {
      function runUrlTests(layer, layerTitle) {
        cy.findByText(layer);

        cy.get('#url-upload-input').clear().type(layer);
        cy.findByText('ADD').click();

        cy.findByText(urlSuccess);

        // open the layers panel
        cy.get('button:contains("Layers")').click();

        // Some layers don't have titles. If this is the case, skip this test
        if (layerTitle) {
          // verify the layer is visible on the layers panel
          cy.findByText(layerTitle);
        }

        // delete the layer
        cy.get('span:contains("Delete Layer")').parent().click();
        cy.findByText('No layers have been added.');
        cy.get('button:contains("Back")').click();
      }

      // go to the url panel
      cy.get('button:contains("URL")').filter(':visible').click();
      cy.findByText('An ArcGIS Server Web Service');

      // open the sample urls section
      cy.findByText('SAMPLE URL(S)').click();

      // run tests for ArcGIS Server url
      runUrlTests(
        'http://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Cities/FeatureServer/0',
        'World Cities',
      );

      // switch to WMS
      cy.findByText('An ArcGIS Server Web Service').click();
      cy.findByText('A WMS OGC Web Service').click();

      // run tests for a WMS OGC service
      runUrlTests(
        'http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi?service=WMS&request=GetCapabilities',
        null,
      );

      // switch to KML
      cy.findByText('A WMS OGC Web Service').click();
      cy.findByText('A KML File').click();

      // run tests for a KML file
      runUrlTests(
        'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month_age_animated.kml',
        '2.5_month_age_animated',
      );

      // switch to GeoRSS
      cy.findByText('A KML File').click();
      cy.findByText('A GeoRSS File').click();

      // run tests for a GeoRSS file
      runUrlTests('http://www.gdacs.org/xml/rss.xml', null);

      // switch to CSV
      cy.findByText('A GeoRSS File').click();
      cy.findByText('A CSV File').click();

      // run tests for a csv file
      runUrlTests(
        'https://developers.arcgis.com/javascript/latest/sample-code/layers-csv/live/earthquakes.csv',
        null,
      );

      // test the already added message
      cy.findByText('ADD').click();
      cy.findByText(urlSuccess);
      cy.findByText('ADD').click();
      cy.findByText('has already been added. If you want to', { exact: false });

      // switch back to ArcGIS web service
      cy.findByText('A CSV File').click();
      cy.findByText('An ArcGIS Server Web Service').click();

      cy.get('#url-upload-input')
        .clear()
        .type('http://www.gdacs.org/xml/rss.xml');
      cy.findByText('ADD').click();

      cy.findByText('Failed to add the layer at the following url:', {
        exact: false,
      });
    });
  });

  it('Test File upload feature', () => {
    const shapeFile = 'shapeFile.zip';

    function uploadShapeFile(inputFile, type, deleteLayer = true) {
      cy.fixture(inputFile).then((file) => {
        // select samples layer type, upload the contamination map file,
        // wait for it to finish and check for failure
        cy.findByTestId(dropzoneId).upload(file, inputFile, type);
        cy.findAllByTestId('hmw-loading-spinner', { timeout: 180000 }).should(
          'not.exist',
        );
        cy.findByText('was successfully uploaded', { exact: false }).should(
          'exist',
        );
      });

      if (deleteLayer) {
        // open the layers panel
        cy.get('button:contains("Layers")').click();

        // verify the layer is visible on the layers panel
        cy.findAllByText(inputFile);

        // delete the layer
        cy.get('span:contains("Delete Layer")').parent().click();
        cy.findByText('No layers have been added.');
        cy.get('button:contains("Back")').click();
      }
    }

    cy.get(adwId).within(($adw) => {
      // verify file panel
      cy.get('button:contains("File")').filter(':visible').click();

      // test shape file
      uploadShapeFile(shapeFile, 'blob');

      // test csv
      uploadShapeFile('2.5_week.csv', 'csv');

      // test kml
      uploadShapeFile('testing_kml.kml', 'kml');

      // test geo.json
      uploadShapeFile('testing_geojson.geo.json', 'json');

      // test gpx
      uploadShapeFile('testing_gpx.gpx', 'gpx');

      // test uploading a file twice
      cy.get('#generalize-features-input').then(($el) => $el.click());
      uploadShapeFile(shapeFile, 'blob', false);
      uploadShapeFile(shapeFile, 'blob', false);
    });
  });

  it('Test file upload errors', () => {
    const invalidFile = 'invalidFileFormat.txt';
    const emptyFile = 'empty.geojson';

    cy.get(adwId).within(($adw) => {
      // verify file panel
      cy.get('button:contains("File")').filter(':visible').click();

      // Test failed file upload
      cy.fixture(invalidFile).then((file) => {
        // select samples layer type, upload the contamination map file,
        // wait for it to finish and check for failure
        cy.findByTestId(dropzoneId).upload(file, invalidFile);
        cy.findAllByTestId('hmw-loading-spinner', { timeout: 120000 }).should(
          'not.exist',
        );
        cy.findByText('is an invalid file type. The accepted file types are', {
          exact: false,
        }).should('exist');
      });

      // Test empty file
      cy.fixture(emptyFile).then((file) => {
        // select samples layer type, upload the contamination map file,
        // wait for it to finish and check for failure
        cy.findByTestId(dropzoneId).upload(file, emptyFile);
        cy.findAllByTestId('hmw-loading-spinner', { timeout: 180000 }).should(
          'not.exist',
        );
        cy.findByText('Unable to import this dataset.').should('exist');
      });
    });
  });
});
