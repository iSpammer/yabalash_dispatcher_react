import React, {useState} from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {useSelector} from 'react-redux';
import imagePath from '../constants/imagePath';
import colors from '../styles/colors';
import fontFamily from '../styles/fontFamily';
import {
  moderateScale,
  moderateScaleVertical,
  textScale,
} from '../styles/responsiveSize';

const DropDown = ({
  data = [],
  value,
  placeholder,
  textStyle,
  inputStyle,
  fetchValues,
  marginBottom = 16,
  modalStyle,
}) => {
  const [modalShow, setModalShow] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const {themeColors} = useSelector((state) => state?.initBoot);
  const onSelect = (item, i) => {
    setSelectedIndex(i);
    fetchValues(item);
    setModalShow(false);
  };

  return (
    <View style={{marginBottom: moderateScaleVertical(marginBottom)}}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalShow(!modalShow)}
        style={{...styles.inputStyle, ...inputStyle}}>
        <Text
          numberOfLines={1}
          style={{
            ...styles.textStyle,
            ...textStyle,
            color: !!value ? colors.black : colors.textGreyB,
          }}>
          {!!value ? value : placeholder}
        </Text>
        <Image source={imagePath.dropdownTriangle} />
      </TouchableOpacity>
      {!!modalShow && (
        <View
          style={{
            borderRadius: 4,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
            // borderColor: colors.lightWhiteGrayColor,
            // borderWidth: 0.7,
            padding: moderateScale(8),
            borderColor: themeColors.primary_color,
            borderWidth: 0.6,
            backgroundColor: colors.white,
            // top: moderateScaleVertical(48),
            position: 'absolute',
            minWidth: '70%',
            zIndex: 10,
            ...modalStyle,
          }}>
          {data.map((val, i) => {
            return (
              <TouchableOpacity
                style={{marginBottom: moderateScaleVertical(8)}}
                onPress={() => onSelect(val, i)}
                key={String(i)}>
                <Text
                  style={{
                    fontSize: 14,
                    marginLeft: moderateScale(8),
                    color:
                      selectedIndex == i
                        ? themeColors.primary_color
                        : colors.black,
                    fontFamily:
                      selectedIndex == i ? fontFamily.bold : fontFamily.regular,
                  }}>
                  {val?.address ||
                    val?.name ||
                    val?.driver_registartion_option_name ||
                    val?.translations[0]?.name ||
                    val?.address ||
                    val?.full_name_english ||
                    val}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputStyle: {
    // flex: 1,
    backgroundColor: colors.white,
    height: moderateScaleVertical(45),
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    fontFamily: fontFamily.regular,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 5,
    borderColor: colors.borderColorGrey,
    paddingHorizontal: moderateScale(16),
  },

  textStyle: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    fontFamily: fontFamily.medium,
    textTransform: 'capitalize',
  },
  labelTextStyle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.blackOpacity86,
    textTransform: 'capitalize',
    // marginBottom: moderateScaleVertical(8)
  },
});
export default DropDown;
