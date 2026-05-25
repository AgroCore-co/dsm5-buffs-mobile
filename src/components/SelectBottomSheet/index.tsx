import React, { useMemo, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  BottomSheetModal,
  BottomSheetFlatList,
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
    const snapPoints = useMemo(() => ["45%"], []);
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
            enableDynamicSizing={false}
            backgroundStyle={{ backgroundColor: colors.bg.card }}>
            <Text style={styles.title}>{title}</Text>
            <BottomSheetFlatList<Item>
              data={safeItems}
              keyExtractor={(item: Item) => item.value}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhuma opção disponível</Text>
              }
              renderItem={({ item }: { item: Item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => {
                      onChange(item.value);
                      close();
                    }}
                  >
                    <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
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
    backgroundColor: colors.bg.card,
    borderColor: colors.border.default,
  },
  icon: {
    transform: [{ rotate: "270deg" }], // vira dropdown
    opacity: 0.6,
  },
  inputText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    color: colors.text.accent,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.bg.subtle,
  },
  itemText: {
    fontSize: 16,
    color: colors.text.body,
  },
  itemSelected: {
    backgroundColor: colors.status.pendingBg,
  },
  itemTextSelected: {
    fontWeight: "bold",
    color: colors.text.accent,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
    color: colors.text.placeholder,
    fontSize: 14,
  },
});