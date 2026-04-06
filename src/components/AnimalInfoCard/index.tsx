import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import { colors } from "../../styles/colors";
import bufaloService from "../../services/bufaloService";
import Pen from "../../../assets/images/pen.svg";
import { ConfirmModal } from "../ModalStatus";
import { formatarDataBR } from "../../utils/date";
import SelectBottomSheet from "../SelectBottomSheet";

interface Grupo {
    id_grupo: string;
    nome_grupo: string;
    color: string;
}

export const AnimalInfoCard = ({ detalhes, onEdit, onRefresh }: { detalhes: any, onEdit: () => void, onRefresh: () => void }) => {
    
    const maturidadeMap: Record<string, string> = {
        B: "Bezerro", N: "Novilha", T: "Touro", V: "Vaca",
    };
    
    const maturidadeTexto = maturidadeMap[detalhes.nivelMaturidade] || detalhes.nivelMaturidade;
    
    const [isEnabled, setIsEnabled] = useState(Boolean(detalhes?.status));
    const [modalVisible, setModalVisible] = useState(false);
    const [novoStatus, setNovoStatus] = useState<boolean | null>(null);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [grupoAtualId, setGrupoAtualId] = useState<string | null>(detalhes?.id_grupo || null);
    const [novoGrupoSelecionado, setNovoGrupoSelecionado] = useState<string | null>(detalhes?.id_grupo || null);

    const [modalMudarGrupoVisible, setModalMudarGrupoVisible] = useState(false);
    const [idGrupoParaMudar, setIdGrupoParaMudar] = useState<string | null>(null);
    const [nomeGrupoParaMudar, setNomeGrupoParaMudar] = useState('');

    const toggleSwitch = () => {
        const valorPretendido = !isEnabled;
        setNovoStatus(valorPretendido);
        setModalVisible(true);
    };
    
    useEffect(() => {
        const fetchGrupos = async () => {
            try {
                const idPropriedade: string | null | undefined = detalhes.idPropriedade;
                if (idPropriedade) {
                    const gruposApi: Grupo[] = await bufaloService.getGrupos(idPropriedade);
                    setGrupos(gruposApi);
                }
            } catch (err) {
                console.error("Erro ao buscar grupos:", err);
            }
        };
        fetchGrupos();
    }, [detalhes.idPropriedade]);

    const confirmarMudancaGrupo = useCallback(async () => {
        setModalMudarGrupoVisible(false);

        if (idGrupoParaMudar === null) return;
        
        try {
            await bufaloService.moverBufaloDeGrupo(detalhes.idBufalo, idGrupoParaMudar);
            setGrupoAtualId(idGrupoParaMudar);
            setNovoGrupoSelecionado(idGrupoParaMudar);
            Alert.alert("Sucesso", `Movido para o grupo "${nomeGrupoParaMudar}"!`);
            onRefresh();
        } catch (error) {
            console.error("Erro ao alterar grupo:", error);
            Alert.alert("Erro", "Não foi possível alterar o grupo. Tente novamente.");
            setNovoGrupoSelecionado(grupoAtualId); 
        } finally {
            setIdGrupoParaMudar(null);
            setNomeGrupoParaMudar('');
        }
    }, [detalhes.idBufalo, idGrupoParaMudar, nomeGrupoParaMudar, grupoAtualId]);

    const handleMudarGrupo = useCallback(async (idGrupo: string) => {
        if (idGrupo === grupoAtualId) return;

        const novoNomeGrupo = grupos.find(g => g.id_grupo === idGrupo)?.nome_grupo || 'o grupo selecionado';

        setIdGrupoParaMudar(idGrupo);
        setNomeGrupoParaMudar(novoNomeGrupo);
        setModalMudarGrupoVisible(true);
        setNovoGrupoSelecionado(grupoAtualId); 

    }, [grupoAtualId, grupos]);

    const grupoItems = useMemo(() => {
        return grupos.map(g => ({
            label: g.nome_grupo,
            value: g.id_grupo,
        }));
    }, [grupos]);

    const confirmarAlteracaoStatus = async () => {
        if (novoStatus === null) return;
        try {
            await bufaloService.updateBufalo(detalhes.idBufalo, { status: novoStatus });
            setIsEnabled(novoStatus);
            detalhes.status = novoStatus;
        } catch (error) {
            console.error(error);
        } finally {
            setModalVisible(false);
        }
    };

    const cancelarAlteracao = () => {
        setModalVisible(false);
    };
    return (
        <>
            <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                    <View>
                        <View style={styles.nameRow}>
                            <Text style={styles.nameText}>{detalhes?.nome ?? 'Sem Nome'}</Text>
                            {detalhes?.categoria && (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryText}>{detalhes.categoria}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.brincoText}>Brinco Nº: {detalhes?.brinco ?? '-'}</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
                            <Pen width={20} height={20} fill={colors.brown.base} />
                        </TouchableOpacity>
                        <View style={[styles.statusBadge]}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isEnabled ? colors.green.extra : colors.red.extra },
                            ]} />
                            <Text style={[
                                styles.statusText,
                                { color: isEnabled ? colors.green.text : colors.red.text },
                            ]}>
                                {isEnabled ? 'Ativo' : 'Inativo'}
                            </Text>
                            <Switch
                                trackColor={{ false: colors.gray.disabled, true: colors.gray.disabled }}
                                thumbColor={isEnabled ? colors.green.extra : colors.red.extra}
                                onValueChange={toggleSwitch}
                                value={isEnabled} />
                        </View>
                    </View>
                </View>

                <View style={styles.infoGrid}>
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>DT. NASCIMENTO</Text>
                            <Text style={styles.infoValue}>{formatarDataBR(detalhes?.dtNascimento)}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>MATURIDADE</Text>
                            <Text style={styles.infoValue}>{maturidadeTexto ?? '-'}</Text>
                        </View>
                    </View>       
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>SEXO</Text>
                            <Text style={styles.infoValue}>{detalhes?.sexo === 'F' ? 'Fêmea' : 'Macho'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>ORIGEM</Text>
                            <Text style={styles.infoValue}>{detalhes?.origem ?? '-'}</Text>
                        </View>
                    </View>

                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>RAÇA</Text>
                            <Text style={styles.infoValue}>{detalhes?.racaNome ?? '-'}</Text>
                        </View>
                    </View>
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>PAI</Text>
                            <Text style={styles.infoValue}>{detalhes?.paiNome ?? '-'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>MÃE</Text>
                            <Text style={styles.infoValue}>{detalhes?.maeNome ?? '-'}</Text>
                        </View>
                    </View>
                    <View style={[styles.Row, { marginTop: 30 }]}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>GRUPO</Text>
                            <SelectBottomSheet
                                items={grupoItems}
                                value={novoGrupoSelecionado}
                                onChange={handleMudarGrupo}
                                title="Selecionar Grupo"
                                placeholder={detalhes?.grupo?.nomeGrupo || "Sem grupo"}
                            />
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>LOCALIZAÇÃO</Text>
                            <Text style={styles.infoValue2}>{detalhes?.coords?.nome || '-'}</Text>
                        </View>
                    </View>
                </View>
            </View>
          
            <ConfirmModal
                visible={modalMudarGrupoVisible}
                title="Confirmar Mudança de Grupo"
                message={`Deseja realmente mover o animal para o grupo "${nomeGrupoParaMudar}"?`}
                onConfirm={confirmarMudancaGrupo}
                onCancel={() => {
                    setModalMudarGrupoVisible(false);
                    setNovoGrupoSelecionado(grupoAtualId); 
                }}
                confirmText="Mover"/>

            <ConfirmModal
                visible={modalVisible}
                title="Alterar status"
                message={`Deseja mudar o status desse animal para ${novoStatus ? "ATIVO" : "INATIVO"}?`}
                onConfirm={confirmarAlteracaoStatus}
                onCancel={cancelarAlteracao}
                confirmText={novoStatus ? "Ativar" : "Inativar"}
                variant={novoStatus ? "success" : "danger"}/>
        </>
    );
};

const styles = StyleSheet.create({
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 2, 
        zIndex: 1, // Valor baixo para não sobrepor o modal
    },
    infoHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    nameRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8 
    },
    nameText: { 
        fontSize: 20, 
        fontWeight: '700', 
        color: '#1A1A1A' 
    },
    brincoText: { 
        fontSize: 14, 
        color: '#6B7280', 
        marginTop: 2 
    },
    categoryBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    categoryText: { 
        fontSize: 12, 
        fontWeight: '600', 
        color: '#92400E' 
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    statusDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        marginRight: 4 
    },
    statusText: { 
        fontSize: 12, 
        fontWeight: '500' 
    },
    infoGrid: { 
        marginTop: 12, 
        gap: 4 
    },
    Row: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoItem: { 
        width: '48%', 
    },
    infoLabel: { 
        fontSize: 12, 
        color: '#6B7280',
        marginBottom: 4,
        fontWeight: '500',
    },
    subtitle: { 
        fontSize: 14, 
        color: colors.gray.base,
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: { 
        fontSize: 14, 
        fontWeight: '500', 
        color: colors.brown.base, 
    },
    infoValue2: { 
        fontSize: 16, 
        marginTop: 12,
        marginLeft: 4,
        fontWeight: '500', 
        color: colors.brown.base, 
    },
    editButton: {
        padding: 5,
    },
});