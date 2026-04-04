import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ToastAndroid, Platform, Alert, TextInput, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { MapLeaflet } from "../Mapa"; 
import { Piquete, piqueteService } from "../../services/piqueteService"; 
import { useGpsLocation } from "../../hooks/useLocation";
import DropDownPicker from "react-native-dropdown-picker";
import { grupoService } from "../../services/grupoService";

interface DemarcacaoPiquete extends Omit<Piquete, 'id' | 'color'> {
    coords: { latitude: number; longitude: number }[];
}

interface DemarcacaoPiqueteSheetProps {
    onClose: () => void;
    propriedadeId: string;
}

export const DemarcacaoPiqueteSheet: React.FC<DemarcacaoPiqueteSheetProps> = ({ onClose, propriedadeId }) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["70%", "95%"], []);

    const [nomePiquete, setNomePiquete] = useState("");
    const [quantidadeMaxAnimais, setquantidadeMaxAnimais] = useState <number | 1>(0);
    const [demarcacaoCoords, setDemarcacaoCoords] = useState<{ latitude: number; longitude: number }[]>([]);
    const { location: currentLocation, loading: gpsLoading, error: gpsError } = useGpsLocation();
    const simulatedColorId = 'blue'; 

    const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
    const [grupos, setGrupos] = useState<{label:string,value:string}[]>([]);
    const [openGrupo, setOpenGrupo] = useState(false);

    useEffect(() => {
        const fetchGrupos = async () => {
            if (!propriedadeId) return;
            const data = await grupoService.getAllByPropriedade(propriedadeId);
            setGrupos(data.map(g => ({ label: g.nome_grupo, value: g.id_grupo })));
        };
        fetchGrupos();
    }, [propriedadeId]);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);

    const showToast = (message: string, isError: boolean = false) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            Alert.alert(isError ? "Erro" : "Sucesso", message);
        }
    };

    const handleAddPoint = () => {
        if (gpsLoading) {
            showToast("Aguarde, o GPS ainda está carregando...", true);
            return;
        }
        if (currentLocation) {
            setDemarcacaoCoords(prev => [...prev, currentLocation]);
            showToast(`Ponto (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}) adicionado!`);
        } else {
            showToast(gpsError || "Não foi possível obter a localização atual.", true);
        }
    };

    const handleSaveDemarcacao = async () => {
        if (!nomePiquete) {
            showToast("Informe o nome do piquete.", true);
            return;
        }
        if (demarcacaoCoords.length < 3) {
            showToast("É preciso de pelo menos 3 pontos para demarcar uma área.", true);
            return;
        }
        if (!selectedGrupoId) {
            showToast("Selecione um grupo.", true);
            return;
        }

        try {
            function calcularArea(coords: {latitude: number, longitude: number}[]) {
                let area = 0;
                const n = coords.length;
                if (n < 3) return 0;
                for (let i = 0; i < n; i++) {
                    const j = (i + 1) % n;
                    area += coords[i].longitude * coords[j].latitude;
                    area -= coords[j].longitude * coords[i].latitude;
                }
                return Math.abs(area / 2) * 1000000; 
            }

            const novoPiquete = {
                nome_lote: nomePiquete,
                id_propriedade: propriedadeId.toString(),
                id_grupo: selectedGrupoId,
                tipo_lote: "Pasto",
                status: "ativo",
                descricao: "",
                qtd_max: quantidadeMaxAnimais,
                area_m2: calcularArea(demarcacaoCoords),
                geo_mapa: {
                    type: "Polygon" as const,
                    coordinates: [
                        demarcacaoCoords.map(c => [c.longitude, c.latitude])
                                        .concat([[demarcacaoCoords[0].longitude, demarcacaoCoords[0].latitude]])
                    ]
                }
            };

            await piqueteService.create(novoPiquete);
            showToast("Piquete demarcado com sucesso!");
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Erro ao criar piquete.", true);
        }
    };

    const handleClearDemarcacao = () => {
        setDemarcacaoCoords([]);
        showToast("Demarcação limpa.");
    };

    const mapPiquetes = useMemo(() => [{
        id: 'current',
        coords: demarcacaoCoords,
        nome: nomePiquete || 'Em Demarcação',
        grupoCor: simulatedColorId,
        grupoNome: 'Demarcando',
        color: simulatedColorId,
    } as Piquete], [demarcacaoCoords, nomePiquete]);

    const mapData = useMemo(() => ({
        piquetes: mapPiquetes,
        location: currentLocation
    }), [mapPiquetes, currentLocation]);


    return (
        <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChange}
            backgroundStyle={{ backgroundColor: "#F8F7F5", borderRadius: 24 }}
            handleIndicatorStyle={{ backgroundColor: "#D1D5DB", height: 4, width: 36 }}
            enablePanDownToClose
            backdropComponent={props => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
            )}>
            <View>
                <View style={styles.header}>
                    <Text style={styles.title}>Demarcação de Nova Área/Piquete</Text>
                </View>

                <BottomSheetScrollView contentContainerStyle={styles.scrollContent} >
                    <View style={styles.formContainer}>

                        <View style={styles.mapContainer}>
                            <MapLeaflet piquetes={mapData.piquetes} currentLocation={mapData.location} />
                        </View>

                    {gpsLoading ? (
                        <View style={{ marginVertical: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={colors.yellow.base} />
                            <Text style={{ marginTop: 8, color: colors.gray.base }}>Carregando localização...</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Pontos Demarcados: {demarcacaoCoords.length}</Text>
                            {gpsError && <Text style={{ color: 'red', marginBottom: 8 }}>Erro GPS: {gpsError}</Text>}

                            <TextInput
                                placeholder="Nome do Piquete"
                                style={styles.inputFull}
                                value={nomePiquete}
                                onChangeText={setNomePiquete}
                            />
                            
                            <TextInput
                                placeholder="Quantidade maxima de animais"
                                keyboardType="numeric"
                                style={styles.inputFull}
                                value={quantidadeMaxAnimais.toString()}
                                onChangeText={ text => setquantidadeMaxAnimais(Number(text))}
                            />

                            <DropDownPicker
                                open={openGrupo}
                                setOpen={setOpenGrupo}
                                value={selectedGrupoId}
                                setValue={setSelectedGrupoId}
                                items={grupos}
                                placeholder="Selecione o Grupo"
                                containerStyle={{ flex: 1, marginBottom: 16 }}
                                listMode="SCROLLVIEW"
                                zIndex={4000}
                            />

                            <View style={styles.row}>
                                <TouchableOpacity style={styles.actionButton} onPress={handleAddPoint}>
                                    <Text style={styles.actionButtonText}>Adicionar Ponto (GPS)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.clearButton} onPress={handleClearDemarcacao}>
                                    <Text style={styles.actionButtonText2}>Limpar</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={[styles.actionButton, { marginTop: 8 }]} onPress={handleSaveDemarcacao}>
                                <Text style={styles.actionButtonText}>Salvar Piquete</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    </View>
                </BottomSheetScrollView>
            </View>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    header: { 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: "#eee" 
    },
    title: { 
        fontWeight: "bold", 
        fontSize: 18, 
        textAlign: "center", 
        color: colors.brown.base 
    },
    scrollContent: { 
        flexGrow: 1, 
        paddingBottom: 100 
    },
    formContainer: { 
        padding: 16, 
    },
    sectionTitle: { fontWeight: "600", fontSize: 16, marginVertical: 8, color: colors.gray.base },
    inputFull: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 12, marginBottom: 12 },
    mapContainer: { height: 300, width: '100%', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray.disabled },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 10 },
    actionButton: { flex: 2, backgroundColor: colors.yellow.base, borderRadius: 6, padding: 12, alignItems: 'center' },
    clearButton: { flex: 1, backgroundColor: colors.brown.base, borderRadius: 6, padding: 12, alignItems: 'center' },
    actionButtonText: { color: colors.brown.base, fontWeight: 'bold' },
    actionButtonText2: { color: colors.yellow.base, fontWeight: 'bold' }

});
