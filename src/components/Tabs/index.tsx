import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../../styles/colors";

export type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
};

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.activeTab]}
            onPress={() => onChange(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                isActive ? styles.activeText : styles.inactiveText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopStartRadius: 10,
    borderTopEndRadius: 10,
    backgroundColor: colors.white.base,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 4,
    borderColor: colors.yellow.base,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeText: {
    color: colors.brown.base,
  },
  inactiveText: {
    color: colors.gray.base,
  },
});
