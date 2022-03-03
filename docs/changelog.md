
# Change Log

## 2.1.1 (March 2022)

### Added

- Added the Organization Name to the Monitoring stages on the community page.

- Added a message for unsupported browsers. 

### Changed


- Updated the community page to filter out ATTAINS assessments that are in "public comment" status.

- Improved the performance of the waterbody report page.

- Updated the NARS data on the National page.

- Updated the surrounding waterbodies layer so the colors don't blend. 

- Updated the tribes layer to the latest version.

- Updated the protect tab to load as much data as possible, even when some of the services are down.

- Updated the app so that it works better on small mobile devices.

- Updated the popups so they are expanded by default.

- Fixed a bug with the glossary service crashing the server side.

- Fixed a bug that caused the page to scroll to the top after load.

- Fixed an issue with the "Mapped Water (all)" layer being visible in the layer list but not showing on the map.

- Fixed various bugs around the legend display.

- Fixed a bug with Google Analytics not always loading.

- Fixed a bug of duplicate popups on the overview tab of the community page.

- Fixed an infinite loading spinner bug that occurs wehn clicking an assessment that is outside of HUC boundaries.


## 2.1.0 (January 2022)

### Added

- Added USGS stream gages to the Overview panel of the Community page. 

- Added list of Monitoring data to the Overview panel of the Community page.

- Added list of Discharger data to the Overview panel of the Community page.

- Added Surrounding Waterbodies widget to the Community page, which allows the user to view waterbodies surrounding the currently selected HUC.

- Added a How's My Waterway widget that can be embedded to websites outside of How's My Waterway. This widget can be found [here](https://www.epa.gov/developers/data-data-products-hows-my-waterway-widget).

- Added GIS data to the map of the Restoration Plans tab on the Restore panel of the Community page.

- Added GIS data to the map of the Protection Projects section on the Protect panel of the Community page.


### Changed


- Updated the waterbodies layer on the community tab, such that the waterbodies are clipped to the selected HUC.

- Updated the mapping widget to use ArcGIS JavaScript API version 4.22. This improves performance of loading the app and data on the Advanced Search tab of the State page.

- Updated the Glossary component to point to a cached report of the glossary terms to improve reliability of the Glossary component.

- Updated the Monitoring panel of the Community page, such that the Permitted Dischargers layer is available in the layer list widget.

- Improved performance of the Plan Summary page, especially for plans with a large number of associated waterbodies.

- Updated the survey data of the State page (i.e., updated the stateNationalUses.json and surveyMapping.json files).

- Updated the popups such that the "Change to this location" section is at the top of the popup. 

- Fixed an issue of map/list highlighting not working on the Plan Summary page.

- Updated accordions on the Community page to have counts listed in the headers. 


## 2.0.5 (May 2021)

### Added

- Labels to the Good/Polluted/Unknown icons to improve accessibility.

- Improved the usability of the data page by adding a table of contents that links to the corresponding item.

- Added new entries to the data page for Watershed Index Online, Wild and Scenic Rivers, and Protected Areas.


### Changed


- Assessments missing from the ATTAINS GIS service are now retrieved from the ATTAINS web service. Their information is included under the Community accordion along with Assessments from the GIS service. There is a note that mapping information is not available for those assessments.

- Renamed the Environmental Justice layer to Demographic Index.

- Updated text and glossary links for the Demographic Index (formerly Environmental Justice) layer. 

- Updated the canonical link so that it uses the current url for non-community search pages (i.e., homepage, community landing page, etc.), instead of being empty. This is a Search Engine Optimization (SEO) technique to improve the application’s discoverability. 

- Updated descriptions for each page so that search engines can display more accurate information.

- Fixed issue with Glossary component while in full screen map mode where the map would get stuck in full screen and the page header would be shown.

- To avoid color distortion, the Watershed boundary is no longer shaded when the Watershed Health Index layer is turned on.

- Fixed multiple issues relating to Internet Explorer (IE11) support.

- Fixed an issue with some monitoring locations only showing a small portion of the monitoring location id.

- Fixed in issue with an infinite loading spinner when various EPA mapping services are unavailable.

- Fixed an issue with the Waterbody Report and Plan Summary maps when the pages are viewed using smaller screen sizes.

- Fixed an issue with the Waterbody Report which always saying 2018 in the more recent data suggestion box.

- Fixed an issue with the switches on the Identified Issues tab not updating the map.

- Fixed an issue around regex syntax errors when using symbols in the community search box.

- Fixed an issue with the GPRA service call failing due to the state code not being passed in (i.e., when the state code was not available because of an ATTAINS web service issue).

- Fixed an issue where some waterbody reports would show a use as impaired but not list any causes.

- Fixed an issue where using a tab character in the community search box would cause the app to jump back to the community home page when a user clicked on any other tab.

- Fixed an issue with the legend not syncing correctly when navigating between the community home page and community details pages.


## 2.0.4 (February 2021)

### Added

- New mapping widget (i.e., Add Data Widget) - can be used to add geospatial information from ArcGIS Online, external GIS services, and by uploading files contain spatial information.

- Watershed Health Scores data from WSIO to the Protect panel of the Community page.

- Wild and Scenic Rivers data to the Protect panel of the Community page.

- Protected Areas data from PAD-US to the Protect panel of the Community page.

- Demographic Indicators information from EJSCREEN to the layer list.

- ATTAINS Waterbodies layer to the Monitoring, Restore, and Protect tabs of the Community page.

- A "Fish Consumption Advisories" link to the "Eating Fish" tab of the State page. 

### Changed

- The Community search box now displays search suggestions based on what the user has typed (includes break out sections for Tribes and Watersheds).

- Updated the NARS data on the National page.

- Updated One EPA Template footer links.

- Updated the watershed boundaries graphic to have a darker outline so that it stands out more.

- Increased the size of the header banner buttons, so they are easier to click on mobile devices.

- Updated "opens in new browser tab" language for ATTAINS documents and more information sections on the State page.

- Updated the National page to pull NARS data from an AWS configuration file.

- Updated the glossary to perform an exact match when the user opens the glossary by clicking a term.

- Updated the look of the charts on the State Water Quality Overview tab.

- Fixed an issue with drop down menus opening keyboards on mobile devices.

- Fixed an issue where users could attempt to use the layer list to turn on layers that failed to load.

- Fixed an issue with counties showing up as "undefined" on the Drinking Water tab of the Community page.

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
