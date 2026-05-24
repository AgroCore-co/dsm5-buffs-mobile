import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useDimensions } from '../../utils/useDimensions';
import { SyncStatusBanner } from '../../components/SyncStatusBanner';
import { colors } from '../../styles/colors';

interface MainLayoutProps {
  children: React.ReactNode;
  backgroundColor?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  backgroundColor = colors.bg.screen,
}) => {
  const { wp, hp } = useDimensions();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: hp(0.5),
          paddingHorizontal: wp(2),
          backgroundColor,
        },
      ]}
    >
      <SyncStatusBanner />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
  },
});
