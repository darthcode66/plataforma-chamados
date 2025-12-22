from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Schemas de Usuário
class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    tipo: str = Field(..., pattern="^(ti|funcionario)$")

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: Optional[bool] = None

class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    criado_em: datetime

    class Config:
        from_attributes = True

class UsuarioImport(BaseModel):
    nome: str
    email: EmailStr
    tipo: str = Field(..., pattern="^(ti|funcionario)$")

class ImportUsuariosRequest(BaseModel):
    usuarios: List[UsuarioImport]

class ImportUsuariosResponse(BaseModel):
    criados: int
    erros: int
    detalhes: List[dict]

# Schemas de Autenticação
class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Schemas de Chamado
class ChamadoBase(BaseModel):
    titulo: str = Field(..., max_length=500)
    descricao: str
    categoria: str = Field(..., pattern="^(hardware|software|rede|email|sistema|novo_colaborador|outro)$")

class ChamadoCreate(ChamadoBase):
    dados_extras: Optional[dict] = None

class ChamadoUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=500)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, pattern="^(hardware|software|rede|email|sistema|novo_colaborador|outro)$")
    prioridade: Optional[str] = Field(None, pattern="^(baixa|media|alta|urgente)$")
    status: Optional[str] = Field(None, pattern="^(aberto|em_andamento|aguardando|resolvido|fechado|cancelado)$")
    atribuido_para: Optional[int] = None
    dados_extras: Optional[dict] = None

class ComentarioCreate(BaseModel):
    comentario: str = Field(..., min_length=1)

class ComentarioResponse(BaseModel):
    id: int
    comentario: str
    criado_em: datetime
    usuario: UsuarioResponse

    class Config:
        from_attributes = True

class ChamadoResponse(ChamadoBase):
    id: int
    prioridade: str
    status: str
    usuario_id: int
    atribuido_para: Optional[int] = None
    dados_extras: Optional[dict] = None
    criado_em: datetime
    atualizado_em: datetime
    fechado_em: Optional[datetime] = None
    usuario: UsuarioResponse
    atribuido: Optional[UsuarioResponse] = None
    comentarios: List[ComentarioResponse] = []

    class Config:
        from_attributes = True

class ChamadoListResponse(BaseModel):
    id: int
    titulo: str
    categoria: str
    prioridade: str
    status: str
    usuario_id: int
    atribuido_para: Optional[int] = None
    criado_em: datetime
    atualizado_em: datetime
    usuario: UsuarioResponse
    atribuido: Optional[UsuarioResponse] = None

    class Config:
        from_attributes = True

# Schemas de Estatísticas
class EstatisticasResponse(BaseModel):
    total_chamados: int
    abertos: int
    em_andamento: int
    aguardando: int
    resolvidos: int
    fechados: int
    por_categoria: dict
    por_prioridade: dict

# Schemas de Alteração de Senha
class SendVerificationCodeRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

class ChangePasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
