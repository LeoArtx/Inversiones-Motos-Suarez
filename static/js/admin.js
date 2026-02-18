// Admin Dashboard JavaScript

// Función para verificar si el usuario está logueado y es admin
function checkUserStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');
    const userGreeting = document.getElementById('user-greeting');

    if (isLoggedIn && userRole === 'admin') {
        // Mostrar menú desplegable de usuario
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
            userDropdown.style.display = 'block';
        }
        
        // Ocultar enlace de login
        const authLink = document.getElementById('auth-link');
        if (authLink) {
            authLink.style.display = 'none';
        }
        
        // Ocultar enlace de panel admin (ya que estamos en admin)
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'none';
        }

        // MOSTRAR MENSAJE DE BIENVENIDA PARA ADMIN
        if (userGreeting) {
            const activeUser = JSON.parse(localStorage.getItem('activeUser') || '{}');
            const firstName = activeUser.first_name || 'Administrador';

            userGreeting.innerHTML = `
                <i class="fas fa-user-shield" style="margin-right: 5px;"></i>
                Admin: ${firstName}
            `;
            userGreeting.style.display = 'flex';
            userGreeting.style.alignItems = 'center';
        }

    } else {
        // Ocultar menú desplegable
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }
        
        // Mostrar enlace de login
        const authLink = document.getElementById('auth-link');
        if (authLink) {
            authLink.style.display = 'block';
        }
        
        // Ocultar enlace de panel admin
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'none';
        }

        // OCULTAR MENSAJE DE BIENVENIDA
        if (userGreeting) {
            userGreeting.style.display = 'none';
            userGreeting.innerHTML = '';
        }
    }
}

// Función genérica para configurar menús desplegables
function setupDropdownMenus() {
    // Buscar todos los botones de dropdown con la clase .dropdown-toggle
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function (event) {
            event.stopPropagation();

            // Cerrar todos los otros dropdowns primero
            document.querySelectorAll('.dropdown-content.show, .nav-content.show').forEach(content => {
                if (content !== this.nextElementSibling) {
                    content.classList.remove('show');
                }
            });

            // Toggle del dropdown actual
            const dropdownContent = this.nextElementSibling;
            if (dropdownContent && (dropdownContent.classList.contains('dropdown-content') || dropdownContent.classList.contains('nav-content'))) {
                dropdownContent.classList.toggle('show');
            }
        });
    });

    // Función unificada para cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', function (event) {
        // Obtener todos los contenedores de dropdown
        const dropdownContainers = document.querySelectorAll('.dropdown-menu, #nav-dropdown');

        dropdownContainers.forEach(container => {
            const content = container.querySelector('.dropdown-content, .nav-content');
            if (content && !container.contains(event.target)) {
                content.classList.remove('show');
            }
        });
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Verificar estado del usuario al cargar la página
    checkUserStatus();

    // Configurar todos los menús desplegables
    setupDropdownMenus();

    // Cargar las últimas ventas SOLO si estamos en la página que las necesita
    const salesTableBody = document.getElementById('sales-table-body');
    if (salesTableBody) {
        loadLatestSales();
    }

    // Event listener para el enlace de cerrar sesión
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function (event) {
            event.preventDefault();
            logout();
        });
    }
});

// Función para formatear fecha de AAAA-MM-DD a DD/MM/AAAA
function formatDate(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Función para cargar las últimas ventas
async function loadLatestSales() {
    try {
        const response = await fetch('/api/billing/latest_sales');
        const data = await response.json();

        if (data.success) {
            const tableBody = document.getElementById('sales-table-body');
            if (!tableBody) {
                console.warn('Element sales-table-body not found on this page');
                return;
            }
            
            tableBody.innerHTML = ''; // Limpiar contenido anterior

            data.sales.forEach(sale => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(sale.fecha)}</td>
                    <td>${sale.cedula_cliente}</td>
                    <td>${sale.nombre_cliente}</td>
                    <td>${sale.telefono_cliente}</td>
                    <td>${sale.correo_cliente}</td>
                    <td>${sale.cantidad_total}</td>
                    <td>$${sale.total_factura.toFixed(2)}</td>
                    <td class="actions-cell">
                        <button class="action-btn edit-btn" onclick="editBilling(${sale.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteBilling(${sale.id})" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('Error al cargar las ventas:', data.message);
        }
    } catch (error) {
        console.error('Error al cargar las últimas ventas:', error);
    }
}

// Función para editar factura
function editBilling(billingId) {
    window.location.href = `/admin/billing/edit/${billingId}`;
}

// Función para eliminar factura
async function deleteBilling(billingId) {
    if (confirm('¿Está seguro de que desea eliminar esta factura? Esta acción no se puede deshacer.')) {
        try {
            const response = await fetch(`/api/billing/delete/${billingId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                alert('Factura eliminada exitosamente');
                loadLatestSales(); // Recargar la tabla
            } else {
                alert('Error al eliminar la factura: ' + data.message);
            }
        } catch (error) {
            console.error('Error al eliminar la factura:', error);
            alert('Error al eliminar la factura');
        }
    }
}

// Función logout (importada de auth.js, pero aseguramos que esté disponible)
function logout() {
    // 1. Eliminación de Sesión (Logout)
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('activeUser');

    // 2. Redirección a la página principal
    window.location.href = '/';
}
