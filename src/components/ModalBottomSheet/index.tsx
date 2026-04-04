import React, { forwardRef, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";

interface AppModalProps {
  title?: string;
  snapPoints?: string[];
  children: React.ReactNode;
  isScrollable?: boolean;
}

export const AppModal = forwardRef<BottomSheetModal, AppModalProps>(
  ({ title, snapPoints = ["50%", "90%"], children, isScrollable = true }, ref) => {
    
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const Container = isScrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        stackBehavior="push" // PERMITE SOBREPOR O OUTRO MODAL
        backgroundStyle={styles.modalBackground}
        handleIndicatorStyle={styles.indicator}
      >
        <View style={styles.header}>
          {title && <Text style={styles.headerTitle}>{title}</Text>}
        </View>
        <Container style={styles.content}>
          {children}
        </Container>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  modalBackground: { backgroundColor: "#FFF", borderRadius: 24 },
  indicator: { backgroundColor: "#D1D5DB" },
  header: { 
    paddingVertical: 16, 
    alignItems: "center", 
    borderBottomWidth: 1, 
    borderBottomColor: "#EEE" 
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  content: { padding: 16, paddingBottom: 40 },
});