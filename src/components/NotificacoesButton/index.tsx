import { TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../../App";
import BellIcon from "../../icons/bell";
import { colors } from "../../styles/colors";

type NavigationProps = NativeStackNavigationProp<
  RootStackParamList,
  "MainTab"
>;

export const NotificacoesButton = () => {
  const navigation = useNavigation<NavigationProps>();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate("Notificacoes")}
    >
      <BellIcon width={30} height={30} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.yellow.button,
    borderRadius: 50,
    marginTop: 35,
    position: "absolute",
    right: 10,
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
