# Local Development Environment Setup

- Run `git clone` to clone this repository.
- Install Node.js from https://nodejs.org.
- Create a `.env.local` file inside the `app/server` folder, and populate it with the following environment variables (get the value for the GLOSSARY_AUTH environment variable from the technical lead or project manager):
```
NODE_ENV='local'
LOGGER_LEVEL='DEBUG'
GLOSSARY_AUTH=''
```
- Navigate to the `app/` folder in the repo using the command line:	
  - Run `npm run setup`.
  - Run `npm start` to start a local web server to support development.
