import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";

const mergedColors = {
    text: { primary: "#111827" },
    border: "#E5E7EB",
    ...colors
};

export interface Option {
    label: string;
    value: any;
}

interface GenericOptionsSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  title: string;
  options: Option[];
  onSelect: (value: any) => void;
  onClose?: () => void; // 👈 NOVO
}


const GenericOptionsSheet: React.FC<GenericOptionsSheetProps> = ({ sheetRef, title, options, onSelect, onClose}) => {
    const snapPoints = useMemo(() => ["40%", "60%"], []);

    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            stackBehavior="push"
            onDismiss={onClose} // 
            backgroundStyle={{ backgroundColor: mergedColors.gray.claro, borderRadius: 24 }}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
            )}
        >
            <View style={{ padding: 16, flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <BottomSheetScrollView>
                    {options.map((opt) => (
                        <TouchableOpacity
                            key={String(opt.value)}
                            style={styles.item}
                            onPress={() => {
                                onSelect(opt.value);
                                sheetRef.current?.dismiss();
                            }}
                        >
                            <Text style={styles.itemText}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </BottomSheetScrollView>
            </View>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create({
    title: { fontSize: 18, fontWeight: "700", color: mergedColors.text.primary, marginBottom: 16, textAlign: "center" },
    item: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: mergedColors.border },
    itemText: { fontSize: 16, color: mergedColors.text.primary }
});

export default GenericOptionsSheet;