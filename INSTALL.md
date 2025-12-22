# Guia de Instalação - Chamados TI MyCompany

## Pré-requisitos

- Python 3.8+
- PostgreSQL 12+
- pip (gerenciador de pacotes Python)

## Passo a Passo

### 1. Clone ou baixe o projeto

```bash
cd /home/pedro/work/chamados
```

### 2. Crie e configure o banco de dados PostgreSQL

```bash
# Criar banco de dados
sudo -u postgres createdb chamados_db

# Executar script de criação de tabelas
sudo -u postgres psql -d chamados_db -f database.sql
```

### 3. Configure as variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas credenciais
nano .env
```

**Configurações obrigatórias no `.env`:**

```ini
# Database
DB_NAME=chamados_db
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres
DB_HOST=localhost
DB_PORT=5432

# JWT Authentication
SECRET_KEY=gere_uma_chave_secreta_forte_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Telegram (opcional, mas recomendado)
TELEGRAM_BOT_TOKEN=seu_token_do_bot
TELEGRAM_CHAT_ID=seu_chat_id
```

**Para gerar SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Instale as dependências Python

```bash
pip install -r requirements.txt
```

### 5. Inicie o servidor

```bash
# Usando o script de inicialização (recomendado)
./start.sh

# OU manualmente
python api.py
```

### 6. Acesse o sistema

Abra seu navegador em: **http://localhost:8000**

**Credenciais padrão:**
- Email: `ti@MyCompany.com`
- Senha: `admin123`

**⚠️ IMPORTANTE:** Altere a senha padrão após o primeiro login!

## Configuração do Telegram (Opcional)

### 1. Criar um Bot no Telegram

1. Abra o Telegram e procure por `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Copie o token fornecido

### 2. Obter o Chat ID

1. Adicione o bot ao grupo/canal desejado
2. Procure por `@userinfobot` no Telegram
3. Envie qualquer mensagem e copie seu ID
4. OU use: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`

### 3. Configure no .env

```ini
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=-1001234567890
```

## Comandos Úteis

### Verificar logs do servidor
```bash
tail -f /tmp/chamados-MyCompany.log
```

### Reiniciar o servidor
```bash
pkill -f "python api.py"
./start.sh
```

### Backup do banco de dados
```bash
pg_dump -U postgres chamados_db > backup_$(date +%Y%m%d).sql
```

### Restaurar banco de dados
```bash
psql -U postgres chamados_db < backup_20241202.sql
```

## Criar novo usuário TI

Após fazer login como admin, você pode criar novos usuários pela API ou diretamente no banco:

```sql
-- Conectar ao banco
psql -U postgres -d chamados_db

-- Criar usuário TI
-- Senha: sua_senha (hash gerado para bcrypt)
INSERT INTO usuarios (nome, email, senha_hash, tipo)
VALUES ('Nome do TI', 'email@MyCompany.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgOqWYpIm', 'ti');

-- Criar usuário Funcionário
INSERT INTO usuarios (nome, email, senha_hash, tipo)
VALUES ('Nome Funcionário', 'func@MyCompany.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqgOqWYpIm', 'funcionario');
```

## Troubleshooting

### Erro: "Não foi possível conectar ao banco de dados"
- Verifique se o PostgreSQL está rodando: `sudo systemctl status postgresql`
- Verifique as credenciais no arquivo `.env`
- Teste a conexão: `psql -U postgres -d chamados_db`

### Erro: "Module not found"
- Reinstale as dependências: `pip install -r requirements.txt`

### Porta 8000 já em uso
- Mude a porta no arquivo `api.py` (linha final):
  ```python
  uvicorn.run(app, host="0.0.0.0", port=8001)
  ```

### Telegram não envia notificações
- Verifique se o bot foi adicionado ao grupo/canal
- Teste manualmente:
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=Teste"
  ```

## Produção

Para ambiente de produção, recomenda-se:

1. **Use um servidor WSGI como Gunicorn:**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker api:app
   ```

2. **Configure HTTPS com Nginx:**
   ```nginx
   server {
       listen 80;
       server_name chamados.MyCompany.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **Configure variáveis de ambiente seguras**
4. **Habilite logs estruturados**
5. **Configure backup automático do banco**

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs: `tail -f /tmp/chamados-MyCompany.log`
2. Consulte a documentação da API: http://localhost:8000/docs
3. Entre em contato com o TI da MyCompany
