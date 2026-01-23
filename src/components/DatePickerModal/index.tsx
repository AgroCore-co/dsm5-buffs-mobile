import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker, { DateType, useDefaultStyles} from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { Modal } from "../Modal";
import { colors } from "../../styles/colors";

interface DatePickerModalProps {
  visible: boolean;
  date?: string; // data inicial no formato ISO ou "YYYY-MM-DD"
  onClose: () => void;
  onSelectDate: (date: string) => void; // Retorna a data selecionada em ISO
}

export function DatePickerModal({ visible, date, onClose, onSelectDate }: DatePickerModalProps) {
    let today = new Date();
    const defaultStyles = useDefaultStyles();
    const [selectedDate, setSelectedDate] = useState<DateType>();
    
  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>Selecionar Data</Text>

        <DateTimePicker
          mode="single"
          date={selectedDate}
          onChange={({ date }) =>  setSelectedDate(date)}
          locale="pt-br"
          monthCaptionFormat="full"
          styles={{
            ...defaultStyles,
            today: { borderColor: colors.yellow.dark, borderWidth: 2 }, // Add a border to today's date
            selected: { backgroundColor: colors.yellow.dark }, // Highlight the selected day
            selected_label: { color: colors.brown.base }, // Highlight the selected day label
         }}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={() => {
              onSelectDate(dayjs(selectedDate).toISOString());
              onClose();
            }}
          >
            <Text style={styles.confirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: "#FAC638",
    marginLeft: 8,
  },
  cancelText: {
    color: "#6B7280",
    fontWeight: "700",
  },
  confirmText: {
    color: "#111827",
    fontWeight: "700",
  },
});
