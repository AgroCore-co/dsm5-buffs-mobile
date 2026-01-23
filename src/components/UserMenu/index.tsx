import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Modal } from "react-native";
import User from "../../../assets/images/user.svg";
import { colors } from "../../styles/colors";
import Exit from "../../icons/exit";
import { useAuth } from "../../context/AuthContext";

export const UserMenu = () => {
  const [visible, setVisible] = useState(false);
  const { logout } = useAuth(); // 🔑 pegar a função de logout

  const handleLogout = () => {
    setVisible(false); // fechar o menu
    logout();          // chamar logout do contexto
  };

  return (
    <>
      {/* Botão do usuário */}
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.button}>
        <User width={20} height={20} style={{ margin: 6 }} />
      </TouchableOpacity>

      {/* Menu suspenso */}
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPressOut={() => setVisible(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuButton} onPress={handleLogout}>
              <Exit width={14} height={14} color={colors.red.base} />
              <Text style={styles.menuText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.yellow.dark,
    borderRadius: 50,
    flexDirection: "row",
    position: "absolute",
    gap: 20,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center' 
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    backgroundColor: "transparent",
  },
  menu: {
    marginTop: 50,
    marginRight: 20,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.red.base,
    marginLeft: 8,
  },
});
