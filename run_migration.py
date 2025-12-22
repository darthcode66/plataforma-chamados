#!/usr/bin/env python3
"""
Script para adicionar o status 'cancelado' à constraint da tabela chamados
"""
from sqlalchemy import text
from database import engine

def run_migration():
    with engine.connect() as conn:
        # Remover constraint antiga
        print("Removendo constraint antiga...")
        conn.execute(text("""
            ALTER TABLE chamados DROP CONSTRAINT IF EXISTS chamados_status_check;
        """))

        # Adicionar nova constraint com 'cancelado'
        print("Adicionando nova constraint com 'cancelado'...")
        conn.execute(text("""
            ALTER TABLE chamados ADD CONSTRAINT chamados_status_check
                CHECK (status IN ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado', 'cancelado'));
        """))

        conn.commit()
        print("✓ Migração concluída com sucesso!")
        print("  O status 'cancelado' foi adicionado à tabela chamados")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"✗ Erro ao executar migração: {e}")
        exit(1)
