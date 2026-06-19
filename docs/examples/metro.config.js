const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { assetExts, sourceExts } = getDefaultConfig(__dirname).resolver;

/**
 * Metro configuration for React Native
 * https://reactnative.dev/docs/metro
 */
const config = {
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...sourceExts, 'svg', 'ts', 'tsx'],
    platforms: ['ios', 'android', 'web'],
  },
  server: {
    port: 8081,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
