-- =============================================================
-- 🧩 EXTENSÕES
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 🔐 TABELAS BASE
-- =============================================================

-- Endereços
CREATE TABLE Endereco (
    id_endereco uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    pais varchar(50) NOT NULL,
    estado varchar(50) NOT NULL,
    cidade varchar(50) NOT NULL,
    bairro varchar(50),
    rua varchar(100),
    cep varchar(10),
    numero varchar(10),
    ponto_referencia varchar(150),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Raças
CREATE TABLE Raca (
    id_raca uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome varchar(50) NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Usuários
CREATE TABLE Usuario (
    id_usuario uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id varchar(255) UNIQUE NOT NULL, -- Alterado para varchar para maior compatibilidade
    nome varchar(100) NOT NULL,
    telefone varchar(15),
    email varchar(100),
    cargo varchar(50),
    id_endereco uuid REFERENCES Endereco(id_endereco),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Propriedades
CREATE TABLE Propriedade (
    id_propriedade uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome varchar(100) NOT NULL,
    id_dono uuid REFERENCES Usuario(id_usuario),
    id_endereco uuid REFERENCES Endereco(id_endereco),
    cnpj varchar(18),
    p_abcb boolean,
    tipo_manejo varchar(1),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Grupos
CREATE TABLE Grupo (
    id_grupo uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_grupo varchar(50) NOT NULL,
    nivel_maturidade varchar(1),
    color varchar(7),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Definição das alimentações que vão ser dadas
CREATE TABLE AlimentacaoDef (
    id_aliment_def uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_alimentacao varchar(50) NOT NULL,
    descricao varchar(200),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Registro de quando foi aplicado as alimentações
CREATE TABLE AlimRegistro (
    id_registro uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_grupo uuid REFERENCES Grupo(id_grupo),
    id_aliment_def uuid REFERENCES AlimentacaoDef(id_aliment_def),
    quantidade  decimal(8,2),
    unidade_medida varchar(20),
    freq_dia int,
    dt_registro timestamptz,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indústrias
CREATE TABLE Industria (
    id_industria uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome varchar(20),
    representante varchar(20),
    contato varchar(20),
    observacao varchar(50),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Relacionamento Usuário x Propriedade
CREATE TABLE UsuarioPropriedade (
    id_usuario uuid REFERENCES Usuario(id_usuario),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (id_usuario, id_propriedade)
);

-- Lotes
CREATE TABLE Lote (
    id_lote uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_lote varchar(100),
    nome_lote varchar(100) NOT NULL,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    status varchar(20),
    descricao varchar(200),
    qtd_max int,
    geo_mapa jsonb,
    area_m2 numeric(12,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🐃 Búfalos (Movido para antes para resolver dependência)
-- =============================================================
-- Nota: As referências para MaterialGenetico serão adicionadas via ALTER TABLE
CREATE TABLE Bufalo (
    id_bufalo uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome varchar(20),
    brinco varchar(10),
    microchip varchar(50),
    dt_nascimento timestamptz,
    nivel_maturidade varchar(1),
    sexo varchar(1),
    data_baixa timestamptz,
    status boolean,
    motivo_inativo varchar(100),
    id_raca uuid REFERENCES Raca(id_raca),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    id_grupo uuid REFERENCES Grupo(id_grupo),
    origem varchar(10),
    brinco_original varchar(10),
    registro_prov varchar(10),
    registro_def varchar(10),
    categoria varchar(2),
    id_pai uuid REFERENCES Bufalo(id_bufalo) ON DELETE SET NULL, -- Corrigido de 'bufalos' para 'Bufalo'
    id_mae uuid REFERENCES Bufalo(id_bufalo) ON DELETE SET NULL, -- Corrigido de 'bufalos' para 'Bufalo'
    id_pai_semen uuid, -- Chave estrangeira será adicionada depois
    id_mae_ovulo uuid, -- Chave estrangeira será adicionada depois
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🔬 Material Genético
-- =============================================================
CREATE TABLE MaterialGenetico (
    id_material uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo varchar(20),
    origem varchar(20),
    id_bufalo_origem uuid REFERENCES Bufalo(id_bufalo), -- Agora a referência funciona
    fornecedor varchar(100),
    data_coleta timestamptz,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🧬 Adicionando as Foreign Keys que faltavam em Bufalo
-- =============================================================
ALTER TABLE Bufalo ADD CONSTRAINT fk_pai_semen FOREIGN KEY (id_pai_semen) REFERENCES MaterialGenetico(id_material);
ALTER TABLE Bufalo ADD CONSTRAINT fk_mae_ovulo FOREIGN KEY (id_mae_ovulo) REFERENCES MaterialGenetico(id_material);


-- =============================================================
-- 📊 Dados Zootécnicos
-- =============================================================
CREATE TABLE DadosZootecnicos (
    id_zootec uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_bufalo uuid REFERENCES Bufalo(id_bufalo),
    id_usuario uuid REFERENCES Usuario(id_usuario),
    peso numeric(7,2),
    condicao_corporal numeric(4,2),
    cor_pelagem varchar(30),
    formato_chifre varchar(30),
    porte_corporal varchar(30),
    dt_registro timestamptz NOT NULL,
    tipo_pesagem varchar(50),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 💊 Medicações
-- =============================================================
CREATE TABLE Medicacoes (
    id_medicacao uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_tratamento varchar(30),
    medicacao varchar(30),
    descricao varchar(100),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- ⚕️ Dados Sanitários
-- =============================================================
CREATE TABLE DadosSanitarios (
    id_sanit uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_bufalo uuid REFERENCES Bufalo(id_bufalo),
    id_usuario uuid REFERENCES Usuario(id_usuario),
    id_medicacao uuid REFERENCES Medicacoes(id_medicacao), -- Corrigido de id_medicao
    dt_aplicacao timestamptz NOT NULL,
    dosagem numeric(8,2),
    unidade_medida varchar(20),
    doenca varchar(100),
    necessita_retorno boolean,
    dt_retorno timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- ♀️ Dados Reprodução
-- =============================================================
CREATE TABLE DadosReproducao (
    id_reproducao uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_ovulo uuid REFERENCES MaterialGenetico(id_material),
    id_semen uuid REFERENCES MaterialGenetico(id_material),
    id_bufala uuid REFERENCES Bufalo(id_bufalo),
    id_bufalo uuid REFERENCES Bufalo(id_bufalo),
    tipo_inseminacao varchar(50),
    status varchar(20),
    tipo_parto varchar(20),
    dt_evento timestamptz NOT NULL,
    ocorrencia varchar(50),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🥛 Dados Lactação / Ciclo Lactação
-- =============================================================
CREATE TABLE CiclosLactacao (
    id_ciclo_lactacao uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_bufala uuid REFERENCES Bufalo(id_bufalo),
    dt_parto timestamptz NOT NULL,
    padrao_dias int NOT NULL,
    dt_secagem_prevista timestamptz,
    dt_secagem_real timestamptz,
    status varchar(20) DEFAULT 'Em Lactação',
    observacao text,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE dados_lactacao (
    id_lact uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_bufala uuid REFERENCES Bufalo(id_bufalo),
    id_usuario uuid REFERENCES Usuario(id_usuario),
    id_ciclo_lactacao uuid REFERENCES CiclosLactacao(id_ciclo_lactacao),
    qt_ordenha numeric(8,3),
    periodo varchar(1),
    ocorrencia varchar(50),
    dt_ordenha timestamptz NOT NULL,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🔔 Alertas
-- =============================================================
CREATE TABLE Alerta (
    id_alerta uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    animal_id uuid REFERENCES Bufalo(id_bufalo),
    grupo varchar(100),
    localizacao varchar(100),
    motivo text NOT NULL,
    nicho varchar(20) NOT NULL,
    data_alerta timestamptz NOT NULL,
    prioridade varchar(20) NOT NULL,
    observacao text,
    visto boolean DEFAULT false,
    id_evento_origem uuid,
    tipo_evento_origem varchar(50),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================================
-- 🔧 CORREÇÕES DE COMPATIBILIDADE
-- =============================================================

-- 1. Renomear tabelas para match com a aplicação
ALTER TABLE CiclosLactacao RENAME TO CicloLactacao;
ALTER TABLE dados_lactacao RENAME TO DadosLactacao;
ALTER TABLE Alerta RENAME TO Alertas;

-- 2. Corrigir nome da coluna em DadosSanitarios
ALTER TABLE DadosSanitarios RENAME COLUMN id_medicacao TO id_medicao;

-- 3. Adicionar campos faltando em AlimRegistro
ALTER TABLE AlimRegistro ADD COLUMN id_usuario uuid REFERENCES Usuario(id_usuario);

-- 4. Criar tabela Coleta que está faltando
CREATE TABLE Coleta (
    id_coleta uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_industria uuid REFERENCES Industria(id_industria),
    resultado_teste boolean,
    observacao varchar(50),
    quantidade numeric(8,3),
    dt_coleta timestamptz,
    id_funcionario uuid REFERENCES Usuario(id_usuario),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Criar tabela EstoqueLeite que está faltando
CREATE TABLE EstoqueLeite (
    id_estoque uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    id_usuario uuid REFERENCES Usuario(id_usuario),
    quantidade numeric(10,3),
    dt_registro timestamptz,
    observacao varchar(50),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Criar tabela MovLote que está faltando
CREATE TABLE MovLote (
    id_movimento uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_grupo uuid REFERENCES Grupo(id_grupo),
    id_lote_anterior uuid REFERENCES Lote(id_lote),
    id_lote_atual uuid REFERENCES Lote(id_lote),
    dt_entrada timestamptz NOT NULL,
    dt_saida timestamptz,
    id_propriedade uuid REFERENCES Propriedade(id_propriedade),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);