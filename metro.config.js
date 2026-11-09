const { getDefaultConfig } = require('expo/metro-config');
const { startBridge } = require('./scripts/oauthBridge');

// Automatically start local OAuth bridge on port 5173 during development only
const isExporting = process.argv.some(arg => arg.includes('export') || arg.includes('build'));
if (!isExporting) {
  try {
    startBridge();
  } catch (e) {
    // Ignore error if port is already in use
  }
}

const config = getDefaultConfig(__dirname);

module.exports = config;

