import smtplib
import os
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(override=True)

# Armazenamento temporário de códigos de verificação (em produção, use Redis ou banco de dados)
verification_codes = {}

def generate_verification_code():
    """Gera um código de verificação de 6 dígitos"""
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(email: str, nome: str) -> str:
    """
    Envia email com código de verificação
    Retorna o código gerado
    """
    code = generate_verification_code()

    # Armazenar código com expiração de 10 minutos
    verification_codes[email] = {
        'code': code,
        'expires_at': datetime.now() + timedelta(minutes=10)
    }

    # Configurações do email
    smtp_host = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    smtp_port = int(os.getenv('EMAIL_PORT', '587'))
    smtp_user = os.getenv('EMAIL_USER')
    smtp_password = os.getenv('EMAIL_PASSWORD')
    email_from = os.getenv('EMAIL_FROM', 'MyCompany - Chamados TI <noreply@example.com>')

    # Criar mensagem
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Código de Verificação - Alteração de Senha'
    msg['From'] = email_from
    msg['To'] = email

    # Corpo do email em HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .container {{
                background: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                color: #1E3A5F;
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 10px;
            }}
            .tagline {{
                color: #6B7684;
                font-size: 14px;
                font-style: italic;
            }}
            .code-box {{
                background: #F8F9FC;
                border: 2px dashed #1E3A5F;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
            }}
            .code {{
                font-size: 36px;
                font-weight: 700;
                color: #1E3A5F;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
            }}
            .warning {{
                background: #FEE2E2;
                border-left: 4px solid #E63946;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: #6B7684;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MyCompany - Chamados TI</div>
                <div class="tagline">where the extraordinary lives</div>
            </div>

            <p>Olá, <strong>{nome}</strong>!</p>

            <p>Você solicitou a alteração de senha da sua conta. Use o código abaixo para continuar:</p>

            <div class="code-box">
                <div class="code">{code}</div>
            </div>

            <div class="warning">
                <strong>⚠️ Atenção:</strong><br>
                • Este código expira em <strong>10 minutos</strong><br>
                • Não compartilhe este código com ninguém<br>
                • Se você não solicitou esta alteração, ignore este email
            </div>

            <p>Se você tiver alguma dúvida, entre em contato com o T.I.</p>

            <div class="footer">
                Este é um email automático, por favor não responda.<br>
                © 2024 MyCompany - Todos os direitos reservados
            </div>
        </div>
    </body>
    </html>
    """

    # Anexar HTML
    part = MIMEText(html, 'html')
    msg.attach(part)

    # Enviar email
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return code
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        # Em desenvolvimento, retornar o código mesmo se falhar
        return code

def verify_code(email: str, code: str) -> bool:
    """
    Verifica se o código é válido para o email
    """
    if email not in verification_codes:
        return False

    stored = verification_codes[email]

    # Verificar se expirou
    if datetime.now() > stored['expires_at']:
        del verification_codes[email]
        return False

    # Verificar se o código está correto
    if stored['code'] != code:
        return False

    return True

def clear_verification_code(email: str):
    """
    Remove o código de verificação após uso
    """
    if email in verification_codes:
        del verification_codes[email]
