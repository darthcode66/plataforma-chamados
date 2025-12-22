#!/usr/bin/env python3
"""
Script para adicionar coluna dados_extras (JSON) e categoria 'novo_colaborador'
"""
from sqlalchemy import text
from database import engine

def run_migration():
    with engine.connect() as conn:
        print("Executando migração para adicionar dados_extras e categoria novo_colaborador...")

        # 1. Adicionar coluna dados_extras
        print("1. Adicionando coluna dados_extras...")
        conn.execute(text("""
            ALTER TABLE chamados
            ADD COLUMN IF NOT EXISTS dados_extras JSONB;
        """))

        # 2. Atualizar constraint de categoria
        print("2. Removendo constraint antiga de categoria...")
        conn.execute(text("""
            ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_categoria_check;
        """))

        print("3. Adicionando nova constraint de categoria...")
        conn.execute(text("""
            ALTER TABLE chamados ADD CONSTRAINT chamados_categoria_check
                CHECK (categoria IN ('hardware', 'software', 'rede', 'email', 'sistema', 'novo_colaborador', 'outro'));
        """))

        conn.commit()
        print("✓ Migração concluída com sucesso!")
        print("  - Coluna dados_extras adicionada")
        print("  - Categoria 'novo_colaborador' adicionada")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"✗ Erro ao executar migração: {e}")
        exit(1)
