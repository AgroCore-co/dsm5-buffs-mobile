import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";


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
    const snapPoints = useMemo(() => ["50%", "70%"], []);

    return (
        <BottomSheetModal
            ref={sheetRef}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
            enablePanDownToClose={true}
            stackBehavior="push"
            onDismiss={onClose} // 
            backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
            )}
        >
            <View style={{ padding: 16, flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <BottomSheetScrollView keyboardShouldPersistTaps="handled">
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
    title: { fontSize: 18, fontWeight: "700", color: colors.text.heading, marginBottom: 16, textAlign: "center" },
    item: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: colors.border.default },
    itemText: { fontSize: 16, color: colors.text.heading }
});

export default GenericOptionsSheet;