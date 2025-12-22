from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, CheckConstraint, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    senha_hash = Column(String(255), nullable=False)
    tipo = Column(String(20), nullable=False)  # 'ti' ou 'funcionario'
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    chamados_criados = relationship("Chamado", back_populates="usuario", foreign_keys="Chamado.usuario_id")
    chamados_atribuidos = relationship("Chamado", back_populates="atribuido", foreign_keys="Chamado.atribuido_para")
    comentarios = relationship("Comentario", back_populates="usuario")

    __table_args__ = (
        CheckConstraint("tipo IN ('ti', 'funcionario')"),
    )

class Chamado(Base):
    __tablename__ = "chamados"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(500), nullable=False)
    descricao = Column(Text, nullable=False)
    categoria = Column(String(50), nullable=False)
    prioridade = Column(String(20), nullable=False, default='media')
    status = Column(String(20), nullable=False, default='aberto', index=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    atribuido_para = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    dados_extras = Column(JSON, nullable=True)  # Para dados específicos por categoria
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    fechado_em = Column(DateTime, nullable=True)

    # Relationships
    usuario = relationship("Usuario", back_populates="chamados_criados", foreign_keys=[usuario_id])
    atribuido = relationship("Usuario", back_populates="chamados_atribuidos", foreign_keys=[atribuido_para])
    comentarios = relationship("Comentario", back_populates="chamado", cascade="all, delete-orphan")
    anexos = relationship("Anexo", back_populates="chamado", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("categoria IN ('hardware', 'software', 'rede', 'email', 'sistema', 'novo_colaborador', 'outro')"),
        CheckConstraint("prioridade IN ('baixa', 'media', 'alta', 'urgente')"),
        CheckConstraint("status IN ('aberto', 'em_andamento', 'aguardando', 'resolvido', 'fechado', 'cancelado')"),
    )

class Comentario(Base):
    __tablename__ = "comentarios"

    id = Column(Integer, primary_key=True, index=True)
    chamado_id = Column(Integer, ForeignKey('chamados.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    comentario = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chamado = relationship("Chamado", back_populates="comentarios")
    usuario = relationship("Usuario", back_populates="comentarios")

class Anexo(Base):
    __tablename__ = "anexos"

    id = Column(Integer, primary_key=True, index=True)
    chamado_id = Column(Integer, ForeignKey('chamados.id'), nullable=False)
    nome_arquivo = Column(String(255), nullable=False)
    caminho_arquivo = Column(String(500), nullable=False)
    tamanho_bytes = Column(Integer)
    criado_em = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chamado = relationship("Chamado", back_populates="anexos")
