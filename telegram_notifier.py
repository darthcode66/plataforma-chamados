import requests
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def enviar_mensagem_telegram(mensagem: str, parse_mode: str = "HTML") -> bool:
    """
    Envia mensagem para o Telegram
    Adaptado do módulo telegram_logger.py do bi-servicos
    """
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("AVISO: Credenciais do Telegram não configuradas")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": mensagem,
        "parse_mode": parse_mode
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return True
    except requests.exceptions.RequestException as e:
        print(f"Erro ao enviar mensagem para o Telegram: {e}")
        return False

def notificar_novo_chamado(chamado_id: int, titulo: str, categoria: str, prioridade: str, usuario_nome: str):
    """Notifica sobre novo chamado"""
    emoji_prioridade = {
        'baixa': '🟢',
        'media': '🟡',
        'alta': '🟠',
        'urgente': '🔴'
    }

    emoji_categoria = {
        'hardware': '🖥️',
        'software': '💻',
        'rede': '🌐',
        'email': '📧',
        'sistema': '⚙️',
        'outro': '📝'
    }

    mensagem = f"""
🆕 <b>NOVO CHAMADO TI MyCompany</b>

{emoji_categoria.get(categoria, '📝')} <b>Categoria:</b> {categoria.upper()}
{emoji_prioridade.get(prioridade, '🟡')} <b>Prioridade:</b> {prioridade.upper()}

<b>Título:</b> {titulo}
<b>Solicitante:</b> {usuario_nome}
<b>Chamado #:</b> {chamado_id}

<i>Acesse o sistema para mais detalhes</i>
    """.strip()

    return enviar_mensagem_telegram(mensagem)

def notificar_alteracao_status(chamado_id: int, titulo: str, status_antigo: str, status_novo: str, usuario_nome: str):
    """Notifica sobre mudança de status"""
    emoji_status = {
        'aberto': '🆕',
        'em_andamento': '⚙️',
        'aguardando': '⏳',
        'resolvido': '✅',
        'fechado': '🔒'
    }

    mensagem = f"""
📊 <b>ATUALIZAÇÃO DE CHAMADO</b>

<b>Chamado #:</b> {chamado_id}
<b>Título:</b> {titulo}

{emoji_status.get(status_antigo, '📝')} {status_antigo.upper()} ➡️ {emoji_status.get(status_novo, '📝')} {status_novo.upper()}

<b>Atualizado por:</b> {usuario_nome}
    """.strip()

    return enviar_mensagem_telegram(mensagem)

def notificar_novo_comentario(chamado_id: int, titulo: str, usuario_nome: str, comentario_preview: str):
    """Notifica sobre novo comentário"""
    # Limita o preview do comentário a 100 caracteres
    if len(comentario_preview) > 100:
        comentario_preview = comentario_preview[:97] + "..."

    mensagem = f"""
💬 <b>NOVO COMENTÁRIO</b>

<b>Chamado #:</b> {chamado_id}
<b>Título:</b> {titulo}

<b>Comentário de {usuario_nome}:</b>
<i>{comentario_preview}</i>
    """.strip()

    return enviar_mensagem_telegram(mensagem)

def notificar_chamado_atribuido(chamado_id: int, titulo: str, atribuido_para_nome: str, atribuido_por_nome: str):
    """Notifica sobre atribuição de chamado"""
    mensagem = f"""
👤 <b>CHAMADO ATRIBUÍDO</b>

<b>Chamado #:</b> {chamado_id}
<b>Título:</b> {titulo}

<b>Atribuído para:</b> {atribuido_para_nome}
<b>Por:</b> {atribuido_por_nome}
    """.strip()

    return enviar_mensagem_telegram(mensagem)
