const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional asset extensions
config.resolver.assetExts.push('wav', 'mp3');

// Increase Metro timeout for large bundles
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

module.exports = config;