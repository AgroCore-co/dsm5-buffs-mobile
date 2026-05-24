import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ToastAndroid, Platform, Alert, TextInput, ActivityIndicator, FlatList, RefreshControl } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { colors } from "../../styles/colors";
import { MapLeaflet } from "../Mapa"; 
import { Piquete, piqueteService } from "../../services/piqueteService"; 
import { useGpsLocation } from "../../hooks/useLocation";
import DropDownPicker from "react-native-dropdown-picker";
import { grupoService } from "../../services/grupoService";
import SelectBottomSheet from "../SelectBottomSheet";
import { usePropriedade } from "../../context/PropriedadeContext";

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



export const VisualizarPiqueteSheet: React.FC<DemarcacaoPiqueteSheetProps> = ({ onClose, propriedadeId }) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "70%"], []);

    const [piquetes, setPiquetes] = useState<Piquete[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { location: currentLocation, loading: gpsLoading, error: gpsError } = useGpsLocation();
    const { propriedadeSelecionada } = usePropriedade();

    useEffect(() => {
        const fetchPiquetes = async () => {
        try {
            if (!propriedadeSelecionada) return; 
            const data = await piqueteService.getAll(propriedadeSelecionada.toString());
            setPiquetes(data);
        } catch (error) {
            console.error("Erro ao buscar piquetes:", error);
        } finally {
            setLoading(false);
        }
        };

        fetchPiquetes();
    }, []);

    const handleSheetChange = useCallback((index: number) => {
        if (index === -1) {
            onClose();
        }
    }, [onClose]);


    const onRefresh = async () => {
        setRefreshing(true);
        if (propriedadeSelecionada) {
        const data = await piqueteService.getAll(propriedadeSelecionada.toString());
        setPiquetes(data);
        }
        setRefreshing(false);
    };

    return (
        <BottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enableDynamicSizing={false}
            onChange={handleSheetChange}
            backgroundStyle={{ backgroundColor: colors.bg.sheet, borderRadius: 24 }}
            handleIndicatorStyle={{ backgroundColor: colors.border.light, height: 4, width: 36 }}
            enablePanDownToClose
            enableContentPanningGesture={false}
            backdropComponent={props => (
                <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} pressBehavior="close" />
            )}>
            <View>
                <View style={styles.header}>
                    <Text style={styles.title}>Demarcação de Nova Área/Piquete</Text>
                </View>

                <BottomSheetScrollView contentContainerStyle={styles.scrollContent}  keyboardShouldPersistTaps="handled">
                    <View style={styles.formContainer}>

                        <View style={styles.mapContainer}>
                            <FlatList
                            data={[{ key: 'map' }]} // fake data
                            keyExtractor={(item) => item.key}
                            renderItem={() => (
                                <MapLeaflet
                                piquetes={piquetes.map(p => ({
                                    ...p,
                                    color: p.grupoCor,
                                }))}
                                currentLocation={currentLocation}
                                />
                            )}
                            refreshControl={
                                <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                />
                            }
                            />
                        </View>
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
        borderBottomColor: colors.bg.subtle
    },
    title: {
        fontWeight: "bold",
        fontSize: 18,
        textAlign: "center",
        color: colors.text.accent
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100
    },
    formContainer: {
        padding: 16,
    },
    sectionTitle: { fontWeight: "600", fontSize: 16, marginVertical: 8, color: colors.text.muted },
    inputFull: { width: "100%", borderWidth: 1, borderColor: colors.border.muted, borderRadius: 6, padding: 12, marginBottom: 12 },
    mapContainer: { height: 300, width: '100%', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.default },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 10 },
    actionButton: { flex: 2, backgroundColor: colors.brand.primary, borderRadius: 6, padding: 12, alignItems: 'center' },
    clearButton: { flex: 1, backgroundColor: colors.text.accent, borderRadius: 6, padding: 12, alignItems: 'center' },
    actionButtonText: { color: colors.text.accent, fontWeight: 'bold' },
    actionButtonText2: { color: colors.brand.primary, fontWeight: 'bold' },
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
        backgroundColor: colors.status.error,
    },

    crosshairLineHorizontal: {
        position: 'absolute',
        width: 20,
        height: 2,
        backgroundColor: colors.status.error,
    },
    inputBase: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        borderColor: colors.border.default,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text.heading,
        backgroundColor: colors.bg.card,
        marginBottom: 12
    },
    label: {
        fontSize: 14,
        color: colors.text.secondary,
        fontWeight: "600",
        marginBottom: 4,
    },
});
