# Chamados TI MyCompany

Sistema de gerenciamento de chamados de TI da MyCompany com autenticação, notificações Telegram e visualização Kanban.

## Tecnologias

**Backend:**
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy
- JWT Authentication
- Telegram Bot API

**Frontend:**
- HTML5/CSS3
- JavaScript (Vanilla)
- Fetch API

## Instalação

### 1. Configurar Banco de Dados

```bash
# Criar banco de dados PostgreSQL
createdb chamados_db

# Executar script de criação de tabelas
psql -U postgres -d chamados_db -f database.sql
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

### 3. Instalar Dependências Python

```bash
pip install -r requirements.txt
```

### 4. Iniciar Servidor

```bash
python api.py
```

O servidor estará rodando em: http://localhost:8000

## Configuração do Telegram

1. Criar bot com @BotFather no Telegram
2. Obter token do bot
3. Obter chat_id (pode usar @userinfobot)
4. Adicionar credenciais no arquivo `.env`

## Usuário Padrão

- **Email:** ti@MyCompany.com
- **Senha:** admin123

**IMPORTANTE:** Altere a senha após o primeiro login!

## Estrutura de Permissões

### TI (Administrador)
- Ver todos os chamados
- Alterar prioridade, status e atribuição
- Adicionar comentários
- Encerrar/deletar chamados
- Criar novos usuários
- Ver estatísticas

### Funcionário
- Abrir novos chamados
- Ver apenas seus próprios chamados
- Editar título/descrição dos seus chamados
- Adicionar comentários nos seus chamados
- Acompanhar progresso

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Dados do usuário logado

### Usuários
- `POST /api/usuarios` - Criar usuário (TI)
- `GET /api/usuarios` - Listar usuários (TI)
- `GET /api/usuarios/ti` - Listar usuários TI
- `PUT /api/usuarios/{id}` - Atualizar usuário (TI)

### Chamados
- `POST /api/chamados` - Criar chamado
- `GET /api/chamados` - Listar chamados
- `GET /api/chamados/{id}` - Obter chamado
- `PUT /api/chamados/{id}` - Atualizar chamado
- `DELETE /api/chamados/{id}` - Deletar chamado (TI)

### Comentários
- `POST /api/chamados/{id}/comentarios` - Adicionar comentário

### Estatísticas
- `GET /api/estatisticas` - Obter estatísticas (TI)

## Notificações Telegram

O sistema envia notificações automáticas para:
- Novo chamado criado
- Alteração de status
- Novo comentário
- Atribuição de chamado

## Identidade Visual

O sistema utiliza a identidade visual da MyCompany:
- **Cores:** Azul escuro (#1E3A5F) e Vermelho (#E63946)
- **Logo:** Favicon MyCompany
- **Tipografia:** Open Sans
