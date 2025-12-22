#!/usr/bin/env python3
"""
Script para testar o envio de emails via Microsoft Graph API
"""

from email_graph import send_verification_email, send_email_graph
import sys

def test_send_verification():
    """Testa envio de email com código de verificação"""
    print("=== Teste de Envio de Email - Microsoft Graph API ===\n")

    email = input("Digite o email de destino (ex: seu@email.com): ").strip()
    nome = input("Digite o nome do destinatário: ").strip()

    if not email or not nome:
        print("❌ Email e nome são obrigatórios!")
        return

    print(f"\n📧 Enviando email de verificação para {email}...")

    try:
        code = send_verification_email(email, nome)
        print(f"\n✅ Email enviado com sucesso!")
        print(f"🔑 Código de verificação gerado: {code}")
        print(f"\nVerifique a caixa de entrada de {email}")
    except Exception as e:
        print(f"\n❌ Erro ao enviar email: {e}")
        import traceback
        traceback.print_exc()

def test_send_simple():
    """Testa envio de email simples"""
    print("=== Teste de Envio de Email Simples ===\n")

    email = input("Digite o email de destino: ").strip()

    if not email:
        print("❌ Email é obrigatório!")
        return

    subject = "Teste de Email - Microsoft Graph API"
    html_body = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1E3A5F;">Teste de Email</h2>
        <p>Este é um email de teste enviado via Microsoft Graph API.</p>
        <p>Se você recebeu este email, a configuração está funcionando corretamente! ✅</p>
        <hr>
        <p style="color: #666; font-size: 12px;">MyCompany - Chamados TI</p>
    </body>
    </html>
    """

    print(f"\n📧 Enviando email de teste para {email}...")

    try:
        send_email_graph(email, subject, html_body)
        print(f"\n✅ Email enviado com sucesso para {email}!")
    except Exception as e:
        print(f"\n❌ Erro ao enviar email: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Escolha o tipo de teste:")
    print("1 - Email com código de verificação")
    print("2 - Email simples de teste")

    choice = input("\nOpção (1 ou 2): ").strip()

    if choice == "1":
        test_send_verification()
    elif choice == "2":
        test_send_simple()
    else:
        print("❌ Opção inválida!")
