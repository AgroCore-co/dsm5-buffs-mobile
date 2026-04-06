import React, { useMemo, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { 
  BottomSheetModal, 
  BottomSheetView,
  BottomSheetBackdrop 
} from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import ArrowBackIcon from "../../../assets/images/arrow-back.svg";

interface Item {
  label: string;
  value: string;
}

interface Props {
  items: Item[];
  value: string | null;
  onChange: (value: string) => void;
  title: string;
  placeholder?: string;
}

export default function SelectBottomSheet({
  items,
  value,
  onChange,
  title,
  placeholder = "Selecionar",
}: Props) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ["30%", "50%"], []);
    const safeItems = items ?? [];
    const open = useCallback(() => {
      bottomSheetRef.current?.present();
    }, []);

    const close = useCallback(() => {
        bottomSheetRef.current?.dismiss();
    }, []);

    const selectedLabel = useMemo(() => {
      if (!value) return placeholder;

      const normalizedValue = value.trim().toUpperCase();

      const found = safeItems.find(
        (i) => i.value.trim().toUpperCase() === normalizedValue
      );

      return found?.label || placeholder;
    }, [value, safeItems, placeholder]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
            />
        ),
        []
    );

return (
    <View> 
        <TouchableOpacity onPress={open} style={styles.input}>
            <Text style={styles.inputText}>{selectedLabel}</Text>
              <ArrowBackIcon style={styles.icon} width={40} height={20}/>
        </TouchableOpacity>
        <BottomSheetModal
            ref={bottomSheetRef}
            index={0}
            stackBehavior="push"
            snapPoints={snapPoints}
            backdropComponent={renderBackdrop}
            enablePanDownToClose={true}
            backgroundStyle={{ backgroundColor: colors.white.base }}>
            <BottomSheetView style={styles.sheetContainer}>
                <Text style={styles.title}>{title}</Text>
                <FlatList
                  data={safeItems}
                  keyExtractor={(item) => item.value}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", marginTop: 20 }}>
                      Nenhuma opção disponível
                    </Text>
                  }
                    renderItem={({ item }) => {
                      const isSelected = item.value === value;

                      return (
                        <TouchableOpacity
                          style={[styles.item, isSelected && styles.itemSelected]}
                          onPress={() => {
                            onChange(item.value);
                            close();
                          }}
                        >
                          <Text style={[
                            styles.itemText,
                            isSelected && styles.itemTextSelected
                          ]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                />
            </BottomSheetView>
        </BottomSheetModal>
    </View>
);
}
const styles = StyleSheet.create({
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",          // 👈 IMPORTANTE
    alignItems: "center",          // 👈 centraliza vertical
    justifyContent: "space-between", // 👈 separa texto e ícone
    paddingHorizontal: 12,
    backgroundColor: colors.white.base,
    borderColor: colors.gray.disabled,
  },
  icon: {
    transform: [{ rotate: "270deg" }], // vira dropdown
    opacity: 0.6,
  },
  inputText: {
    fontSize: 16,
  },
  sheetContainer: {
    flex: 1,
    padding: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    margin: 12,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemText: {
    fontSize: 16,
  },
  itemSelected: {
    backgroundColor: colors.yellow.warning,
  },
  itemTextSelected: {
    fontWeight: "bold",
    color: colors.brown.base,
  },
});