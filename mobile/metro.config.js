/**
 * Metro configuration for React Native
 * https://facebook.github.io/metro/docs/configuration
 *
 * @format
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Force axios to use the browser build instead of Node.js build
      if (moduleName === 'axios') {
        return {
          filePath: require.resolve('axios/dist/browser/axios.cjs'),
          type: 'sourceFile',
        };
      }
      // Handle Node.js built-in modules that might be required
      if (['crypto', 'http', 'https', 'zlib', 'stream', 'url', 'net', 'tls', 'dns', 'fs', 'path'].includes(moduleName)) {
        return {
          filePath: require.resolve('./src/utils/emptyModule.js'),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
