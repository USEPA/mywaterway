# Change Log

## 2.0.2 (September 2020)
### Added
- Tribal layer that users can turn on/off using the layer list widget.
- Congressional districts layer that users can turn on/off using the layer list widget.
### Changed
- Updated the State page to use waterbody count values from ATTAINS when there is no size (miles, acres, etc.) data available. 
- Updated ArcGIS JS to version 4.16.
- Updated the ATTAINS Plans service call to use a summarized version for faster load times.
- Updated the page title to change dynamically based on what page the user is on.
- Updated the State page intro text, metrics and state link so they are dynamically pulled from the new ATTAINS metrics service, instead of a configuration file.
- Improved error handling on the state page.
- Fixed an issue where the basemap would revert to the default basemap when switching between full screen and normal modes.
- Fixed issue of map data being displayed after the user clicks on the Community tab.

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
