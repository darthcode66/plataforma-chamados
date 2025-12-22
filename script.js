// Chamados TI MyCompany - Frontend JavaScript
// API Configuration
const API_URL = 'http://localhost:8000/api';

// ============================================================================
// PASSWORD VISIBILITY TOGGLE
// ============================================================================

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const eyeIcon = document.getElementById('eyeIcon');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        // Ícone de olho cortado (senha visível)
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="3" y1="3" x2="21" y2="21"></line>
        `;
    } else {
        passwordInput.type = 'password';
        // Ícone de olho normal (senha oculta)
        eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

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

// State Management
let currentUser = null;
let authToken = null;
let allTickets = [];
let currentTicketId = null;
let ticketsRefreshInterval = null;
let websocket = null;

// ============================================================================
// AUTHENTICATION
// ============================================================================

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showMainSystem();
        loadTickets();
    }
});

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            throw new Error('Credenciais inválidas');
        }

        const data = await response.json();
        authToken = data.access_token;
        currentUser = data.usuario;

        // Save to localStorage
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Show main system
        showMainSystem();
        loadTickets();

    } catch (error) {
        showLoginError(error.message);
    }
});

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function showMainSystem() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainSystem').style.display = 'block';

    // Update user info
    const initials = getInitials(currentUser.nome);
    document.getElementById('userInitials').textContent = initials;
    document.getElementById('dropdownInitials').textContent = initials;
    document.getElementById('dropdownName').textContent = currentUser.nome;
    document.getElementById('dropdownEmail').textContent = currentUser.email;

    const roleSpan = document.getElementById('dropdownRole');
    roleSpan.textContent = currentUser.tipo === 'ti' ? 'Administrador TI' : 'Funcionário';
    roleSpan.className = `dropdown-role role-${currentUser.tipo}`;

    // Show/Hide "Criar Usuário" and "Importar Usuários" buttons for TI only
    const btnCriarUsuario = document.getElementById('btnCriarUsuario');
    const btnImportarUsuarios = document.getElementById('btnImportarUsuarios');
    if (currentUser.tipo === 'ti') {
        btnCriarUsuario.style.display = 'flex';
        btnImportarUsuarios.style.display = 'flex';
    } else {
        btnCriarUsuario.style.display = 'none';
        btnImportarUsuarios.style.display = 'none';
    }

    // Show/Hide TI Dashboard based on user type
    const dashboard = document.getElementById('tiDashboard');
    if (currentUser.tipo === 'ti') {
        dashboard.style.display = 'block';
        loadStatistics();
    } else {
        dashboard.style.display = 'none';
    }

    // Connect to WebSocket for real-time updates
    connectWebSocket();
}

function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');

    if (userMenu && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;

    // Disconnect WebSocket
    disconnectWebSocket();

    document.getElementById('mainSystem').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
}

// ============================================================================
// API REQUESTS
// ============================================================================

async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    });

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Sessão expirada. Faça login novamente.');
        }
        const error = await response.json();
        throw new Error(error.detail || 'Erro na requisição');
    }

    return response.json();
}

// ============================================================================
// TICKET MANAGEMENT
// ============================================================================

async function loadTickets() {
    try {
        const tickets = await apiRequest('/chamados');

        // Filter out canceled tickets for funcionario users
        if (currentUser.tipo === 'funcionario') {
            allTickets = tickets.filter(t => t.status !== 'cancelado');
        } else {
            allTickets = tickets;
        }

        renderKanban();
        renderList();
        if (currentUser.tipo === 'ti') {
            updateStatistics();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function refreshTickets() {
    try {
        const updatedTickets = await apiRequest('/chamados');

        // Filter out canceled tickets for funcionario users
        if (currentUser.tipo === 'funcionario') {
            allTickets = updatedTickets.filter(t => t.status !== 'cancelado');
        } else {
            allTickets = updatedTickets;
        }

        renderKanban();
        renderList();
        if (currentUser.tipo === 'ti') {
            updateStatistics();
        }
    } catch (error) {
        console.error('Erro ao atualizar chamados:', error);
    }
}

// ============================================================================
// WEBSOCKET REAL-TIME UPDATES
// ============================================================================

function connectWebSocket() {
    // Close existing connection if any
    if (websocket) {
        websocket.close();
    }

    // Connect to WebSocket
    websocket = new WebSocket('ws://localhost:8000/ws');

    websocket.onopen = () => {
        console.log('WebSocket conectado');
    };

    websocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        // Handle different message types
        if (data.type === 'ticket_updated' || data.type === 'ticket_created') {
            // Reload tickets to get latest data
            await refreshTickets();

            // If viewing the updated ticket, refresh the modal badges
            if (data.type === 'ticket_updated' && currentTicketId && data.ticket_id === currentTicketId) {
                await refreshTicketBadges();
            }
        } else if (data.type === 'comment_added') {
            // If viewing the ticket with new comment, refresh comments
            if (currentTicketId && data.ticket_id === currentTicketId) {
                await refreshComments();
            }
        } else if (data.type === 'ticket_viewed') {
            // Mark messages as read when OTHER user opens the ticket (not myself)
            if (data.ticket_id === currentTicketId && data.user_id !== currentUser.id) {
                ticketWasViewed = true;
                markMessagesAsRead();
            }
        }
    };

    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
        console.log('WebSocket desconectado, tentando reconectar em 3s...');
        // Try to reconnect after 3 seconds
        setTimeout(() => {
            if (currentUser) {
                connectWebSocket();
            }
        }, 3000);
    };
}

function disconnectWebSocket() {
    if (websocket) {
        websocket.close();
        websocket = null;
    }
}

async function loadStatistics() {
    if (currentUser.tipo !== 'ti') return;
    try {
        const stats = await apiRequest('/estatisticas');
        updateStatisticsDisplay(stats);
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function updateStatistics() {
    const stats = {
        total: allTickets.length,
        abertos: allTickets.filter(t => t.status === 'aberto').length,
        em_andamento: allTickets.filter(t => t.status === 'em_andamento').length,
        aguardando: allTickets.filter(t => t.status === 'aguardando').length,
        resolvidos: allTickets.filter(t => t.status === 'resolvido').length,
        cancelados: allTickets.filter(t => t.status === 'cancelado').length
    };

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statOpen').textContent = stats.abertos;
    document.getElementById('statProgress').textContent = stats.em_andamento;
    document.getElementById('statWaiting').textContent = stats.aguardando;
    document.getElementById('statResolved').textContent = stats.resolvidos;
    document.getElementById('statCanceled').textContent = stats.cancelados;
}

function updateStatisticsDisplay(stats) {
    document.getElementById('statTotal').textContent = stats.total_chamados;
    document.getElementById('statOpen').textContent = stats.abertos;
    document.getElementById('statProgress').textContent = stats.em_andamento;
    document.getElementById('statWaiting').textContent = stats.aguardando;
    document.getElementById('statResolved').textContent = stats.resolvidos;
}

function renderKanban() {
    const statuses = ['aberto', 'em_andamento', 'aguardando', 'resolvido'];

    statuses.forEach(status => {
        const tickets = allTickets.filter(t => t.status === status);
        const container = document.getElementById(`cards-${status}`);
        const countElement = document.getElementById(`count-${status}`);

        countElement.textContent = tickets.length;
        container.innerHTML = '';

        tickets.forEach(ticket => {
            const card = createKanbanCard(ticket);
            container.appendChild(card);
        });
    });

    // Setup drop zones for TI users (after rendering all cards)
    if (currentUser && currentUser.tipo === 'ti') {
        setupDropZones();
    }
}

// Keep track if drop zones are already setup
let dropZonesSetup = false;

function setupDropZones() {
    if (dropZonesSetup) return; // Only setup once

    dropZonesSetup = true;

    // Add listeners to all columns
    document.querySelectorAll('.column-cards').forEach(col => {
        col.addEventListener('dragover', handleDragOver);
        col.addEventListener('drop', handleDrop);
        col.addEventListener('dragenter', handleDragEnter);
        col.addEventListener('dragleave', handleDragLeave);
    });
}

function createKanbanCard(ticket) {
    const card = document.createElement('div');
    card.className = `kanban-card priority-${ticket.prioridade}`;
    card.dataset.ticketId = ticket.id;
    card.dataset.ticketStatus = ticket.status;

    const categoryNames = {
        'hardware': 'Hardware',
        'software': 'Software',
        'rede': 'Rede',
        'email': 'Email',
        'sistema': 'Sistema',
        'outro': 'Outro'
    };

    const priorityNames = {
        'urgente': 'Urgente',
        'alta': 'Alta',
        'media': 'Média',
        'baixa': 'Baixa'
    };

    card.innerHTML = `
        <div class="card-header">
            <span class="card-id">#${ticket.id}</span>
            <span class="card-priority ${ticket.prioridade}">${priorityNames[ticket.prioridade]}</span>
        </div>
        <div class="card-title">${ticket.titulo}</div>
        <div class="card-meta">
            <span class="card-category">${categoryNames[ticket.categoria]}</span>
            <span class="card-date">${formatDate(ticket.criado_em)}</span>
        </div>
        <div class="card-footer">
            <span class="card-user">${ticket.usuario.nome}</span>
        </div>
    `;

    // Enable drag-and-drop only for TI users (AFTER setting innerHTML)
    if (currentUser.tipo === 'ti') {
        card.draggable = true;
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    }

    // Use click event to avoid interfering with drag
    card.addEventListener('click', (e) => {
        // Only open detail if not dragging
        if (!card.classList.contains('dragging')) {
            openTicketDetail(ticket.id);
        }
    });

    return card;
}

function renderList() {
    const container = document.getElementById('ticketsList');
    container.innerHTML = '';

    const filteredTickets = applyFilters();

    filteredTickets.forEach(ticket => {
        const item = createListItem(ticket);
        container.appendChild(item);
    });
}

function createListItem(ticket) {
    const item = document.createElement('div');
    item.className = 'ticket-item';
    item.onclick = () => openTicketDetail(ticket.id);

    const descricao = ticket.descricao ? ticket.descricao.substring(0, 100) + '...' : 'Sem descrição';

    item.innerHTML = `
        <h3>#${ticket.id} - ${ticket.titulo}</h3>
        <p>${descricao}</p>
        <div class="detail-badges">
            <span class="badge badge-status ${ticket.status}">${ticket.status.replace('_', ' ')}</span>
            <span class="badge badge-prioridade ${ticket.prioridade}">${ticket.prioridade}</span>
            <span class="badge badge-categoria">${ticket.categoria}</span>
        </div>
        <p><strong>Solicitante:</strong> ${ticket.usuario.nome} | <strong>Criado em:</strong> ${formatDateTime(ticket.criado_em)}</p>
    `;

    return item;
}

function applyFilters() {
    let filtered = [...allTickets];

    const statusFilter = document.getElementById('filterStatus').value;
    const categoriaFilter = document.getElementById('filterCategoria').value;
    const prioridadeFilter = document.getElementById('filterPrioridade').value;

    if (statusFilter) {
        filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (categoriaFilter) {
        filtered = filtered.filter(t => t.categoria === categoriaFilter);
    }
    if (prioridadeFilter) {
        filtered = filtered.filter(t => t.prioridade === prioridadeFilter);
    }

    return filtered;
}

// ============================================================================
// DRAG AND DROP
// ============================================================================

let draggedCard = null;

function handleDragStart(e) {
    // Get the card element (in case we clicked on a child)
    draggedCard = e.target.closest('.kanban-card');
    if (!draggedCard) return;

    draggedCard.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedCard.dataset.ticketId);
}

function handleDragEnd(e) {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }

    // Remove all drag-over classes
    document.querySelectorAll('.column-cards').forEach(col => {
        col.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    const dropZone = e.target.closest('.column-cards');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    // Only remove if we're actually leaving the drop zone
    if (e.target.classList.contains('column-cards') && !e.target.contains(e.relatedTarget)) {
        e.target.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    // Find the drop zone (column-cards)
    let dropZone = e.target;
    if (!dropZone.classList.contains('column-cards')) {
        dropZone = e.target.closest('.column-cards');
    }

    if (!dropZone || !draggedCard) {
        return;
    }

    const newStatus = dropZone.id.replace('cards-', '');
    const ticketId = parseInt(draggedCard.dataset.ticketId);
    const oldStatus = draggedCard.dataset.ticketStatus;

    // Don't update if dropped in same column
    if (newStatus === oldStatus) {
        dropZone.classList.remove('drag-over');
        return;
    }

    // Remove drag-over class immediately
    document.querySelectorAll('.column-cards').forEach(col => {
        col.classList.remove('drag-over');
    });

    // Store reference to the card before animation
    const cardToMove = draggedCard;
    const oldColumn = document.getElementById(`cards-${oldStatus}`);
    const oldCountElement = document.getElementById(`count-${oldStatus}`);
    const newCountElement = document.getElementById(`count-${newStatus}`);

    // Update UI optimistically with animation
    cardToMove.style.opacity = '0';
    cardToMove.style.transform = 'scale(0.8)';

    setTimeout(() => {
        // Update ticket status in local data
        const ticket = allTickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = newStatus;
        }

        // Update counts
        const oldCount = allTickets.filter(t => t.status === oldStatus).length;
        const newCount = allTickets.filter(t => t.status === newStatus).length;
        oldCountElement.textContent = oldCount;
        newCountElement.textContent = newCount;

        // Move card to new column with animation
        cardToMove.dataset.ticketStatus = newStatus;
        dropZone.appendChild(cardToMove);

        // Animate in
        requestAnimationFrame(() => {
            cardToMove.style.opacity = '1';
            cardToMove.style.transform = 'scale(1)';
        });

        // Update statistics if TI user
        if (currentUser.tipo === 'ti') {
            updateStatistics();
        }
    }, 200);

    // Update backend asynchronously
    apiRequest(`/chamados/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
    }).catch(error => {
        // If error, reload to revert
        showToast(error.message, 'error');
        loadTickets();
    });

    draggedCard = null;
}

// ============================================================================
// VIEW TOGGLE
// ============================================================================

document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;

        // Update buttons
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Toggle views
        if (view === 'kanban') {
            document.getElementById('kanbanView').style.display = 'block';
            document.getElementById('listView').style.display = 'none';
        } else {
            document.getElementById('kanbanView').style.display = 'none';
            document.getElementById('listView').style.display = 'block';
            renderList();
        }
    });
});

// Filter event listeners
document.getElementById('filterStatus').addEventListener('change', renderList);
document.getElementById('filterCategoria').addEventListener('change', renderList);
document.getElementById('filterPrioridade').addEventListener('change', renderList);

// ============================================================================
// NEW TICKET MODAL
// ============================================================================

function openNewTicketModal() {
    document.getElementById('newTicketModal').classList.add('show');
    document.getElementById('newTicketForm').reset();
}

function closeNewTicketModal() {
    document.getElementById('newTicketModal').classList.remove('show');
}

function toggleNovoColaboradorFields() {
    const categoria = document.getElementById('categoria').value;
    const fieldsDiv = document.getElementById('novoColaboradorFields');

    if (categoria === 'novo_colaborador') {
        fieldsDiv.style.display = 'block';
        // Tornar campos obrigatórios
        document.getElementById('colaboradorNome').required = true;
        document.getElementById('colaboradorDataNascimento').required = true;
        document.getElementById('colaboradorDataInicio').required = true;
    } else {
        fieldsDiv.style.display = 'none';
        // Remover obrigatoriedade
        document.getElementById('colaboradorNome').required = false;
        document.getElementById('colaboradorDataNascimento').required = false;
        document.getElementById('colaboradorDataInicio').required = false;
    }
}

document.getElementById('newTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const categoria = document.getElementById('categoria').value;
    const data = {
        titulo: document.getElementById('titulo').value,
        descricao: document.getElementById('descricao').value,
        categoria: categoria
    };

    // Se for novo colaborador, coletar dados extras
    if (categoria === 'novo_colaborador') {
        data.dados_extras = {
            colaborador_nome: document.getElementById('colaboradorNome').value,
            colaborador_data_nascimento: document.getElementById('colaboradorDataNascimento').value,
            data_inicio: document.getElementById('colaboradorDataInicio').value,
            equipamentos: {
                celular: document.getElementById('equipCelular').checked,
                notebook: document.getElementById('equipNotebook').checked,
                email: document.getElementById('equipEmail').checked,
                debx: document.getElementById('equipDebx').checked
            },
            aplicativos: {
                whatsapp: document.getElementById('appWhatsapp').checked,
                chrome: document.getElementById('appChrome').checked
            },
            sharepoint_pastas: document.getElementById('sharepointPastas').value
        };
    }

    try {
        await apiRequest('/chamados', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        closeNewTicketModal();
        loadTickets();
        showToast('Chamado criado com sucesso!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
});

// ============================================================================
// TICKET DETAIL MODAL
// ============================================================================

let commentRefreshInterval = null;
let timestampRefreshInterval = null;
let ticketWasViewed = false; // Track if ticket was viewed by other user

async function refreshTicketBadges() {
    if (!currentTicketId) return;

    try {
        const ticket = await apiRequest(`/chamados/${currentTicketId}`);

        // Update badges
        const statusBadge = document.getElementById('detailStatus');
        statusBadge.textContent = ticket.status.replace('_', ' ').toUpperCase();
        statusBadge.className = `badge badge-status ${ticket.status}`;

        const prioridadeBadge = document.getElementById('detailPrioridade');
        prioridadeBadge.textContent = ticket.prioridade.toUpperCase();
        prioridadeBadge.className = `badge badge-prioridade ${ticket.prioridade}`;

        // Update atribuição info
        const atribuidoP = document.getElementById('detailAtribuido');
        if (ticket.atribuido) {
            atribuidoP.innerHTML = `<strong>Atribuído para:</strong> ${ticket.atribuido.nome}`;
            atribuidoP.style.display = 'block';
        } else {
            atribuidoP.style.display = 'none';
        }

        // Update selects if TI user
        if (currentUser.tipo === 'ti') {
            document.getElementById('editStatus').value = ticket.status;
            document.getElementById('editPrioridade').value = ticket.prioridade;
            document.getElementById('editAtribuido').value = ticket.atribuido_para || '';
        }
    } catch (error) {
        console.error('Erro ao atualizar badges do ticket:', error);
    }
}

async function refreshComments() {
    if (!currentTicketId) return;

    try {
        const ticket = await apiRequest(`/chamados/${currentTicketId}`);
        renderComments(ticket.comentarios);
    } catch (error) {
        console.error('Erro ao atualizar comentários:', error);
    }
}

// Update timestamps every 30 seconds
function updateTimestamps() {
    const timeElements = document.querySelectorAll('.message-time');
    timeElements.forEach(el => {
        const timestamp = el.dataset.timestamp;
        if (timestamp) {
            el.textContent = formatTime(timestamp);
        }
    });
}

async function openTicketDetail(ticketId) {
    try {
        const ticket = await apiRequest(`/chamados/${ticketId}`);
        currentTicketId = ticketId;
        ticketWasViewed = false; // Reset for new ticket

        // Populate modal
        document.getElementById('detailId').textContent = ticket.id;
        document.getElementById('detailTitulo').textContent = ticket.titulo;
        document.getElementById('detailDescricao').textContent = ticket.descricao;

        // Badges
        const statusBadge = document.getElementById('detailStatus');
        statusBadge.textContent = ticket.status.replace('_', ' ').toUpperCase();
        statusBadge.className = `badge badge-status ${ticket.status}`;

        const prioridadeBadge = document.getElementById('detailPrioridade');
        prioridadeBadge.textContent = ticket.prioridade.toUpperCase();
        prioridadeBadge.className = `badge badge-prioridade ${ticket.prioridade}`;

        const categoriaBadge = document.getElementById('detailCategoria');
        categoriaBadge.textContent = ticket.categoria.toUpperCase();

        // Meta info
        document.getElementById('detailUsuario').textContent = ticket.usuario.nome;
        document.getElementById('detailCriadoEm').textContent = formatDateTime(ticket.criado_em);
        document.getElementById('detailAtualizadoEm').textContent = formatDateTime(ticket.atualizado_em);

        const atribuidoP = document.getElementById('detailAtribuido');
        if (ticket.atribuido) {
            atribuidoP.innerHTML = `<strong>Atribuído para:</strong> ${ticket.atribuido.nome}`;
            atribuidoP.style.display = 'block';
        } else {
            atribuidoP.style.display = 'none';
        }

        // Dados Extras (Novo Colaborador)
        const dadosExtrasDiv = document.getElementById('detailDadosExtras');
        if (dadosExtrasDiv) dadosExtrasDiv.remove(); // Remove se já existir

        if (ticket.dados_extras && ticket.categoria === 'novo_colaborador') {
            const extras = ticket.dados_extras;
            const extrasHTML = `
                <div id="detailDadosExtras" style="margin-top: 1.5rem; padding: 1.5rem; background: var(--gray-50); border-radius: 10px;">
                    <h4 style="margin-bottom: 1rem; color: var(--gray-700); font-size: 0.95rem;">Dados do Novo Colaborador</h4>
                    <p><strong>Nome:</strong> ${extras.colaborador_nome || '-'}</p>
                    <p><strong>Data de Nascimento:</strong> ${extras.colaborador_data_nascimento ? new Date(extras.colaborador_data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                    <p><strong>Data de Início:</strong> ${extras.data_inicio ? new Date(extras.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>

                    <h5 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--gray-700); font-size: 0.85rem;">Equipamentos:</h5>
                    <ul style="margin: 0; padding-left: 1.5rem;">
                        ${extras.equipamentos?.celular ? '<li>Celular novo</li>' : ''}
                        ${extras.equipamentos?.notebook ? '<li>Notebook novo</li>' : ''}
                        ${extras.equipamentos?.email ? '<li>Email corporativo</li>' : ''}
                        ${extras.equipamentos?.debx ? '<li>Acesso DEBX</li>' : ''}
                        ${!extras.equipamentos || (!extras.equipamentos.celular && !extras.equipamentos.notebook && !extras.equipamentos.email && !extras.equipamentos.debx) ? '<li style="color: var(--gray-500);">Nenhum equipamento solicitado</li>' : ''}
                    </ul>

                    <h5 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--gray-700); font-size: 0.85rem;">Aplicativos:</h5>
                    <ul style="margin: 0; padding-left: 1.5rem;">
                        ${extras.aplicativos?.whatsapp ? '<li>WhatsApp (no celular)</li>' : ''}
                        ${extras.aplicativos?.chrome ? '<li>Google Chrome (no computador)</li>' : ''}
                        ${!extras.aplicativos || (!extras.aplicativos.whatsapp && !extras.aplicativos.chrome) ? '<li style="color: var(--gray-500);">Nenhum aplicativo solicitado</li>' : ''}
                    </ul>

                    ${extras.sharepoint_pastas ? `<p style="margin-top: 1rem;"><strong>Pastas SharePoint:</strong><br>${extras.sharepoint_pastas}</p>` : ''}
                </div>
            `;
            document.querySelector('.detail-meta').insertAdjacentHTML('afterend', extrasHTML);
        }

        // TI Actions
        const tiActions = document.getElementById('tiActions');
        const funcionarioActions = document.getElementById('funcionarioActions');

        if (currentUser.tipo === 'ti') {
            tiActions.style.display = 'block';
            funcionarioActions.style.display = 'none';
            document.getElementById('editStatus').value = ticket.status;
            document.getElementById('editPrioridade').value = ticket.prioridade;

            // Load TI users for assignment
            await loadTIUsers();
            document.getElementById('editAtribuido').value = ticket.atribuido_para || '';
        } else {
            tiActions.style.display = 'none';
            // Show cancel button only if ticket is not already closed/cancelled
            if (ticket.status !== 'resolvido' && ticket.status !== 'fechado' && ticket.status !== 'cancelado') {
                funcionarioActions.style.display = 'block';
            } else {
                funcionarioActions.style.display = 'none';
            }
        }

        // Load comments
        renderComments(ticket.comentarios);

        // Show modal
        document.getElementById('ticketDetailModal').classList.add('show');

        // Start auto-refresh for comments (every 5 seconds)
        if (commentRefreshInterval) {
            clearInterval(commentRefreshInterval);
        }
        commentRefreshInterval = setInterval(refreshComments, 5000);

        // Start auto-refresh for timestamps (every 30 seconds)
        if (timestampRefreshInterval) {
            clearInterval(timestampRefreshInterval);
        }
        timestampRefreshInterval = setInterval(updateTimestamps, 30000);

        // Notify via WebSocket that ticket was viewed
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
                type: 'view_ticket',
                ticket_id: ticketId,
                user_id: currentUser.id
            }));
        }

    } catch (error) {
        showToast('Erro ao carregar detalhes do chamado: ' + error.message, 'error');
    }
}

function closeDetailModal() {
    document.getElementById('ticketDetailModal').classList.remove('show');
    currentTicketId = null;
    ticketWasViewed = false; // Reset viewed status

    // Stop auto-refresh
    if (commentRefreshInterval) {
        clearInterval(commentRefreshInterval);
        commentRefreshInterval = null;
    }

    // Stop timestamp refresh
    if (timestampRefreshInterval) {
        clearInterval(timestampRefreshInterval);
        timestampRefreshInterval = null;
    }

    // Clear rendered comments tracking
    renderedCommentIds.clear();
}

async function loadTIUsers() {
    try {
        const users = await apiRequest('/usuarios/ti');
        const select = document.getElementById('editAtribuido');
        select.innerHTML = '<option value="">Não atribuído</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nome;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários TI:', error);
    }
}

async function updateTicket() {
    // Show loading toast immediately
    showToast('Salvando alterações...', 'info');

    try {
        // Get current ticket data to compare changes
        const currentTicket = await apiRequest(`/chamados/${currentTicketId}`);

        const newData = {
            status: document.getElementById('editStatus').value,
            prioridade: document.getElementById('editPrioridade').value,
            atribuido_para: document.getElementById('editAtribuido').value || null
        };

        // Detect changes
        const changes = [];

        const statusLabels = {
            'aberto': 'Aberto',
            'em_andamento': 'Em Andamento',
            'aguardando': 'Aguardando',
            'resolvido': 'Resolvido',
            'fechado': 'Fechado',
            'cancelado': 'Cancelado'
        };

        const prioridadeLabels = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };

        if (newData.status !== currentTicket.status) {
            changes.push(`Status alterado: ${statusLabels[currentTicket.status]} → ${statusLabels[newData.status]}`);
        }

        if (newData.prioridade !== currentTicket.prioridade) {
            changes.push(`Prioridade alterada: ${prioridadeLabels[currentTicket.prioridade]} → ${prioridadeLabels[newData.prioridade]}`);
        }

        const oldAtribuido = currentTicket.atribuido_para || null;
        const newAtribuido = newData.atribuido_para ? parseInt(newData.atribuido_para) : null;

        if (oldAtribuido !== newAtribuido) {
            if (newAtribuido) {
                const select = document.getElementById('editAtribuido');
                const selectedOption = select.options[select.selectedIndex];
                const nomeAtribuido = selectedOption.text;

                if (oldAtribuido) {
                    changes.push(`Atribuição alterada para: ${nomeAtribuido}`);
                } else {
                    changes.push(`Chamado atribuído para: ${nomeAtribuido}`);
                }
            } else {
                changes.push('Atribuição removida');
            }
        }

        // Update ticket
        await apiRequest(`/chamados/${currentTicketId}`, {
            method: 'PUT',
            body: JSON.stringify(newData)
        });

        // Update badges in modal
        const statusBadge = document.getElementById('detailStatus');
        statusBadge.textContent = newData.status.replace('_', ' ').toUpperCase();
        statusBadge.className = `badge badge-status ${newData.status}`;

        const prioridadeBadge = document.getElementById('detailPrioridade');
        prioridadeBadge.textContent = newData.prioridade.toUpperCase();
        prioridadeBadge.className = `badge badge-prioridade ${newData.prioridade}`;

        // If there were changes, post a system message to the chat
        if (changes.length > 0) {
            const systemMessage = changes.join('\n');

            try {
                await apiRequest(`/chamados/${currentTicketId}/comentarios`, {
                    method: 'POST',
                    body: JSON.stringify({ comentario: `[SYSTEM]${systemMessage}` })
                });

                // Refresh comments to show the system message
                await refreshComments();
            } catch (commentError) {
                console.error('Erro ao adicionar comentário de sistema:', commentError);
            }
        }

        showToast('Chamado atualizado com sucesso!', 'success');
        loadTickets();
    } catch (error) {
        showToast('Erro ao atualizar chamado: ' + error.message, 'error');
    }
}

// ============================================================================
// COMMENTS
// ============================================================================

// Track rendered comments to avoid re-animating
let renderedCommentIds = new Set();

function markMessagesAsRead() {
    // Mark all own messages as read (blue double check)
    const ownMessages = document.querySelectorAll('.chat-message-own .message-status');
    ownMessages.forEach(statusSpan => {
        statusSpan.innerHTML = `
            <svg class="status-icon status-read" width="16" height="16" viewBox="0 0 16 16">
                <path d="M1 8.5l3.5 3.5 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 8.5l3.5 3.5 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
    });
}

function renderComments(comments) {
    const container = document.getElementById('commentsList');
    const countSpan = document.getElementById('chatCount');

    countSpan.textContent = comments.length;

    if (comments.length === 0) {
        container.innerHTML = '<div class="chat-empty">Nenhum comentário ainda</div>';
        renderedCommentIds.clear();
        return;
    }

    // Get current comment IDs
    const currentCommentIds = new Set(comments.map(c => c.id));

    // Remove comments that no longer exist
    const existingMessages = container.querySelectorAll('.chat-message');
    existingMessages.forEach(msg => {
        const commentId = parseInt(msg.dataset.commentId);
        if (!currentCommentIds.has(commentId)) {
            msg.remove();
            renderedCommentIds.delete(commentId);
        }
    });

    // Add only new comments
    comments.forEach((comment) => {
        if (!renderedCommentIds.has(comment.id)) {
            // Check if it's a system message
            const isSystemMessage = comment.comentario.startsWith('[SYSTEM]');

            if (isSystemMessage) {
                // Render system message (centered)
                const systemText = comment.comentario.replace('[SYSTEM]', '').trim();
                const message = document.createElement('div');
                message.className = 'chat-message chat-message-system';
                message.dataset.commentId = comment.id;

                message.innerHTML = `
                    <div class="system-message-content">
                        <div class="system-message-text">${escapeHtml(systemText)}</div>
                        <span class="message-time system-time" data-timestamp="${comment.criado_em}">${formatTime(comment.criado_em)}</span>
                    </div>
                `;
                container.appendChild(message);
                renderedCommentIds.add(comment.id);
            } else {
                // Regular message
                const isCurrentUser = comment.usuario.id === currentUser.id;
                const message = document.createElement('div');
                message.className = `chat-message ${isCurrentUser ? 'chat-message-own' : 'chat-message-other'}`;
                message.dataset.commentId = comment.id;

                const initials = getInitials(comment.usuario.nome);

                // Add status icons only for own messages (always start as delivered, not read)
                const statusIcon = isCurrentUser ? `
                    <span class="message-status">
                        <svg class="status-icon status-delivered" width="16" height="16" viewBox="0 0 16 16">
                            <path d="M1 8.5l3.5 3.5 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5 8.5l3.5 3.5 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                ` : '';

                message.innerHTML = `
                    <div class="message-avatar">${initials}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-author">${comment.usuario.nome}</span>
                            <span class="message-time" data-timestamp="${comment.criado_em}">${formatTime(comment.criado_em)}</span>
                        </div>
                        <div class="message-text">
                            ${escapeHtml(comment.comentario)}
                            ${statusIcon}
                        </div>
                    </div>
                `;
                container.appendChild(message);
                renderedCommentIds.add(comment.id);
            }

            // Scroll to bottom only when new message is added
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    });

    // If ticket was already viewed, mark messages as read
    if (ticketWasViewed) {
        markMessagesAsRead();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Menos de 1 minuto
    if (diff < 60000) {
        return 'Agora';
    }

    // Menos de 1 hora
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}min`;
    }

    // Menos de 24 horas (hoje)
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h`;
    }

    // Mais de 1 dia - mostrar data e hora completa
    const isSameYear = date.getFullYear() === now.getFullYear();

    if (isSameYear) {
        // Mesmo ano: mostrar DD/MM HH:MM
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        // Ano diferente: mostrar DD/MM/YYYY HH:MM
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const text = document.getElementById('commentText').value.trim();
    if (!text) return;

    const submitBtn = e.target.querySelector('.chat-send');
    const textarea = document.getElementById('commentText');

    // Clear textarea immediately
    textarea.value = '';
    textarea.style.height = 'auto';

    // Create optimistic comment
    const optimisticComment = {
        id: Date.now(), // Temporary ID
        comentario: text,
        criado_em: new Date().toISOString(),
        usuario: {
            id: currentUser.id,
            nome: currentUser.nome
        }
    };

    // Add to rendered comments immediately
    const container = document.getElementById('commentsList');
    const isCurrentUser = true;
    const message = document.createElement('div');
    message.className = 'chat-message chat-message-own optimistic';
    message.dataset.commentId = optimisticComment.id;

    const initials = getInitials(currentUser.nome);

    message.innerHTML = `
        <div class="message-avatar">${initials}</div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-author">${currentUser.nome}</span>
                <span class="message-time">Agora</span>
            </div>
            <div class="message-text">
                ${escapeHtml(text)}
                <span class="message-status">
                    <svg class="status-icon status-sending" width="16" height="16" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="44" stroke-dashoffset="0">
                            <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                </span>
            </div>
        </div>
    `;
    container.appendChild(message);
    renderedCommentIds.add(optimisticComment.id);

    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 10);

    // Update count
    const countSpan = document.getElementById('chatCount');
    countSpan.textContent = parseInt(countSpan.textContent) + 1;

    // Send to server in background
    submitBtn.disabled = true;

    try {
        await apiRequest(`/chamados/${currentTicketId}/comentarios`, {
            method: 'POST',
            body: JSON.stringify({ comentario: text })
        });

        // Update status to sent (single check)
        const statusSpan = message.querySelector('.message-status');
        statusSpan.innerHTML = `
            <svg class="status-icon status-sent" width="16" height="16" viewBox="0 0 16 16">
                <path d="M2 8.5l3.5 3.5 8-8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        message.classList.remove('optimistic');

        submitBtn.disabled = false;
    } catch (error) {
        // Remove optimistic message on error
        message.remove();
        renderedCommentIds.delete(optimisticComment.id);
        countSpan.textContent = parseInt(countSpan.textContent) - 1;

        submitBtn.disabled = false;
        showToast('Erro ao adicionar comentário: ' + error.message, 'error');
    }
});

// Auto-resize textarea
document.getElementById('commentText').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================================================
// DELETE AND CANCEL TICKET
// ============================================================================

function confirmDeleteTicket() {
    document.getElementById('deleteConfirmModal').classList.add('show');
}

function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').classList.remove('show');
}

async function deleteTicket() {
    showToast('Deletando chamado...', 'info');

    try {
        await apiRequest(`/chamados/${currentTicketId}`, {
            method: 'DELETE'
        });

        closeDeleteConfirmModal();
        closeDetailModal();
        loadTickets();
        showToast('Chamado deletado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao deletar chamado: ' + error.message, 'error');
    }
}

function openCancelModal() {
    document.getElementById('cancelTicketModal').classList.add('show');
    document.getElementById('cancelJustificativa').value = '';
}

function closeCancelModal() {
    document.getElementById('cancelTicketModal').classList.remove('show');
}

document.getElementById('cancelTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const justificativa = document.getElementById('cancelJustificativa').value.trim();
    if (!justificativa) {
        showToast('Por favor, informe a justificativa do cancelamento', 'warning');
        return;
    }

    showToast('Cancelando chamado...', 'info');

    try {
        // Update status to cancelado and add justification comment
        await apiRequest(`/chamados/${currentTicketId}`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'cancelado'
            })
        });

        // Add system comment with cancellation reason
        await apiRequest(`/chamados/${currentTicketId}/comentarios`, {
            method: 'POST',
            body: JSON.stringify({
                comentario: `[SYSTEM]Chamado cancelado pelo usuário\nMotivo: ${justificativa}`
            })
        });

        closeCancelModal();
        closeDetailModal();
        loadTickets();
        showToast('Chamado cancelado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao cancelar chamado: ' + error.message, 'error');
    }
});

// ============================================================================
// SHOW TICKETS BY STATUS
// ============================================================================

function showTicketsByStatus(status) {
    // Switch to list view
    document.getElementById('kanbanView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';

    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.toggle-btn[data-view="list"]').classList.add('active');

    // Set filter to show tickets by status
    document.getElementById('filterStatus').value = status;
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterPrioridade').value = '';

    // Render list with filter
    renderList();
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}

// ============================================================================
// CREATE USER MODAL
// ============================================================================

function openCreateUserModal() {
    document.getElementById('createUserModal').classList.add('show');
    document.getElementById('createUserForm').reset();
}

function closeCreateUserModal() {
    document.getElementById('createUserModal').classList.remove('show');
}

// Handle create user form submission
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('newUserNome').value;
    const email = document.getElementById('newUserEmail').value;
    const senha = document.getElementById('newUserSenha').value;
    const tipo = document.getElementById('newUserTipo').value;

    try {
        await apiRequest('/usuarios', {
            method: 'POST',
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha,
                tipo: tipo
            })
        });

        closeCreateUserModal();
        showToast('Usuário criado com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao criar usuário: ' + error.message, 'error');
    }
});

// ============================================================================
// IMPORT USERS MODAL
// ============================================================================

function openImportUsersModal() {
    document.getElementById('importUsersModal').classList.add('show');
    document.getElementById('importUsersForm').reset();
}

function closeImportUsersModal() {
    document.getElementById('importUsersModal').classList.remove('show');
    // Limpar arquivo CSV ao fechar
    document.getElementById('csvFile').value = '';
}

// Handle CSV file upload
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);

            // Skip header line (first line)
            const dataLines = lines.slice(1);

            // Convert CSV to text format
            const textData = dataLines.map(line => {
                // Handle CSV with quotes
                const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const nome = values[0]?.replace(/^"|"$/g, '').trim() || '';
                const email = values[1]?.replace(/^"|"$/g, '').trim() || '';

                if (nome && email) {
                    return `${nome}, ${email}`;
                }
                return '';
            }).filter(line => line).join('\n');

            // Set the textarea value
            document.getElementById('usersList').value = textData;
            showToast(`Arquivo CSV carregado: ${dataLines.length} usuários encontrados`, 'success');
        } catch (error) {
            showToast('Erro ao processar arquivo CSV: ' + error.message, 'error');
        }
    };

    reader.onerror = function() {
        showToast('Erro ao ler arquivo CSV', 'error');
    };

    reader.readAsText(file);
}

// Handle import users form submission
document.getElementById('importUsersForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const usersList = document.getElementById('usersList').value.trim();
    const tipo = document.getElementById('importUserTipo').value;

    // Validate that there is data
    if (!usersList) {
        showToast('Por favor, importe um arquivo CSV ou cole a lista de usuários manualmente!', 'error');
        return;
    }

    // Parse the users list
    const lines = usersList.split('\n');
    const usuarios = [];

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const parts = line.split(',').map(p => p.trim());
        if (parts.length !== 2) {
            showToast('Formato inválido na linha: ' + line, 'error');
            return;
        }

        usuarios.push({
            nome: parts[0],
            email: parts[1],
            tipo: tipo
        });
    }

    if (usuarios.length === 0) {
        showToast('Nenhum usuário válido encontrado!', 'error');
        return;
    }

    try {
        const result = await apiRequest('/usuarios/import', {
            method: 'POST',
            body: JSON.stringify({ usuarios: usuarios })
        });

        closeImportUsersModal();
        showToast(`${result.criados} usuários importados com sucesso! ${result.erros} erros.`, 'success');
    } catch (error) {
        showToast('Erro ao importar usuários: ' + error.message, 'error');
    }
});
