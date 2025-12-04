# Local Development Environment Setup

- Run `git clone` to clone this repository.
- Install Node.js from https://nodejs.org.
- Create a `.env.local` file inside the `app/server` folder, and populate it with the following environment variables (get the values for the GLOSSARY_AUTH and USGS_API_KEY environment variables from the technical lead or project manager):
```
NODE_ENV='local'
LOGGER_LEVEL='DEBUG'
GLOSSARY_AUTH=''
USGS_API_KEY=''
```
- Create a `.env.local` file inside the `app/client` folder, and populate it with the following environment variables (get the values for the VITE_ARCGIS_CLIENT_ID and VITE_USGS_API_KEY environment variables from the technical lead or project manager):
```
VITE_ARCGIS_CLIENT_ID=''
VITE_USGS_API_KEY=''
```
- Navigate to the `app/` folder in the repo using the command line:	
  - Run `npm run setup`.
  - Run `npm start` to start a local web server to support development.
