import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '../../styles/colors';
import BuffsLogo from '../../../assets/images/logoBuffs.svg';
import { text } from 'stream/consumers';

interface LoadingScreenProps {
  size?: number | "small" | "large";
  message?: string; 
}

export const Loading: React.FC<LoadingScreenProps> = ({ size = 44, message}) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoWrapper}>
        <BuffsLogo width={300} height={300} />
      </View>
      <Text style={styles.text}>{message}</Text>
      <ActivityIndicator size={size} color={colors.brand.dark} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20
  },
  text: {
    fontSize: 16,
    color: colors.text.accent,
    marginBottom: 20
  }
});
