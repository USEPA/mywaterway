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
const combinedResultsDir = 'combined_results_reports';

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

function deleteFilesByExtensions(folderPath, extensionsToDelete) {
  try {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileExtension = path.extname(file).toLowerCase();
      if (extensionsToDelete.includes(fileExtension)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error(`Error deleting files: ${err.message}`);
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

function createCombinedResultsReport() {
  // clear out video files, since they bloat the report and prevent
  // it from loading
  deleteFilesByExtensions(`${combinedResultsDir}/results`, ['.mp4']);

  exec(
    `npx allure generate ${combinedResultsDir}/results --clean -o ${combinedResultsDir}/final_report --single-file`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing npx allure generate: ${error}`);
      } else {
        console.log(
          `Combined test results report generated successfully. Please review ${combinedResultsDir}/final_report`,
        );
      }
    },
  );
}

createCombinedCoverageReport();
createCombinedResultsReport();
