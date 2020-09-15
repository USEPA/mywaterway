# Change Log

## 2.0.2 (September 2020)
### Added
- Tribal layer that users can turn on/off using the layer list widget.
- Congressional Districts layer that users can turn on/off using the layer list widget.
### Changed
- Updated the State page to use waterbody count values from ATTAINS when there is no size (miles, acres, etc.) data available.
- Updated the mapping widget to use ArcGIS JavaScript API version 4.16.
- Updated the ATTAINS Plans web service call to request a summarized result from the service to provide faster responese times and less load on ATTAINS.
- Updated the web page title to change dynamically based on what page the user is on to increase Search Engine optimization (SEO).
- Updated the State page introduction text, metrics and State web site links so they are dynamically retrieved from the new ATTAINS metrics web service, instead of a configuration file.
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
