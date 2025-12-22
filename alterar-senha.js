// Alterar Senha - JavaScript
const API_URL = 'http://localhost:8000/api';

let currentStep = 1;
let userEmail = '';
let verificationCode = '';

// ============================================================================
// NAVEGAÇÃO ENTRE ETAPAS
// ============================================================================

function goToStep(step) {
    // Esconder todas as etapas
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });

    // Remover active de todos os indicadores
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active', 'completed');
    });

    // Mostrar etapa atual
    document.getElementById(`step${step}`).classList.add('active');
    document.getElementById(`stepIndicator${step}`).classList.add('active');

    // Marcar etapas anteriores como completadas
    for (let i = 1; i < step; i++) {
        document.getElementById(`stepIndicator${i}`).classList.add('completed');
    }

    currentStep = step;
    clearAlert();
}

// ============================================================================
// ALERTAS
// ============================================================================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = `alert-${type}`;

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
}

function clearAlert() {
    document.getElementById('alertContainer').innerHTML = '';
}

function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'i'
    };

    const titles = {
        success: title || 'Sucesso',
        error: title || 'Erro',
        warning: title || 'Atenção',
        info: title || 'Informação'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ============================================================================
// TOGGLE PASSWORD
// ============================================================================

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const svg = button.querySelector('svg');

    if (input.type === 'password') {
        input.type = 'text';
        svg.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="3" y1="3" x2="21" y2="21"></line>
        `;
    } else {
        input.type = 'password';
        svg.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// ============================================================================
// ETAPA 1: ENVIAR CÓDIGO
// ============================================================================

document.getElementById('sendCodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const btn = document.getElementById('sendCodeBtn');

    btn.disabled = true;
    btn.innerHTML = 'Enviando... <span class="loading"></span>';

    try {
        const response = await fetch(`${API_URL}/auth/send-verification-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Erro ao enviar código');
        }

        userEmail = email;
        showAlert('Código enviado para seu email! Verifique sua caixa de entrada.', 'success');

        setTimeout(() => {
            goToStep(2);
        }, 2000);

    } catch (error) {
        showAlert(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Enviar Código';
    }
});

// ============================================================================
// ETAPA 2: VERIFICAR CÓDIGO
// ============================================================================

document.getElementById('verifyCodeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = document.getElementById('code').value;
    const btn = document.getElementById('verifyCodeBtn');

    if (code.length !== 6 || !/^\d+$/.test(code)) {
        showAlert('O código deve ter 6 dígitos numéricos', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Verificando... <span class="loading"></span>';

    try {
        const response = await fetch(`${API_URL}/auth/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: userEmail,
                code: code
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Código inválido');
        }

        verificationCode = code;
        showAlert('Código verificado com sucesso!', 'success');

        setTimeout(() => {
            goToStep(3);
        }, 1500);

    } catch (error) {
        showAlert(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Verificar Código';
    }
});

// ============================================================================
// ETAPA 3: ALTERAR SENHA
// ============================================================================

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('changePasswordBtn');

    // Validações
    if (newPassword.length < 6) {
        showAlert('A senha deve ter no mínimo 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showAlert('As senhas não coincidem', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Alterando... <span class="loading"></span>';

    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: userEmail,
                code: verificationCode,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Erro ao alterar senha');
        }

        showToast('Senha alterada com sucesso! Redirecionando...', 'success');

        setTimeout(() => {
            window.location.href = '/';
        }, 2000);

    } catch (error) {
        showAlert(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Alterar Senha';
    }
});

// ============================================================================
// AUTO-FOCUS NO CÓDIGO
// ============================================================================

const codeInput = document.getElementById('code');
codeInput.addEventListener('input', (e) => {
    // Permitir apenas números
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
});
