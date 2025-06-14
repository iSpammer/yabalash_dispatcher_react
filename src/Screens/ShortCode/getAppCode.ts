import {getBundleId} from 'react-native-device-info';
import {appIds, shortCodes} from '../../utils/constants/DynamicAppKeys';

export const getAppCode = () => {
  switch (getBundleId()) {
   
    case appIds.yabalash: return shortCodes.yabalash

    default:
      return '976d51';
  }
};
