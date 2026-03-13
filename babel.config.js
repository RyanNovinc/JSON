module.exports = function(api) {
  api.cache(true);
  
  const plugins = [];
  
  // Only remove console logs in production builds
  if (process.env.NODE_ENV === 'production') {
    plugins.push([
      'transform-remove-console',
      {
        // Keep console.error and console.warn for debugging production issues
        exclude: ['error', 'warn']
      }
    ]);
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins
  };
};