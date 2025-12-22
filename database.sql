-- Database Schema for Chamados TI NAU

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ti', 'funcionario')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamados (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(500) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('hardware', 'software', 'rede', 'email', 'sistema', 'outro')),
    prioridade VARCHAR(20) NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    status VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado', 'cancelado')),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    atribuido_para INTEGER REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechado_em TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comentarios (
    id SERIAL PRIMARY KEY,
    chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    comentario TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anexos (
    id SERIAL PRIMARY KEY,
    chamado_id INTEGER NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_bytes INTEGER,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_chamados_usuario ON chamados(usuario_id);
CREATE INDEX idx_chamados_status ON chamados(status);
CREATE INDEX idx_chamados_prioridade ON chamados(prioridade);
CREATE INDEX idx_chamados_atribuido ON chamados(atribuido_para);
CREATE INDEX idx_comentarios_chamado ON comentarios(chamado_id);
CREATE INDEX idx_anexos_chamado ON anexos(chamado_id);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usuarios_atualizado
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trigger_chamados_atualizado
    BEFORE UPDATE ON chamados
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- Usuário admin padrão (senha: admin123 - MUDAR EM PRODUÇÃO!)
-- Hash bcrypt para 'admin123'
INSERT INTO usuarios (nome, email, senha_hash, tipo)
VALUES ('Admin TI', 'ti@nau.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgOqWYpIm', 'ti')
ON CONFLICT (email) DO NOTHING;
