import React, { useState, useEffect, useCallback, useMemo } from "react"; // Adicionado useMemo
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { colors } from "../../styles/colors";
import { ConfirmarAlteracaoStatusModal } from "../ModalAlterarStatus";
import bufaloService from "../../services/bufaloService";
import Pen  from "../../../assets/images/pen.svg";
import { ConfirmModal } from "../ModalDeleteConfirm";

// Definição do tipo para o grupo retornado pela API
// ID_GRUPO E NOME_GRUPO são strings (UUID/Nome)
interface Grupo {
    id_grupo: string; // Tipo conforme o grupoService/API
    nome_grupo: string; // Tipo conforme o grupoService/API
    color: string;
}

export const AnimalInfoCard = ({ detalhes, onEdit }: { detalhes: any, onEdit: () => void }) => {
    
    // ... (Lógica de Estado Existente)
    const maturidadeMap: Record<string, string> = {
        B: "Bezerro", N: "Novilha", T: "Touro", V: "Vaca",
    };
    const maturidadeTexto = maturidadeMap[detalhes.nivel_maturidade] || detalhes.nivel_maturidade;
    const[isEnabled, setIsEnabled] = useState(Boolean(detalhes?.status));
    const [modalVisible, setModalVisible] = useState(false);
    const [novoStatus, setNovoStatus] = useState<boolean | null>(null);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [grupoAtualId, setGrupoAtualId] = useState<string | null>(detalhes?.id_grupo || null);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [novoGrupoSelecionado, setNovoGrupoSelecionado] = useState<string | null>(detalhes?.id_grupo || null);

    const [modalMudarGrupoVisible, setModalMudarGrupoVisible] = useState(false);
    const [idGrupoParaMudar, setIdGrupoParaMudar] = useState<string | null>(null);
    const [nomeGrupoParaMudar, setNomeGrupoParaMudar] = useState('');
    // ... (FUNÇÃO AUXILIAR EXISTENTE)
    const toggleSwitch = () => {
        const valorPretendido = !isEnabled;
        setNovoStatus(valorPretendido);
        setModalVisible(true);
    };
    
    // --- FUNÇÃO DE SERVIÇO PARA GRUPOS (Ajustada para esperar id_propriedade como number, se for o caso) ---
    useEffect(() => {
        const fetchGrupos = async () => {
            try {
                // Removemos a lógica incorreta de parseInt.
                // Usamos o ID da propriedade DIRETAMENTE como STRING (UUID).
                const idPropriedade: number | null | undefined = detalhes.id_propriedade;
                // Verifica se a string (UUID) do ID da propriedade existe e não está vazia.
                if (idPropriedade) {
                    // ⚠️ AQUI, bufaloService.getGrupos deve estar configurado para aceitar STRING.
                    // Se você não o alterou na etapa anterior, certifique-se de que ele chama o grupoService corretamente.
                    const gruposApi: Grupo[] = await bufaloService.getGrupos(idPropriedade);
                    setGrupos(gruposApi);
                } else {
                }
            } catch (err) {
            }
        };
        fetchGrupos();
    }, [detalhes.id_propriedade]);


    const confirmarMudancaGrupo = useCallback(async () => {
        setModalMudarGrupoVisible(false); // Fecha o modal primeiro

        if (idGrupoParaMudar === null) return;
        
        try {
            // Executa a ação
            await bufaloService.moverBufaloDeGrupo(detalhes.id_bufalo, idGrupoParaMudar);
            // Atualiza os estados de sucesso
            setGrupoAtualId(idGrupoParaMudar);
            setNovoGrupoSelecionado(idGrupoParaMudar);
            Alert.alert("Sucesso", `Movido para o grupo "${nomeGrupoParaMudar}"!`);
        } catch (error) {
            console.error("Erro ao alterar grupo:", error);
            Alert.alert("Erro", "Não foi possível alterar o grupo. Tente novamente.");
            // Volta para o grupo anterior em caso de falha
            setNovoGrupoSelecionado(grupoAtualId); 
        } finally {
            // Limpa os estados auxiliares
            setIdGrupoParaMudar(null);
            setNomeGrupoParaMudar('');
        }
    }, [detalhes.id_bufalo, idGrupoParaMudar, nomeGrupoParaMudar, grupoAtualId]);


    // --- NOVA FUNÇÃO PARA ALTERAR O GRUPO (Ajustada para usar a nova rota e tipos) ---
    const handleMudarGrupo = useCallback(async (idGrupo: string | null) => {
        setOpenDropdown(false); // Fecha o dropdown

        if (idGrupo === grupoAtualId || idGrupo === null) {
            return;
        }

        const novoNomeGrupo = grupos.find(g => g.id_grupo === idGrupo)?.nome_grupo || 'o grupo selecionado';

        // 🚨 PREPARA E ABRE O MODAL CUSTOMIZADO
        setIdGrupoParaMudar(idGrupo);
        setNomeGrupoParaMudar(novoNomeGrupo);
        setModalMudarGrupoVisible(true);
        
        // Mantém o dropdown mostrando o grupo atual até a confirmação
        setNovoGrupoSelecionado(grupoAtualId); 

    }, [grupoAtualId, grupos]);


    // Mapeia os grupos para o formato do DropDownPicker (Ajustado para usar nome_grupo/id_grupo)
    const grupoItems = useMemo(() => {
        return grupos.map(g => ({
            label: g.nome_grupo, // Usar nome_grupo
            value: g.id_grupo, // Usar id_grupo (string)
        }));
    }, [grupos]);

    // Busca o nome do grupo atual para exibição
    const nomeGrupoAtual = useMemo(() => {
        const grupo = grupos.find(g => g.id_grupo === grupoAtualId);
        if (grupo) {
            return grupo.nome_grupo;
        }
        if (detalhes && typeof detalhes === 'object' && detalhes.nome_grupo) {
            return detalhes.nome_grupo;
        }
        if (typeof detalhes === 'string' && detalhes) {
             return detalhes;
        }
        return '-' // Usar nome_grupo
    }, [grupos, grupoAtualId, detalhes.grupo]);
    // ... (FUNÇÕES DE STATUS EXISTENTES)
    const confirmarAlteracaoStatus = async () => {
        if (novoStatus === null) return;
        // ... (lógica de confirmação de status original)
        try {
            await bufaloService.updateBufalo(detalhes.id_bufalo, { status: novoStatus });
            setIsEnabled(novoStatus);
            detalhes.status = novoStatus;
        } catch (error) {
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
                {/* Header com nome, categoria e status */}
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
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: isEnabled ? colors.green.active : colors.red.inactive },
                        ]}>
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
                                trackColor={{ false: colors.gray.claro, true: colors.gray.claro }}
                                thumbColor={isEnabled ? colors.green.extra : colors.red.extra}
                                onValueChange={toggleSwitch}
                                value={isEnabled} />
                        </View>
                    </View>
                </View>

                <View style={styles.infoGrid}>
                    {/* Linha 1 */}
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Nascimento</Text>
                            <Text style={styles.infoValue}>{detalhes?.dt_nascimento ? detalhes.dt_nascimento.split('T')[0].split('-').reverse().join('/') : '-'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Maturidade</Text>
                            <Text style={styles.infoValue}>{maturidadeTexto ?? '-'}</Text>
                        </View>
                    </View>
                    {/* Linha 2 */}
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Sexo</Text>
                            <Text style={styles.infoValue}>{detalhes?.sexo === 'F' ? 'Fêmea' : 'Macho'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Origem</Text>
                            <Text style={styles.infoValue}>{detalhes?.origem ?? '-'}</Text>
                        </View>
                    </View>
                    {/* Linha 3 (Raça e GRUPO EDITÁVEL) */}
                    <View style={[styles.Row, {zIndex: openDropdown ? 1000 : 1}]}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Raça</Text>
                            <Text style={styles.infoValue}>{detalhes?.racaNome ?? '-'}</Text>
                        </View>
                        
                        {/* ITEM DE GRUPO COM DROP-DOWN */}
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Grupo</Text>
                            <DropDownPicker
                                open={openDropdown}
                                setOpen={setOpenDropdown}
                                value={novoGrupoSelecionado}
                                setValue={setNovoGrupoSelecionado}
                                items={grupoItems}
                                placeholder={nomeGrupoAtual}
                                // Usa `handleMudarGrupo` ao selecionar
                                onSelectItem={(item) => handleMudarGrupo(item.value as string)}
                                style={styles.dropdownStyle}
                                containerStyle={styles.dropdownContainer}
                                dropDownContainerStyle={styles.dropdownListContainer}
                                textStyle={styles.dropdownText}
                                listMode="SCROLLVIEW"
                            />
                        </View>
                    </View>
                    {/* Linha 4 */}
                    <View style={styles.Row}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Pai</Text>
                            <Text style={styles.infoValue}>{detalhes?.paiNome ?? '-'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Mãe</Text>
                            <Text style={styles.infoValue}>{detalhes?.maeNome ?? '-'}</Text>
                        </View>
                    </View>
                </View>
            </View>
          
            <ConfirmModal
                visible={modalMudarGrupoVisible}
                title="Confirmar Mudança de Grupo"
                // Usa o nome do grupo que foi preparado no handleMudarGrupo
                message={`Deseja realmente mover o animal para o grupo "${nomeGrupoParaMudar}"?`}
                onConfirm={confirmarMudancaGrupo} // Chama a função que executa a API
                onCancel={() => {
                    setModalMudarGrupoVisible(false);
                    // Volta o DropDownPicker para o grupo atual
                    setNovoGrupoSelecionado(grupoAtualId); 
                }}
                confirmText="Mover"
            />

            <ConfirmarAlteracaoStatusModal
                visible={modalVisible}
                novoStatus={novoStatus ?? false}
                onClose={cancelarAlteracao}
                onConfirm={confirmarAlteracaoStatus}
            />
        </>
    );
};

// ... (Estilos permanecem inalterados, exceto a correção de estilo no final)

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
        paddingVertical: 4,
        borderRadius: 16,
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
        flexDirection: 'column', // Alterado para column para facilitar o Dropdown
        marginTop: 12, 
        gap: 4 // Espaçamento entre linhas
    },
    Row: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoItem: { 
        width: '48%', // Garante que dois itens cabem na largura
        // Removido marginBottom para usar o espaçamento do infoGrid
    },
    infoLabel: { 
        fontSize: 12, 
        color: '#6B7280',
        marginBottom: 4,
    },
    infoValue: { 
        fontSize: 14, 
        fontWeight: '500', 
        color: '#1A1A1A', 
        // Removido marginTop: 2 para usar o marginBottom do label
    },
    editButton: {
        padding: 5,
    },
    
    // --- ESTILOS DO DROPDOWN PARA O CAMPO GRUPO ---
    dropdownContainer: {
        width: '100%',
        minHeight: 30, // Altura mínima para caber no infoItem
        marginBottom: 4,
    },
    dropdownStyle: {
        backgroundColor: colors.white.base,
        borderColor: colors.gray.disabled,
        minHeight: 30,
        paddingHorizontal: 4,
    },
    dropdownListContainer: {
        borderColor: colors.gray.disabled,
        backgroundColor: colors.white.base,
        elevation: 5,
        zIndex: 1000,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '500', // Corrigido o erro de sintaxe aqui
    },
});