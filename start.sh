#!/bin/bash

echo "=================================="
echo "  Chamados TI NAU - Inicialização"
echo "=================================="
echo ""

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado!"
    echo "📝 Copie .env.example para .env e configure suas credenciais"
    echo ""
    echo "cp .env.example .env"
    echo ""
    exit 1
fi

# Verificar se venv existe
if [ ! -d "venv" ]; then
    echo "⚠️  Ambiente virtual não encontrado!"
    echo "📦 Criando ambiente virtual e instalando dependências..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart pydantic pydantic-settings python-dotenv requests pg8000
    echo "✅ Dependências instaladas!"
else
    source venv/bin/activate
fi

echo "✅ Ambiente virtual ativado"
echo ""

# Verificar conexão com banco
echo "🔌 Testando conexão com Supabase..."
python -c "
from database import engine
try:
    with engine.connect() as conn:
        print('✅ Conexão com Supabase OK!')
except Exception as e:
    print(f'❌ Erro na conexão: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo ""
    echo "Verifique as credenciais no arquivo .env"
    exit 1
fi

echo ""
echo "🚀 Iniciando servidor FastAPI..."
echo ""
echo "📍 Sistema: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "🔐 Login padrão:"
echo "   Email: ti@nau.com"
echo "   Senha: admin123"
echo ""
echo "Press CTRL+C to stop"
echo ""

python api.py
