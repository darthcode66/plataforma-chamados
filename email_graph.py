"""
Microsoft Graph API Email Service
Envia emails usando Microsoft Graph API com autenticação de aplicativo
"""

import os
import requests
import random
import string
from datetime import datetime, timedelta
from msal import ConfidentialClientApplication
from dotenv import load_dotenv

load_dotenv(override=True)

# Armazenamento temporário de códigos de verificação
verification_codes = {}

def get_access_token():
    """Obtém token de acesso usando credenciais do aplicativo"""
    client_id = os.getenv('AZURE_CLIENT_ID')
    tenant_id = os.getenv('AZURE_TENANT_ID')
    client_secret = os.getenv('AZURE_CLIENT_SECRET')

    authority = f"https://login.microsoftonline.com/{tenant_id}"
    scope = ["https://graph.microsoft.com/.default"]

    app = ConfidentialClientApplication(
        client_id=client_id,
        client_credential=client_secret,
        authority=authority
    )

    result = app.acquire_token_silent(scope, account=None)
    if not result:
        result = app.acquire_token_for_client(scopes=scope)

    if "access_token" in result:
        return result["access_token"]
    else:
        raise Exception(f"Erro ao obter token: {result.get('error_description', 'Erro desconhecido')}")

def send_email_graph(to_email: str, subject: str, html_body: str):
    """Envia email usando Microsoft Graph API"""
    token = get_access_token()

    from_email = os.getenv('EMAIL_FROM', 'ti@example.com')
    from_name = os.getenv('EMAIL_FROM_NAME', 'MyCompany - Chamados TI')

    # Construir mensagem
    message = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML",
                "content": html_body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": to_email
                    }
                }
            ],
            "from": {
                "emailAddress": {
                    "address": from_email,
                    "name": from_name
                }
            }
        },
        "saveToSentItems": "true"
    }

    # Enviar via Graph API
    endpoint = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(endpoint, headers=headers, json=message)

    if response.status_code == 202:
        return True
    else:
        error_msg = response.text
        raise Exception(f"Erro ao enviar email (HTTP {response.status_code}): {error_msg}")

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

    # Corpo do email em HTML
    html_body = f"""
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
                <strong>Atenção:</strong><br>
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

    try:
        send_email_graph(
            to_email=email,
            subject="Código de Verificação - Alteração de Senha",
            html_body=html_body
        )
        return code
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        # Em desenvolvimento, retornar o código mesmo se falhar
        return code

def verify_code(email: str, code: str) -> bool:
    """Verifica se o código é válido para o email"""
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
    """Remove o código de verificação após uso"""
    if email in verification_codes:
        del verification_codes[email]

def send_welcome_email(email: str, nome: str, senha_inicial: str):
    """
    Envia email de boas-vindas para novo usuário
    """
    html_body = f"""
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
                padding-bottom: 20px;
                border-bottom: 2px solid #1E3A5F;
            }}
            .logo {{
                color: #1E3A5F;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
            }}
            .tagline {{
                color: #6B7684;
                font-size: 14px;
                font-style: italic;
            }}
            .welcome-box {{
                background: #F8F9FC;
                border-left: 4px solid #1E3A5F;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .credentials {{
                background: #FFF;
                border: 2px solid #E5E7EB;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }}
            .credentials strong {{
                color: #1E3A5F;
            }}
            .button {{
                display: inline-block;
                background: #1E3A5F;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 8px;
                margin: 20px 0;
                font-weight: 600;
            }}
            .info-box {{
                background: #FEF3C7;
                border-left: 4px solid #F59E0B;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                font-size: 14px;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
                color: #6B7684;
                font-size: 12px;
            }}
            .feature {{
                margin: 10px 0;
                padding-left: 20px;
            }}
            .feature:before {{
                content: "✓";
                color: #10B981;
                font-weight: bold;
                margin-right: 10px;
                margin-left: -20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MyCompany - Chamados TI</div>
                <div class="tagline">where the extraordinary lives</div>
            </div>

            <h2 style="color: #1E3A5F;">Bem-vindo(a), {nome}!</h2>

            <div class="welcome-box">
                <p style="margin: 0;">
                    Sua conta foi criada com sucesso na plataforma MyCompany Support TI!
                </p>
            </div>

            <p>Este sistema foi desenvolvido para facilitar a comunicação entre os colaboradores e a equipe de TI da MyCompany.</p>

            <h3 style="color: #1E3A5F; margin-top: 30px;">Seus Dados de Acesso:</h3>
            <div class="credentials">
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Senha Inicial:</strong> {senha_inicial}</p>
            </div>

            <div class="info-box">
                <strong>Importante:</strong> Por segurança, recomendamos que você altere sua senha no primeiro acesso!
            </div>

            <div style="text-align: center;">
                <a href="http://chamados.example.com" class="button">Acessar Plataforma</a>
            </div>

            <h3 style="color: #1E3A5F; margin-top: 30px;">Como Usar a Plataforma:</h3>

            <div class="feature">
                <strong>Criar Chamados:</strong> Relate problemas de hardware, software, rede, email ou outros.
            </div>
            <div class="feature">
                <strong>Acompanhar Status:</strong> Veja o andamento dos seus chamados em tempo real.
            </div>
            <div class="feature">
                <strong>Comentar:</strong> Adicione informações ou esclareça dúvidas nos chamados.
            </div>
            <div class="feature">
                <strong>Categorizar:</strong> Escolha a categoria correta para agilizar o atendimento.
            </div>

            <h3 style="color: #1E3A5F; margin-top: 30px;">Categorias Disponíveis:</h3>
            <ul style="color: #6B7684; font-size: 14px;">
                <li><strong>Hardware:</strong> Problemas com equipamentos físicos</li>
                <li><strong>Software:</strong> Instalação, configuração ou erros em programas</li>
                <li><strong>Rede:</strong> Conexão de internet ou rede local</li>
                <li><strong>Email:</strong> Problemas com contas de email</li>
                <li><strong>Sistema:</strong> Acessos, permissões e sistemas internos</li>
                <li><strong>Novo Colaborador:</strong> Equipamentos para novos membros da equipe</li>
            </ul>

            <p style="margin-top: 30px;">Se tiver alguma dúvida ou precisar de ajuda, não hesite em entrar em contato com a equipe de TI!</p>

            <div class="footer">
                © 2024 MyCompany - Todos os direitos reservados<br>
                Este é um email automático, por favor não responda.
            </div>
        </div>
    </body>
    </html>
    """

    try:
        send_email_graph(
            to_email=email,
            subject="Bem-vindo(a) ao MyCompany Support TI!",
            html_body=html_body
        )
        return True
    except Exception as e:
        print(f"Erro ao enviar email de boas-vindas: {e}")
        return False
