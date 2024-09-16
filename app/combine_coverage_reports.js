/*
    This script is used to take coverage reports from the server and Cypress 
    and combine them into a single report. Before running this script, run 
    "npm run full_app_coverage" to generate the coverage reports for both the 
    client/server (using Cypress) and the server (using Jest/nyc).
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const serverCoveragePath = './server/coverage/coverage-final.json';
const cyprusCoveragePath = './coverage/coverage-final.json';
const combinedCoverageDir = 'combined_coverage_reports';

function copyFile(sourcePath, destinationPath, newFileName) {
  try {
    fs.copyFileSync(sourcePath, path.join(destinationPath, newFileName));
    console.log(
      `Successfully copied ${sourcePath} to ${destinationPath} as ${newFileName}`,
    );
  } catch (err) {
    console.error(`Error copying ${sourcePath}: ${err.message}`);
    process.exit(1);
  }
}

function createCombinedCoverageReport() {
  // Remove or clear out the combined_coverage_reports directory if it exists
  if (fs.existsSync(combinedCoverageDir)) {
    try {
      fs.rmSync(combinedCoverageDir, { recursive: true, force: true });
    } catch (err) {
      console.error(
        `Error removing combined_coverage_reports directory: ${err.message}`,
      );
      process.exit(1);
    }
  }

  // Create the combined_coverage_reports directory
  fs.mkdirSync(combinedCoverageDir);

  // Copy server coverage file
  copyFile(serverCoveragePath, combinedCoverageDir, 'coverage-server.json');

  // Copy Cypress coverage file
  copyFile(cyprusCoveragePath, combinedCoverageDir, 'coverage-cypress.json');

  // Execute `npx nyc report` command
  exec(
    `npx nyc report --reporter=html --temp-dir=${combinedCoverageDir} --report-dir=${combinedCoverageDir}/final_report`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing npx nyc report: ${error}`);
      } else {
        console.log(
          `Combined coverage report generated successfully. Please review ${combinedCoverageDir}/final_report`,
        );
      }
    },
  );
}

createCombinedCoverageReport();
