import { Platform } from 'react-native';
import { getBundleId } from 'react-native-device-info';

const shortCodes = {
  yabalash: "976d51",
};

const appIds = {
  yabalash: Platform.select({
    ios: "com.yabalash.dispatcher",
    android: "com.yabalash.dispatcher",
  }),
};

export { appIds, shortCodes };
