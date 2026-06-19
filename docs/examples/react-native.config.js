module.exports = {
  project: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
      packageName: 'com.example.myapp',
    },
  },
  assets: ['./src/assets/fonts/', './src/assets/images/'],
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: null,
        android: null,
      },
    },
    'react-native-camera': {
      root: './node_modules/react-native-camera',
      platforms: {
        android: {
          packageInstance: 'new RNCameraPackage()',
        },
      },
    },
    'react-native-maps': {},
  },
  platforms: {
    ios: {
      sourceDir: './ios',
    },
    android: {
      sourceDir: './android',
    },
  },
  commands: [],
};
