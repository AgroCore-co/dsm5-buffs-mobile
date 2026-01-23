import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../styles/colors";
import BuffsLogo from "../../assets/images/logoBuffs.svg";
import YellowButton from "../components/Button";
import { useAuth } from "../context/AuthContext";
import BuffaloLoader from "../components/BufaloLoader";

export const LoginScreen = () => {
  const { login, authenticating } = useAuth(); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false); // loader local

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError("Por favor, preencha e-mail e senha.");
      return;
    }

    try {
      setLocalLoading(true);
      await login(email, password);   
    } catch (err: any) {
      setError(err.message || "Erro ao tentar entrar.");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ alignItems: "center", marginTop: 150 }}>
        <BuffsLogo width={200} height={200} />
      </View>

      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <YellowButton
        title={authenticating ? "Entrando..." : "Entrar"}
        onPress={handleLogin}
        loading={authenticating}
      />


    </View>
  );
};



const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", marginBottom: 10, padding: 10, borderRadius: 5 },
  title: { fontSize: 24, marginBottom: 20, textAlign: "center" },
  error: { color: "red", marginBottom: 10 },
  signupLink: { color: colors.black.base, marginTop: 10, textAlign: "center", fontSize: 12 },
});
