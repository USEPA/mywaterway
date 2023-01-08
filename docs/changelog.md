
# Change Log

## 2.5.0 (January 2023)

### Added

- Added a CyAN satellite imagery data to the "Current Water Conditions" tab of the "Monitoring" panel.

### Changed

- Renamed the "Current Water Conditions" layer to "USGS Sensors".

- Updated the "Monitoring" panel, such that the "Past Water Conditions" layer is off by default. Clicking the "Past Water Conditions" tab turns the layer on.

- Updated the list of tips on the "Tips for Protecting Your Watershed" (formerly "Tips") tab of the "Protect" panel.

- Updated the "Overview" panel, such that clicking the tabs automatically turns the associated layer on.

- Fixed a bug where the waterbody counts did not match up with the number of items in the list view for some locations.


## 2.4.0 (November 2022)

### Added

- Added a Tribe page, which includes a water quality data section similar to the "State Water Quality Overview" section of the State page, a map displaying tribal boundaries, waterbodies and monitoring locations specific to each tribe, and a list view of those waterbodies and monitoring locations.

- Added a variation of the Upstream Watershed widget that takes user input instead of using the current location.

- Added a Surrounding Monitoring Locations widget that enables users to view Past Water Conditions locations outside the currently focused boundaries.

- Added ability to sort permitted dischargers by compliance status.

### Changed

- Updated map symbol highlights to have a degree of transparency.

- Updated to version 3 of the Protected Areas Database (PADUS).

- Updated the Layer List widget to include the NLCD Land Cover layer, the Watershed Boundaries layer, and the Search Icon layer. The monitoring locations layers are also now included in the list on every page.

- Updated the Add Data Widget to support WFS layers.

- Updated the State and Tribe pages to display an error message for invalid URL path segments.

- Updated the Identified Issues tab of the Community page to link impairment labels to the glossary.

- Updated the list views on the Community page to include map symbols next to each item.

- Improved accessibility by converting tables used exclusively for layout to CSS Grid.

- Fixed a bug on the state page where an invalid URL included in a service response caused the page to crash.

- Fixed a bug where certain items were being improperly capitalized on the Monitoring Report page.

- Fixed a bug where the alert message component crashes the app if "all" is not included in the "messages.json" file.

- Fixed a bug where an infinite loading spinner is displayed for American Samoa, which has no GIS data.


## 2.3.0 (September 2022)

### Added

- Added Monitoring Report pages for each monitoring location, listed under Past Water Conditions, where users can view/download historical data and view graphs for sample results of characteristics.

- Added historical data and a date slider to the Monitoring panel on the Community page.

- Added the capability to display images on the Waterbody Report page.
 
### Changed

- Updated the Past Water Conditions layer so that clustering can be broken up by a single click on a cluster.

- Updated the Past Water Conditions layer to have clustering turned off if there are less than 20 stations in the selected HUC.

- Updated the graphics on the Community page to have the same outline thickness across all layers.

- Updated to the latest version of the ArcGIS JS API (v4.24).

- Updated to the latest version of Node.js (v18.7.0).

- Improved the table layout in the Plans popups. 

- Removed the "Sample Count" column from the Monitoring panel of the Community page.

- Fixed a bug on the waterbody report page where the "Unable to find a waterbody report for this waterbody" text was displayed on the bottom of the map popup.

- Fixed a bug on the state page where using the browser's back/forward buttons would change the URL but the data on the page would not change.


## 2.2.0 (June 2022)

### Added

- Added Assessment Documents section to the Waterbody Report.

- Added "Parameter" column and the ability to filter the data to the "Probable sources contributing to impairment" section of the Waterbody Report.

- Added  Current Water Conditions (USGS Stream Gages) to the Monitoring Panel.
 
- Added spark line charts to the Current Water Conditions (USGS Stream Gages) data.

- Added Educators page.

- Added tribal information and a tribal filter to the Drinking Water panel.

- Added ability to download Past Water Conditions (Monitoring Station) data for the entire watershed/HUC12.

- Added ability to clear filters on tables that can be filtered.
 
### Changed

- Updated the surrounding waterbodies layer, so that popups will be displayed when clicking waterbodies inside of the selected HUC.

- Updated the Protected Areas layer to the latest version (v3).

- Updated ofmpub.epa.gov references to use ordspub.epa.gov.

- Updated the survey data of the State page (i.e., updated the stateNationalUses.json and surveyMapping.json files).

- Updated the Past Water Conditions layer (used to be Monitoring Stations) to be clustered.

- Updated the table on the Past Water Conditions tab of the Monitoring panel to have the "Sample Count" and "Measurement Count" columns.

- Updated the available filters on the Past Water Conditions tab of the Monitoring Panel to include PFAS.

- Updated the legend icon and moved it to the top left of the map.

- Improved the look of the monitoring station download section. 

- Improved performance of the Monitoring panel.

- Reduced the size of the location pin icon on the Community page.

- Removed the gage height numbers from the Current Water Conditions layer (USGS Streamgages).

- Fixed issues with tables overflowing the container on the Waterbody Report page.

- Fixed a bug with the glossary service crashing the server side.

- Fixed the Tribal Areas layer, which was broken due to changes in the service.


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

- Fixed an infinite loading spinner bug that occurs when clicking an assessment that is outside of HUC boundaries.


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
