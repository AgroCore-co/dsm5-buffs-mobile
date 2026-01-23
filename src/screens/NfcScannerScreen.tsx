import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Button from '../components/Button'; 
import { colors } from '../styles/colors'; 
import bufaloService from '../services/bufaloService';
import { usePropriedade } from '../context/PropriedadeContext';


type RootStackParamList = {
  NfcScannerScreen: undefined;
  AnimalDetail: { id: string };
};

export const NfcScannerScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { propriedadeSelecionada } = usePropriedade();

    const [lidas, setLidas] = useState<string[]>([]);
    const [statusText, setStatusText] = useState("Iniciando o scanner...");
    
    const isScanningRef = useRef(false);

    const finalizarScanner = () => {
        isScanningRef.current = false;
        try {
            NfcManager.cancelTechnologyRequest();
        } catch (e) {
            console.log("Erro ao limpar requisição NFC:", e);
        }
            navigation.goBack(); 
    };

    const lerProximaTag = async () => {
        if (!isScanningRef.current) return; 

        try {
            setStatusText("Aproxime o brinco do leitor...");
            
            await NfcManager.requestTechnology(NfcTech.NfcA);
            const tag = await NfcManager.getTag();
            
            if (tag?.id) {
                const microchip = tag.id.toUpperCase();
                console.log(`✅ TAG CAPTURADA: ${microchip}`);
                setStatusText(`Microchip ${microchip} lido. Pesquisando animal...`);
                try {
                    const bufalo = await bufaloService.getBufaloPorMicrochip(microchip);

                    await NfcManager.cancelTechnologyRequest();
                    isScanningRef.current = false; 
                    
                    if (bufalo && bufalo.id_bufalo) {
                        setStatusText(`Búfalo encontrado! Redirecionando...`);
                        
                        navigation.replace("AnimalDetail", { id: bufalo.id_bufalo });
                        return; 
                    } else {
                        setStatusText(`Microchip ${microchip} não encontrado. Continue lendo...`);
                    }
                } catch (searchError) {
                    console.error("Erro ao pesquisar búfalo após leitura:", searchError);
                    setStatusText(`Erro ao buscar o animal. Continue lendo...`);
                }
                
                setLidas((prev) => {
                    if (!prev.includes(microchip)) {
                        return [...prev, microchip];
                    }
                    return prev;
                });
            }
            await NfcManager.cancelTechnologyRequest();
            if (isScanningRef.current) {
                 lerProximaTag(); 
            }
        } catch (ex) {
            const errorString = (ex as any).toString();
            
            if (errorString.includes('cancelled') || errorString.includes('timeout')) {
                if (isScanningRef.current) {
                    setStatusText("Tempo esgotado ou cancelado. Tentando novamente...");
                    lerProximaTag(); 
                } else {
                    console.log("Ciclo de leitura finalizado.");
                }
                return;
            }
            setStatusText("Erro crítico no NFC. Parando.");
            isScanningRef.current = false;
        }
    };

    useEffect(() => {
        const initNFC = async () => {
            isScanningRef.current = true;
            try {
                await NfcManager.start();
                const supported = await NfcManager.isSupported();
                const enabled = await NfcManager.isEnabled();

                if (!supported || !enabled) {
                    setStatusText("NFC não disponível ou desativado neste dispositivo.");
                    isScanningRef.current = false;
                    return;
                }
                
                setLidas([]);
                setStatusText("Aguardando aproximação...");
                lerProximaTag(); 

            } catch (err) {
                console.error("Erro fatal ao iniciar NFC:", err);
                setStatusText("Erro de inicialização. Verifique as permissões.");
                isScanningRef.current = false;
            }
        };

        initNFC();

        return () => {
            isScanningRef.current = false;
            try {
                NfcManager.cancelTechnologyRequest();
            } catch (e) {
            }
        };
    }, []); 

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Escaneamento NFC</Text>
                <Text style={styles.status}>{statusText}</Text>
                
                {lidas.length === 0 && isScanningRef.current && (
                    <ActivityIndicator size="large" color={colors.yellow.static} style={{ marginVertical: 20 }} />
                )}

                <Button 
                    title="Finalizar e Voltar" 
                    onPress={finalizarScanner} 
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white.base, justifyContent: 'center', alignItems: 'center', },
    content: { width: '90%', backgroundColor: colors.white.base, borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: colors.brown.base, },
    status: { fontSize: 16, marginBottom: 20, textAlign: 'center', color: colors.gray.base, },
    tagListContainer: { width: '100%', maxHeight: 250, minHeight: 100, borderWidth: 1, borderColor: colors.gray.disabled, borderRadius: 10, padding: 10, marginTop: 15, marginBottom: 20, },
    listTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: colors.brown.base },
    tagList: { flexGrow: 1, },
    tagText: { fontSize: 14, paddingVertical: 4, color: colors.black.base },
    emptyText: { textAlign: 'center', marginTop: 20, color: colors.gray.base, },
    button: { backgroundColor: colors.yellow.dark, padding: 10, borderRadius: 10 }
});