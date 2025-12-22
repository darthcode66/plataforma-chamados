-- Adicionar status 'cancelado' à constraint da tabela chamados

-- Remover a constraint antiga
ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_status_check;

-- Adicionar nova constraint com 'cancelado'
ALTER TABLE chamados ADD CONSTRAINT chamados_status_check
    CHECK (status IN ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado', 'cancelado'));
