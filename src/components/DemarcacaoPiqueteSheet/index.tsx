import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ToastAndroid, Platform, Alert, TextInput, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { MapLeaflet } from "../Mapa"; 
import { Piquete, piqueteService } from "../../services/piqueteService"; 
import { useGpsLocation } from "../../hooks/useLocation";
import DropDownPicker from "react-native-dropdown-picker";
import { grupoService } from "../../services/grupoService";
import SelectBottomSheet from "../SelectBottomSheet";

interface DemarcacaoPiquete extends Omit<Piquete, 'id' | 'color'> {
    coords: { latitude: number; longitude: number }[];
}

interface DemarcacaoPiqueteSheetProps {
    onClose: () => void;
    propriedadeId: string;
}

type MapMessage =
  | { type: 'CENTER'; data: { latitude: number; longitude: number } }
  | { type: string; data?: any };


// Configuração de cores (Copiada do seu exemplo)
const defaultColors = {
    primary: { base: "#FAC638" }, 
    gray: { base: "#6B7280", claro: "#F8F7F5", disabled: "#E5E7EB" },
    text: { primary: "#111827", secondary: "#4B5563" },
    border: "#E5E7EB",
    white: { base: "#FFF" },
    red: { base: "#EF4444" }
};
const mergedColors = { ...defaultColors, ...colors };

export const DemarcacaoPiqueteSheet: React.FC<DemarcacaoPiqueteSheetProps> = ({ onClose, propriedadeId }) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["70%", "95%"], []);

    const [nomePiquete, setNomePiquete] = useState("");
    const [quantidadeMaxAnimais, setquantidadeMaxAnimais] = useState <number | 1>(0);
    const [demarcacaoCoords, setDemarcacaoCoords] = useState<{ latitude: number; longitude: number }[]>([]);
    const { location: currentLocation, loading: gpsLoading, error: gpsError } = useGpsLocation();
    const simulatedColorId = 'blue'; 
    const [previewPoint, setPreviewPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
    const [grupos, setGrupos] = useState<{label:string,value:string}[]>([]);
    const [openGrupo, setOpenGrupo] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const pendingCenterRef = useRef<
        ((coords: { latitude: number; longitude: number }) => void) | null
    >(null);
    
    const webviewRef = useRef<any>(null);
    const getMapCenter = (): Promise<{ latitude: number; longitude: number }> => {
        return new Promise((resolve) => {
            pendingCenterRef.current = resolve;

            webviewRef.current?.injectJavaScript(`
            window.getCenter();
            true;
            `);
    });
    };
    const handleMapMessage = (data: MapMessage) => {
        if (data.type === 'MAP_READY') {
            setMapReady(true);
        }

        if (data.type === 'CENTER') {
            if (pendingCenterRef.current) {
                pendingCenterRef.current(data.data);
                pendingCenterRef.current = null;
            }
        }

        if (data.type === 'MOVE') {
            setPreviewPoint(data.data);
        }
    };

    useEffect(() => {
        const fetchGrupos = async () => {
            if (!propriedadeId) return;
            const data = await grupoService.getAllByPropriedade(propriedadeId);
            setGrupos(data.map(g => ({ label: g.nome_grupo, value: g.id_grupo })));
        };
        fetchGrupos();
    }, [propriedadeId]);

    useEffect(() => {
        if (webviewRef.current) {
            webviewRef.current.injectJavaScript(`
                window.updatePolyline(
                    ${JSON.stringify(demarcacaoCoords)},
                    ${previewPoint ? JSON.stringify(previewPoint) : 'null'}
                );
                true;
            `);
        }
    }, [demarcacaoCoords, previewPoint]);


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

    const handleAddPoint = async () => {
        const center = await getMapCenter();

        setDemarcacaoCoords(prev => [...prev, center]);

        showToast(`Ponto (${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}) adicionado!`);
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
                nomeLote: nomePiquete,
                idPropriedade: propriedadeId.toString(),
                idGrupo: selectedGrupoId,
                tipoLote: "Pasto",
                status: "ativo",
                descricao: "",
                qtdMax: quantidadeMaxAnimais,
                areaM2: calcularArea(demarcacaoCoords),
                geoMapa: {
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


    useEffect(() => {
    if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
        window.drawPiquetes(
            ${JSON.stringify(mapData.piquetes)},
            ${isClosed}
        );
        true;
        `);
    }
    }, [mapData.piquetes, isClosed]);    

    return (
        <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChange}
            backgroundStyle={{ backgroundColor: "#F8F7F5", borderRadius: 24 }}
            handleIndicatorStyle={{ backgroundColor: "#D1D5DB", height: 4, width: 36 }}
            enablePanDownToClose
            enableContentPanningGesture={false}
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
                            <MapLeaflet ref={webviewRef} piquetes={mapData.piquetes} currentLocation={mapData.location} onMapMessage={handleMapMessage} />
                            <View pointerEvents="none" style={styles.crosshair}>
                                <View style={styles.crosshairLineVertical} />
                                <View style={styles.crosshairLineHorizontal} />
                            </View>
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
                            <Text style={styles.label}>Nome do Piquete</Text>
                            <TextInput
                                placeholder="Digite o nome do Piquete"
                                style={styles.inputBase}
                                value={nomePiquete}
                                onChangeText={setNomePiquete}
                            />

                            <Text style={styles.label}>Quantidade maxima de animais</Text>
                            <TextInput
                                placeholder="Digite a quantidade máxima de animais"
                                keyboardType="numeric"
                                style={styles.inputBase}
                                value={quantidadeMaxAnimais.toString()}
                                onChangeText={ text => setquantidadeMaxAnimais(Number(text))}
                            />
                            
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.label}>Selecione o Grupo</Text>
                                <SelectBottomSheet
                                    items={grupos}
                                    value={selectedGrupoId}
                                    onChange={(val: any) => setSelectedGrupoId(val)}
                                    title="Selecione o Grupo"
                                    placeholder="Selecione o Grupo"/>
                            </View>

                            <View style={styles.row}>
                                <TouchableOpacity style={styles.actionButton} onPress={handleAddPoint}>
                                    <Text style={styles.actionButtonText}>Adicionar Ponto (GPS)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionButton} onPress={() => setIsClosed(true)}>
                                    <Text style={styles.actionButtonText}>Finalizar área</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.row}>
                                <TouchableOpacity style={[styles.actionButton, { marginTop: 8 }]} onPress={handleClearDemarcacao}>
                                        <Text style={styles.actionButtonText}>Limpar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, { marginTop: 8 }]} onPress={handleSaveDemarcacao}>
                                    <Text style={styles.actionButtonText}>Salvar Piquete</Text>
                                </TouchableOpacity>
                            </View>
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
    actionButtonText2: { color: colors.yellow.base, fontWeight: 'bold' },
    crosshair: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 20,
        height: 20,
        marginLeft: -10,
        marginTop: -10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    crosshairLineVertical: {
        position: 'absolute',
        width: 2,
        height: 20,
        backgroundColor: 'red',
    },

    crosshairLineHorizontal: {
        position: 'absolute',
        width: 20,
        height: 2,
        backgroundColor: 'red',
    },
    inputBase: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        borderColor: mergedColors.border,
        paddingHorizontal: 12,
        fontSize: 16,
        color: mergedColors.text.primary,
        backgroundColor: mergedColors.white.base,
        marginBottom: 12
    },
    label: {
        fontSize: 14,
        color: mergedColors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
});
