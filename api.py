from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import timedelta, datetime
import os
import json

from database import get_db, engine
from models import Base, Usuario, Chamado, Comentario
from schemas import (
    UsuarioCreate, UsuarioResponse, UsuarioUpdate,
    LoginRequest, Token,
    ChamadoCreate, ChamadoUpdate, ChamadoResponse, ChamadoListResponse,
    ComentarioCreate, ComentarioResponse,
    EstatisticasResponse,
    SendVerificationCodeRequest, VerifyCodeRequest, ChangePasswordRequest,
    ImportUsuariosRequest, ImportUsuariosResponse
)
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_current_ti_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from telegram_notifier import (
    notificar_novo_chamado, notificar_alteracao_status,
    notificar_novo_comentario, notificar_chamado_atribuido
)
from email_graph import send_verification_email, verify_code, clear_verification_code, send_welcome_email

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chamados TI MyCompany",
    description="Sistema de gerenciamento de chamados de TI da MyCompany",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (CSS, JS, images)
if os.path.exists("assets"):
    app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# ============================================================================
# WEBSOCKET MANAGER
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive and handle messages
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle different message types
            if message.get('type') == 'view_ticket':
                # Broadcast that ticket was viewed (include user_id to avoid self-marking)
                await manager.broadcast({
                    "type": "ticket_viewed",
                    "ticket_id": message.get('ticket_id'),
                    "user_id": message.get('user_id')
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================================================
# ENDPOINTS DE AUTENTICAÇÃO
# ============================================================================

@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Login de usuário"""
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": user
    }

@app.get("/api/auth/me", response_model=UsuarioResponse)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    """Retorna dados do usuário logado"""
    return current_user

# ============================================================================
# ENDPOINTS DE USUÁRIOS
# ============================================================================

@app.post("/api/usuarios", response_model=UsuarioResponse)
async def criar_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Criar novo usuário (somente TI)"""
    # Verificar se email já existe
    db_user = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    # Criar usuário
    senha_hash = get_password_hash(usuario.senha)
    db_user = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=senha_hash,
        tipo=usuario.tipo
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user

@app.post("/api/usuarios/import", response_model=ImportUsuariosResponse)
async def importar_usuarios(
    request: ImportUsuariosRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Importar usuários em massa (somente TI)"""
    senha_padrao = "Ramalhos@2025"
    criados = 0
    erros = 0
    detalhes = []

    for usuario_data in request.usuarios:
        try:
            # Verificar se email já existe
            db_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
            if db_user:
                erros += 1
                detalhes.append({
                    "email": usuario_data.email,
                    "status": "erro",
                    "mensagem": "Email já cadastrado"
                })
                continue

            # Criar usuário com senha padrão
            senha_hash = get_password_hash(senha_padrao)
            novo_usuario = Usuario(
                nome=usuario_data.nome,
                email=usuario_data.email,
                senha_hash=senha_hash,
                tipo=usuario_data.tipo
            )
            db.add(novo_usuario)
            db.commit()
            db.refresh(novo_usuario)

            # Enviar email de boas-vindas
            email_enviado = send_welcome_email(
                email=usuario_data.email,
                nome=usuario_data.nome,
                senha_inicial=senha_padrao
            )

            criados += 1
            detalhes.append({
                "email": usuario_data.email,
                "status": "criado",
                "mensagem": "Usuário criado com sucesso",
                "email_enviado": email_enviado
            })

        except Exception as e:
            erros += 1
            detalhes.append({
                "email": usuario_data.email,
                "status": "erro",
                "mensagem": str(e)
            })
            db.rollback()

    return ImportUsuariosResponse(
        criados=criados,
        erros=erros,
        detalhes=detalhes
    )

@app.get("/api/usuarios", response_model=List[UsuarioResponse])
async def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Listar todos os usuários (somente TI)"""
    usuarios = db.query(Usuario).all()
    return usuarios

@app.get("/api/usuarios/ti", response_model=List[UsuarioResponse])
async def listar_usuarios_ti(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Listar usuários do TI (para atribuição)"""
    usuarios = db.query(Usuario).filter(Usuario.tipo == 'ti', Usuario.ativo == True).all()
    return usuarios

@app.put("/api/usuarios/{usuario_id}", response_model=UsuarioResponse)
async def atualizar_usuario(
    usuario_id: int,
    usuario_update: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Atualizar usuário (somente TI)"""
    db_user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    update_data = usuario_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user

# ============================================================================
# ENDPOINTS DE CHAMADOS
# ============================================================================

@app.post("/api/chamados", response_model=ChamadoResponse)
async def criar_chamado(
    chamado: ChamadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Criar novo chamado"""
    db_chamado = Chamado(
        titulo=chamado.titulo,
        descricao=chamado.descricao,
        categoria=chamado.categoria,
        usuario_id=current_user.id,
        status='aberto',
        prioridade='media',
        dados_extras=chamado.dados_extras
    )
    db.add(db_chamado)
    db.commit()
    db.refresh(db_chamado)

    # Notificar via Telegram
    notificar_novo_chamado(
        chamado_id=db_chamado.id,
        titulo=db_chamado.titulo,
        categoria=db_chamado.categoria,
        prioridade=db_chamado.prioridade,
        usuario_nome=current_user.nome
    )

    # Notificar via WebSocket sobre o novo chamado
    await manager.broadcast({
        "type": "ticket_created",
        "ticket_id": db_chamado.id
    })

    return db_chamado

@app.get("/api/chamados", response_model=List[ChamadoListResponse])
async def listar_chamados(
    status: str = None,
    categoria: str = None,
    prioridade: str = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Listar chamados"""
    query = db.query(Chamado)

    # Se não for TI, mostrar apenas chamados do próprio usuário
    if current_user.tipo != 'ti':
        query = query.filter(Chamado.usuario_id == current_user.id)

    # Filtros
    if status:
        query = query.filter(Chamado.status == status)
    if categoria:
        query = query.filter(Chamado.categoria == categoria)
    if prioridade:
        query = query.filter(Chamado.prioridade == prioridade)

    chamados = query.order_by(Chamado.criado_em.desc()).all()
    return chamados

@app.get("/api/chamados/{chamado_id}", response_model=ChamadoResponse)
async def obter_chamado(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obter detalhes de um chamado"""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()

    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    # Verificar permissão
    if current_user.tipo != 'ti' and chamado.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão para acessar este chamado")

    return chamado

@app.put("/api/chamados/{chamado_id}", response_model=ChamadoResponse)
async def atualizar_chamado(
    chamado_id: int,
    chamado_update: ChamadoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Atualizar chamado"""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()

    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    # Verificar permissões
    if current_user.tipo == 'ti':
        # TI pode atualizar tudo
        update_data = chamado_update.dict(exclude_unset=True)

        # Capturar mudanças de status para notificação
        status_antigo = chamado.status
        atribuido_antigo = chamado.atribuido_para

        for field, value in update_data.items():
            setattr(chamado, field, value)

        # Se mudou status, atualizar fechado_em
        if 'status' in update_data:
            if update_data['status'] in ['resolvido', 'fechado']:
                chamado.fechado_em = datetime.utcnow()

            # Notificar mudança de status
            if status_antigo != update_data['status']:
                notificar_alteracao_status(
                    chamado_id=chamado.id,
                    titulo=chamado.titulo,
                    status_antigo=status_antigo,
                    status_novo=update_data['status'],
                    usuario_nome=current_user.nome
                )

        # Se foi atribuído, notificar
        if 'atribuido_para' in update_data and update_data['atribuido_para'] != atribuido_antigo:
            if update_data['atribuido_para']:
                atribuido = db.query(Usuario).filter(Usuario.id == update_data['atribuido_para']).first()
                if atribuido:
                    notificar_chamado_atribuido(
                        chamado_id=chamado.id,
                        titulo=chamado.titulo,
                        atribuido_para_nome=atribuido.nome,
                        atribuido_por_nome=current_user.nome
                    )

    else:
        # Funcionário só pode editar título, descrição e categoria do próprio chamado
        # E também pode cancelar o próprio chamado
        if chamado.usuario_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sem permissão para editar este chamado")

        campos_permitidos = ['titulo', 'descricao', 'categoria']
        update_data_dict = chamado_update.dict(exclude_unset=True)
        update_data = {k: v for k, v in update_data_dict.items() if k in campos_permitidos}

        # Permitir cancelamento
        if 'status' in update_data_dict and update_data_dict['status'] == 'cancelado':
            update_data['status'] = 'cancelado'

        for field, value in update_data.items():
            setattr(chamado, field, value)

    db.commit()
    db.refresh(chamado)

    # Notificar via WebSocket sobre a atualização
    await manager.broadcast({
        "type": "ticket_updated",
        "ticket_id": chamado.id,
        "status": chamado.status
    })

    return chamado

@app.delete("/api/chamados/{chamado_id}")
async def deletar_chamado(
    chamado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Deletar chamado (somente TI)"""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()

    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    db.delete(chamado)
    db.commit()
    return {"message": "Chamado deletado com sucesso"}

# ============================================================================
# ENDPOINTS DE COMENTÁRIOS
# ============================================================================

@app.post("/api/chamados/{chamado_id}/comentarios", response_model=ComentarioResponse)
async def adicionar_comentario(
    chamado_id: int,
    comentario: ComentarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Adicionar comentário a um chamado"""
    chamado = db.query(Chamado).filter(Chamado.id == chamado_id).first()

    if not chamado:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    # Verificar permissão
    if current_user.tipo != 'ti' and chamado.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão para comentar neste chamado")

    db_comentario = Comentario(
        chamado_id=chamado_id,
        usuario_id=current_user.id,
        comentario=comentario.comentario
    )
    db.add(db_comentario)
    db.commit()
    db.refresh(db_comentario)

    # Notificar novo comentário
    notificar_novo_comentario(
        chamado_id=chamado_id,
        titulo=chamado.titulo,
        usuario_nome=current_user.nome,
        comentario_preview=comentario.comentario
    )

    # Notificar via WebSocket sobre o novo comentário
    await manager.broadcast({
        "type": "comment_added",
        "ticket_id": chamado_id
    })

    return db_comentario

# ============================================================================
# ENDPOINTS DE ESTATÍSTICAS
# ============================================================================

@app.get("/api/estatisticas", response_model=EstatisticasResponse)
async def obter_estatisticas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_ti_user)
):
    """Obter estatísticas dos chamados (somente TI)"""

    # Contagens por status
    total = db.query(Chamado).count()
    abertos = db.query(Chamado).filter(Chamado.status == 'aberto').count()
    em_andamento = db.query(Chamado).filter(Chamado.status == 'em_andamento').count()
    aguardando = db.query(Chamado).filter(Chamado.status == 'aguardando').count()
    resolvidos = db.query(Chamado).filter(Chamado.status == 'resolvido').count()
    fechados = db.query(Chamado).filter(Chamado.status == 'fechado').count()

    # Por categoria
    categorias = db.query(
        Chamado.categoria,
        func.count(Chamado.id)
    ).group_by(Chamado.categoria).all()
    por_categoria = {cat: count for cat, count in categorias}

    # Por prioridade
    prioridades = db.query(
        Chamado.prioridade,
        func.count(Chamado.id)
    ).group_by(Chamado.prioridade).all()
    por_prioridade = {pri: count for pri, count in prioridades}

    return {
        "total_chamados": total,
        "abertos": abertos,
        "em_andamento": em_andamento,
        "aguardando": aguardando,
        "resolvidos": resolvidos,
        "fechados": fechados,
        "por_categoria": por_categoria,
        "por_prioridade": por_prioridade
    }

# ============================================================================
# ENDPOINT DE HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    """Serve frontend"""
    return FileResponse("index.html")

@app.get("/style.css")
async def get_css():
    """Serve CSS"""
    return FileResponse("style.css")

@app.get("/script.js")
async def get_js():
    """Serve JavaScript"""
    return FileResponse("script.js")

@app.get("/alterar-senha.html")
async def get_change_password_page():
    """Serve change password page"""
    return FileResponse("alterar-senha.html")

@app.get("/alterar-senha.js")
async def get_change_password_js():
    """Serve change password JavaScript"""
    return FileResponse("alterar-senha.js")

@app.get("/health")
async def health_check():
    """Health check"""
    return {
        "status": "online",
        "service": "Chamados TI MyCompany API",
        "version": "1.0.0"
    }

# ============================================================================
# ENDPOINTS DE ALTERAÇÃO DE SENHA
# ============================================================================

@app.post("/api/auth/send-verification-code")
async def send_verification_code(request: SendVerificationCodeRequest, db: Session = Depends(get_db)):
    """
    Envia código de verificação por email para alteração de senha
    """
    # Verificar se o usuário existe
    user = db.query(Usuario).filter(Usuario.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    try:
        # Enviar email com código
        code = send_verification_email(request.email, user.nome)
        return {
            "message": "Código de verificação enviado para seu email",
            "email": request.email,
            # Em desenvolvimento, retornar o código (remover em produção)
            "code_dev": code
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao enviar email: {str(e)}"
        )

@app.post("/api/auth/verify-code")
async def verify_verification_code(request: VerifyCodeRequest):
    """
    Verifica se o código de verificação é válido
    """
    is_valid = verify_code(request.email, request.code)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido ou expirado"
        )

    return {
        "message": "Código verificado com sucesso",
        "valid": True
    }

@app.post("/api/auth/change-password")
async def change_password(request: ChangePasswordRequest, db: Session = Depends(get_db)):
    """
    Altera a senha do usuário após validação do código
    """
    # Verificar código novamente
    is_valid = verify_code(request.email, request.code)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido ou expirado"
        )

    # Buscar usuário
    user = db.query(Usuario).filter(Usuario.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )

    # Atualizar senha
    user.senha_hash = get_password_hash(request.new_password)
    db.commit()

    # Limpar código de verificação
    clear_verification_code(request.email)

    return {
        "message": "Senha alterada com sucesso",
        "email": request.email
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
