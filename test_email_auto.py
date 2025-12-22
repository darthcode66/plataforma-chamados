#!/usr/bin/env python3
"""
Script automatizado para testar o envio de emails via Microsoft Graph API
"""

from email_graph import send_email_graph, get_access_token
import traceback

def test_token():
    """Testa apenas a obtenção do token"""
    print("=== Teste 1: Obtendo Access Token ===\n")
    try:
        token = get_access_token()
        print(f"✅ Token obtido com sucesso!")
        print(f"Token (primeiros 50 caracteres): {token[:50]}...")
        return True
    except Exception as e:
        print(f"❌ Erro ao obter token: {e}")
        traceback.print_exc()
        return False

def test_send():
    """Testa envio de email"""
    print("\n=== Teste 2: Enviando Email ===\n")

    # Email de teste - enviando para o próprio email configurado
    to_email = "pedro.marcandali@ramalhosbrasil.com.br"
    subject = "🧪 Teste - Microsoft Graph API"

    html_body = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .container {
                background: #ffffff;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                color: #1E3A5F;
                font-size: 24px;
                font-weight: 700;
            }
            .success-box {
                background: #D1FAE5;
                border-left: 4px solid #10B981;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">MyCompany - Chamados TI</div>
            </div>

            <h2>✅ Teste de Integração - Microsoft Graph API</h2>

            <div class="success-box">
                <strong>Sucesso!</strong><br>
                Se você está lendo este email, a integração com Microsoft Graph API está funcionando perfeitamente! 🎉
            </div>

            <p><strong>Detalhes do teste:</strong></p>
            <ul>
                <li>Serviço: Microsoft Graph API</li>
                <li>Método de autenticação: Client Credentials (Application)</li>
                <li>Permissão: Mail.Send (Application)</li>
                <li>Data: December 22, 2024</li>
            </ul>

            <p>O sistema de envio de emails para alteração de senha está pronto para uso! 🚀</p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7684; font-size: 12px; text-align: center;">
                MyCompany - Sistema de Chamados TI<br>
                Este é um email de teste automático
            </p>
        </div>
    </body>
    </html>
    """

    print(f"📧 Enviando email de teste para: {to_email}")
    print(f"📝 Assunto: {subject}\n")

    try:
        result = send_email_graph(to_email, subject, html_body)
        print(f"✅ Email enviado com sucesso!")
        print(f"\n🎉 Integração Microsoft Graph API funcionando!")
        print(f"\n📬 Verifique a caixa de entrada de {to_email}")
        return True
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TESTE AUTOMATIZADO - MICROSOFT GRAPH API")
    print("=" * 60 + "\n")

    # Teste 1: Token
    token_ok = test_token()

    if not token_ok:
        print("\n⚠️  Não é possível continuar sem token válido")
        exit(1)

    # Teste 2: Envio de email
    email_ok = test_send()

    print("\n" + "=" * 60)
    if token_ok and email_ok:
        print("✅ TODOS OS TESTES PASSARAM!")
    else:
        print("❌ ALGUNS TESTES FALHARAM")
    print("=" * 60)
