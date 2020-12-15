# Change Log

## 2.0.3 (November 2020)

### Added

- State boundary layer that can be toggled on/off using the layer list widget.

- Upstream watershed widget in the top right corner of the Community map for displaying the entire upstream watershed of the currently selected watershed (i.e. HUC12)

- Support to display tribal data in the Community section of the application (once ATTAINS makes the data available)

### Changed

- Waterbodies/assessment units now have an ATTAINS organization indicator in front of their IDs (State/District/Tribal/Territory).

- Waterbodies on the Waterbody Report map are now colored based on their status.

- Waterbodies/assessment unit on the Community/State/Waterbody Report now display the ATTAINS organization name and ID in the map popup and list view items.

- Clicking the County layer on the map while toggled on displays additional information about the county.

- The microbiological category is now named Bacterial on the Community Monitoring tab, physical is now a separate category, and the Monitoring Station data download tables now show the mapped group labels instead of the characteristic groups from the Water Quality Portal (WQP) service.

- The Community/State/Waterbody Report pages now use the overallStatus value from the ATTAINS web services to color code and display the status of a waterbody.

- Fixed an issue where waterbodies were not being properly hidden on the Community page and were clickable while hidden or rendered as incorrect shapes.

- Fixed an issue where bar charts on the State page with only one bar had an incorrect bar height.

- Fixed an issue where Community search errors were not displayed on small screens.

- Fixed an issue where the Waterbody Report page would crash on some locations.

## 2.0.2 (September 2020)
### Added
- Tribal layer that users can turn on/off using the layer list widget.
- Congressional Districts layer that users can turn on/off using the layer list widget.
### Changed
- Updated the State page to use waterbody count values from ATTAINS when there is no size (miles, acres, etc.) data available.
- Updated the mapping widget to use ArcGIS JavaScript API version 4.16.
- Updated the ATTAINS Plans web service call to request a summarized result from the service to provide faster response times and less load on ATTAINS.
- Updated the web page title to change dynamically based on what page the user is on to increase Search Engine optimization (SEO).
- Updated the State page introduction text, metrics, and State web site links so they are dynamically retrieved from the new ATTAINS metrics web service, instead of a configuration file.
- Improved the error handling on the State page.
- Fixed an issue where the basemap would revert to the default basemap when switching between full screen and normal mode.
- Fixed an issue where previous map data continued to be displayed after the user clicks around the application.

## 2.0.1 (July 2020)
### Added
- None.
### Changed
- Relocated a few mapping and data files (i.e. .json) to s3 to allow real-time updates.
- Added metadata to the Community page to support [geoconnex.us](https://github.com/internetofwater/geoconnex.us) integration.
- Updated the location results handler to accommodate confidence scores less than 70%.
- Updated app to use ATTAINS reporting cycle info from the ATTAINS GIS service. This helps ensure the proper reporting cycle is used to retrieve ATTAINS organization-level information. 
 
## 2.0.0 (Released 06-18-2020)
### Added
- Initial Community page release.
- Initial State page release.
- Initial National page release.
- Initial Actions page release.
- Initial Waterbody page release.
- Initial Data page release.
- Initial About page release.

### Changed
- Not applicable. 

## 1.0.0 (Released 02-13-2013)
### History
- Initial version of the legacy application which was decommissioned in June 2020.
