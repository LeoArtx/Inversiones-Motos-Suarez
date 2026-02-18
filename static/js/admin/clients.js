// static/js/admin/clients.js

let allClients = [];
let filteredClients = [];
let currentEditingClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEBUG] Inicializando página de clientes...');
    await loadClientsData();
    setupSearch();
    setupModal();
    console.log('[DEBUG] Componentes inicializados');
});

// ========================================
// CARGA DE DATOS
// ========================================

async function loadClientsData() {
    console.log('[DEBUG] Iniciando carga de datos de clientes...');
    try {
        const response = await fetch('/api/users');

        if (!response.ok) {
            console.error('[ERROR] Error en respuesta del servidor:', response.status, response.statusText);
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('[DEBUG] Datos recibidos del servidor:', data);

        // Validar que los datos sean un array
        if (!Array.isArray(data)) {
            console.error('[ERROR] Error al cargar JSON: los datos no son un array', typeof data);
            showErrorMessage('No se pudieron cargar los usuarios o el archivo de datos está vacío');
            allClients = [];
            filteredClients = [];
            displayClients();
            return;
        }

        if (data.length === 0) {
            console.warn('[WARNING] No hay usuarios en el archivo');
            showErrorMessage('No se pudieron cargar los usuarios o el archivo de datos está vacío');
        }

        // Filter to users with role containing "client", avoiding "admin"
        allClients = data.filter(user => {
            const role = user.role ? user.role.toLowerCase() : '';
            return (role.includes('client') || role.includes('cliente')) && role !== 'admin';
        });

        console.log(`[DEBUG] Clientes filtrados: ${allClients.length} de ${data.length} usuarios`);

        filteredClients = [...allClients];
        displayClients();

    } catch (error) {
        console.error('Error al cargar JSON:', error);
        showErrorMessage('No se pudieron cargar los usuarios o el archivo de datos está vacío');
        allClients = [];
        filteredClients = [];
        displayClients();
    }
}

// Mostrar mensaje de error en la tabla
function showErrorMessage(message) {
    const tableBody = document.getElementById('clients-table-body');
    const noDataMessage = document.getElementById('no-data-message');

    if (tableBody) {
        tableBody.innerHTML = '';
    }

    if (noDataMessage) {
        noDataMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <p><strong>${message}</strong></p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Por favor contacte al administrador del sistema</p>
        `;
        noDataMessage.style.display = 'block';
    }
}

// ========================================
// VISUALIZACIÓN DE CLIENTES
// ========================================

function displayClients() {
    const tableBody = document.getElementById('clients-table-body');
    const noDataMessage = document.getElementById('no-data-message');

    // Limpiar el cuerpo de la tabla antes de insertar nuevas filas
    tableBody.innerHTML = '';

    if (filteredClients.length === 0) {
        noDataMessage.style.display = 'block';
        return;
    }

    noDataMessage.style.display = 'none';

    filteredClients.forEach(client => {
        const row = createClientRow(client);
        tableBody.appendChild(row);
    });

    console.log(`[DEBUG] Renderizados ${filteredClients.length} clientes en la tabla`);
}

function createClientRow(client) {
    const row = document.createElement('tr');
    row.setAttribute('data-cedula', client.cedula);

    // Cédula
    const cedulaCell = document.createElement('td');
    cedulaCell.textContent = client.cedula || 'N/A';
    row.appendChild(cedulaCell);

    // Nombre Completo
    const fullNameCell = document.createElement('td');
    fullNameCell.textContent = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Sin nombre';
    row.appendChild(fullNameCell);

    // Email
    const emailCell = document.createElement('td');
    emailCell.textContent = client.email || 'N/A';
    row.appendChild(emailCell);

    // Teléfono
    const phoneCell = document.createElement('td');
    phoneCell.textContent = client.phone || 'N/A';
    row.appendChild(phoneCell);

    // Rol con badge
    const roleCell = document.createElement('td');
    const roleBadge = document.createElement('span');
    roleBadge.className = 'role-badge';

    const role = client.role ? client.role.toLowerCase() : 'cliente';
    if (role === 'admin') {
        roleBadge.classList.add('admin');
        roleBadge.textContent = 'Admin';
    } else {
        roleBadge.classList.add('client');
        roleBadge.textContent = 'Cliente';
    }
    roleCell.appendChild(roleBadge);
    row.appendChild(roleCell);

    // Acciones
    const actionsCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.className = 'action-btn edit-btn';
    editButton.innerHTML = '<i class="fas fa-user-edit"></i> Editar';
    editButton.addEventListener('click', () => openEditModal(client));
    actionsCell.appendChild(editButton);
    row.appendChild(actionsCell);

    return row;
}

// ========================================
// BÚSQUEDA
// ========================================

function setupSearch() {
    const searchInput = document.getElementById('search-input');

    // Asegurar que los datos existen antes de permitir buscar
    if (!searchInput) {
        console.warn('[WARNING] Input de búsqueda no encontrado');
        return;
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        // Verificar que los datos estén cargados
        if (!allClients || allClients.length === 0) {
            console.warn('[WARNING] No hay datos para filtrar');
            return;
        }

        if (query === '') {
            filteredClients = [...allClients];
        } else {
            filteredClients = allClients.filter(client => {
                const firstName = client.first_name ? client.first_name.toLowerCase() : '';
                const lastName = client.last_name ? client.last_name.toLowerCase() : '';
                const cedula = client.cedula ? client.cedula.toLowerCase() : '';
                const email = client.email ? client.email.toLowerCase() : '';

                return firstName.includes(query) ||
                    lastName.includes(query) ||
                    cedula.includes(query) ||
                    email.includes(query);
            });
        }

        displayClients();
    });

    console.log('[DEBUG] Búsqueda configurada');
}

// ========================================
// MODAL DE EDICIÓN
// ========================================

function setupModal() {
    const modal = document.getElementById('edit-client-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    const form = document.getElementById('edit-client-form');

    // Cerrar con X
    closeBtn.addEventListener('click', () => closeModal());

    // Cerrar con botón Cancelar
    cancelBtn.addEventListener('click', () => closeModal());

    // Cerrar al hacer clic fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Manejar envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveClientChanges();
    });
}

function openEditModal(client) {
    // Guardar referencia al cliente que se está editando
    currentEditingClient = { ...client };

    // Poblar el formulario con los datos actuales
    document.getElementById('edit-cedula').value = client.cedula || '';
    document.getElementById('edit-first-name').value = client.first_name || '';
    document.getElementById('edit-last-name').value = client.last_name || '';
    document.getElementById('edit-email').value = client.email || '';
    document.getElementById('edit-phone').value = client.phone || '';

    // Establecer rol
    const roleSelect = document.getElementById('edit-role');
    const role = client.role ? client.role.toLowerCase() : 'cliente';
    roleSelect.value = role;

    // Mostrar modal
    const modal = document.getElementById('edit-client-modal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('edit-client-modal');
    modal.classList.remove('active');

    // Limpiar formulario y referencia
    document.getElementById('edit-client-form').reset();
    currentEditingClient = null;
}

// ========================================
// GUARDAR CAMBIOS
// ========================================

async function saveClientChanges() {
    if (!currentEditingClient) {
        showToast('Error: No hay cliente seleccionado para editar', 'error');
        return;
    }

    // Obtener valores del formulario
    const cedula = document.getElementById('edit-cedula').value.trim();
    const firstName = document.getElementById('edit-first-name').value.trim();
    const lastName = document.getElementById('edit-last-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const role = document.getElementById('edit-role').value;

    // Validación básica
    if (!firstName || !lastName || !email || !phone) {
        showToast('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Por favor ingresa un correo electrónico válido', 'error');
        return;
    }

    // Preparar datos para enviar - El rol siempre será 'cliente'
    const updatedData = {
        cedula: cedula,
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        role: 'cliente' // Forzar rol de cliente
    };

    try {
        console.log('[DEBUG] Enviando datos al servidor:', updatedData);

        // Mostrar loading en el botón
        const submitBtn = document.querySelector('.modal-actions .primary-btn');
        if (!submitBtn) {
            console.error('[ERROR] Botón de guardar no encontrado');
            showToast('Error: No se encontró el botón de guardar', 'error');
            return;
        }
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        const response = await fetch(`/api/users/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        const result = await response.json();

        console.log('[DEBUG] Respuesta del servidor:', response.status, result);

        if (!response.ok || result.status !== 'success') {
            throw new Error(result.message || 'Error al actualizar el cliente');
        }

        // Actualizar datos locales solo después de recibir respuesta 200 OK
        const clientIndex = allClients.findIndex(c => c.cedula === cedula);
        if (clientIndex !== -1) {
            allClients[clientIndex] = { ...allClients[clientIndex], ...updatedData };
        }

        // Actualizar también en filteredClients
        const filteredIndex = filteredClients.findIndex(c => c.cedula === cedula);
        if (filteredIndex !== -1) {
            filteredClients[filteredIndex] = { ...filteredClients[filteredIndex], ...updatedData };
        }

        // Actualizar la fila en la tabla sin recargar toda la página
        updateTableRow(cedula, updatedData);

        // Mostrar mensaje de éxito
        showToast('Datos de usuario actualizados con éxito', 'success');

        // Cerrar modal
        closeModal();

        // Restaurar botón
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;

        console.log('[DEBUG] Cliente actualizado correctamente');

    } catch (error) {
        console.error('Error updating client:', error);
        showToast('Error al actualizar el cliente: ' + error.message, 'error');

        // Restaurar botón
        const submitBtn = document.querySelector('.modal-actions .primary-btn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
            submitBtn.disabled = false;
        }
    }
}

// ========================================
// ACTUALIZACIÓN DE FILA
// ========================================

function updateTableRow(cedula, updatedData) {
    const row = document.querySelector(`tr[data-cedula="${cedula}"]`);
    if (!row) return;

    // Actualizar celdas
    const cells = row.querySelectorAll('td');

    // Nombre completo (celda 1)
    cells[1].textContent = `${updatedData.first_name} ${updatedData.last_name}`;

    // Email (celda 2)
    cells[2].textContent = updatedData.email;

    // Teléfono (celda 3)
    cells[3].textContent = updatedData.phone;

    // Rol (celda 4)
    const roleCell = cells[4];
    roleCell.innerHTML = '';
    const roleBadge = document.createElement('span');
    roleBadge.className = 'role-badge';

    const role = updatedData.role.toLowerCase();
    if (role === 'admin') {
        roleBadge.classList.add('admin');
        roleBadge.textContent = 'Admin';
    } else {
        roleBadge.classList.add('client');
        roleBadge.textContent = 'Cliente';
    }
    roleCell.appendChild(roleBadge);

    // Animación de actualización
    row.style.background = 'rgba(39, 174, 96, 0.2)';
    setTimeout(() => {
        row.style.background = '';
    }, 1500);
}

// ========================================
// NOTIFICACIONES
// ========================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const icon = toast.querySelector('i');

    toastMessage.textContent = message;

    // Actualizar clase y icono según el tipo
    if (type === 'success') {
        toast.className = 'toast success';
        icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
        toast.className = 'toast error';
        icon.className = 'fas fa-exclamation-circle';
    } else {
        toast.className = 'toast';
        icon.className = 'fas fa-info-circle';
    }

    // Mostrar toast
    toast.style.display = 'flex';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
