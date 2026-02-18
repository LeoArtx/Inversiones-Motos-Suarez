// static/js/admin/reports.js

let multiReportData = [];
let singleReportData = [];
let selectedPurchase = null;

document.addEventListener('DOMContentLoaded', () => {
    setupMultiReport();
    setupSingleReport();
    setupInvoiceModal();
    setDefaultDates();
});

// ========================================
// CONFIGURACIÓN INICIAL
// ========================================

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Sección múltiple
    document.getElementById('multi-start-date').value = thirtyDaysAgoStr;
    document.getElementById('multi-end-date').value = todayStr;

    // Sección individual
    document.getElementById('single-start-date').value = thirtyDaysAgoStr;
    document.getElementById('single-end-date').value = todayStr;
}

// ========================================
// SECCIÓN 1: REPORTE MÚLTIPLE
// ========================================

function setupMultiReport() {
    const loadBtn = document.getElementById('load-multi-report');
    const printBtn = document.getElementById('print-multi-report');

    loadBtn.addEventListener('click', loadMultiReport);
    printBtn.addEventListener('click', printMultiReport);
}

async function loadMultiReport() {
    const startDate = document.getElementById('multi-start-date').value;
    const endDate = document.getElementById('multi-end-date').value;

    if (!validateDates(startDate, endDate)) return;

    showLoading('multi', true);
    hideElements(['multi-report-summary', 'multi-report-table-container', 'multi-no-data-message']);

    try {
        const response = await fetch(`/api/purchases/reports?start_date=${startDate}&end_date=${endDate}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar el reporte');
        }

        const purchases = await response.json();
        multiReportData = purchases;

        showLoading('multi', false);

        if (purchases.length === 0) {
            document.getElementById('multi-no-data-message').style.display = 'block';
            document.getElementById('print-multi-report').disabled = true;
            return;
        }

        displayMultiReport(purchases, startDate, endDate);
        updateMultiSummary(purchases);
        document.getElementById('print-multi-report').disabled = false;

        showNotification('Reporte cargado exitosamente', 'success');

    } catch (error) {
        console.error('Error loading multi report:', error);
        showLoading('multi', false);
        showNotification('Error al cargar el reporte: ' + error.message, 'error');
    }
}

function displayMultiReport(purchases, startDate, endDate) {
    const tableBody = document.getElementById('multi-reports-table-body');
    const tableContainer = document.getElementById('multi-report-table-container');

    tableBody.innerHTML = '';

    purchases.forEach(purchase => {
        const row = createReportRow(purchase);
        tableBody.appendChild(row);
    });

    tableContainer.style.display = 'block';
    updatePrintTitle(startDate, endDate);
}

function updateMultiSummary(purchases) {
    const summarySection = document.getElementById('multi-report-summary');
    
    const totalTransactions = purchases.length;
    let totalItems = 0;
    let totalAmount = 0;

    purchases.forEach(purchase => {
        if (purchase.products) {
            totalItems += purchase.products.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
        if (purchase.total_amount) {
            totalAmount += parseFloat(purchase.total_amount);
        }
    });

    // Actualizar valores en pantalla
    document.getElementById('multi-total-transactions').textContent = totalTransactions;
    document.getElementById('multi-total-items').textContent = totalItems;
    document.getElementById('multi-total-amount').textContent = formatCurrency(totalAmount);

    // Actualizar valores para impresión
    document.getElementById('print-total-transactions').textContent = totalTransactions;
    document.getElementById('print-total-items').textContent = totalItems;
    document.getElementById('print-total-amount').textContent = formatCurrency(totalAmount);

    summarySection.style.display = 'grid';
}

function printMultiReport() {
    const tableBody = document.getElementById('multi-reports-table-body');
    if (tableBody.children.length === 0) {
        showNotification('No hay datos para imprimir. Carga un reporte primero.', 'warning');
        return;
    }

    // Copiar contenido de la tabla principal a la tabla de impresión
    const printTableBody = document.getElementById('print-table-body');
    printTableBody.innerHTML = tableBody.innerHTML;

    // Actualizar fecha de generación
    const now = new Date();
    document.getElementById('print-generation-date').textContent = formatDateTime(now);

    // Mostrar área de impresión
    document.querySelector('.print-list-area').style.display = 'block';

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.querySelector('.print-list-area').style.display = 'none';
        }, 100);
    }, 100);
}

// ========================================
// SECCIÓN 2: REPORTE INDIVIDUAL
// ========================================

function setupSingleReport() {
    const loadBtn = document.getElementById('load-single-report');
    loadBtn.addEventListener('click', loadSingleReport);
}

async function loadSingleReport() {
    const startDate = document.getElementById('single-start-date').value;
    const endDate = document.getElementById('single-end-date').value;

    if (!validateDates(startDate, endDate)) return;

    showLoading('single', true);
    hideElements(['single-report-table-container', 'single-no-data-message']);

    try {
        const response = await fetch(`/api/purchases/reports?start_date=${startDate}&end_date=${endDate}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar las transacciones');
        }

        const purchases = await response.json();
        singleReportData = purchases;

        showLoading('single', false);

        if (purchases.length === 0) {
            document.getElementById('single-no-data-message').style.display = 'block';
            return;
        }

        displaySingleReport(purchases);
        showNotification('Transacciones cargadas exitosamente', 'success');

    } catch (error) {
        console.error('Error loading single report:', error);
        showLoading('single', false);
        showNotification('Error al cargar las transacciones: ' + error.message, 'error');
    }
}

function displaySingleReport(purchases) {
    const tableBody = document.getElementById('single-reports-table-body');
    const tableContainer = document.getElementById('single-report-table-container');

    tableBody.innerHTML = '';

    purchases.forEach(purchase => {
        const row = createReportRow(purchase, true); // true = es para selección individual
        tableBody.appendChild(row);
    });

    tableContainer.style.display = 'block';
}

// ========================================
// MODAL DE FACTURA DETALLADA
// ========================================

function setupInvoiceModal() {
    const modal = document.getElementById('invoice-modal');
    const closeBtn = document.getElementById('close-invoice');
    const printBtn = document.getElementById('print-invoice-btn');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        clearSelection();
    });

    printBtn.addEventListener('click', printInvoice);

    // Cerrar al hacer clic fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            clearSelection();
        }
    });
}

function showInvoiceModal(purchase) {
    selectedPurchase = purchase;
    const modal = document.getElementById('invoice-modal');

    // Número de factura
    document.getElementById('invoice-number').textContent = `Factura #${purchase.id}`;

    // Información del usuario
    const user = purchase.user || {};
    document.getElementById('inv-user-name').textContent = 
        `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No especificado';
    document.getElementById('inv-user-cedula').textContent = user.cedula || 'No especificada';
    document.getElementById('inv-user-phone').textContent = user.phone || 'No especificado';
    document.getElementById('inv-user-email').textContent = user.email || 'No especificado';

    // Detalles de la transacción
    const purchaseDate = purchase.purchase_date ? 
        new Date(purchase.purchase_date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'No especificada';
    document.getElementById('inv-purchase-date').textContent = purchaseDate;
    document.getElementById('inv-purchase-ref').textContent = purchase.id;

    // Productos
    const productsList = document.getElementById('inv-products-list');
    productsList.innerHTML = '';

    if (purchase.products && purchase.products.length > 0) {
        purchase.products.forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div>
                    <strong>${product.name}</strong><br>
                    <small>Cantidad: ${product.quantity} × ${formatCurrency(product.price)}</small>
                </div>
                <div style="text-align: right; font-weight: 700; color: #27ae60;">
                    ${formatCurrency(product.price * product.quantity)}
                </div>
            `;
            productsList.appendChild(productItem);
        });
    } else {
        productsList.innerHTML = '<p style="color: #666; text-align: center;">Sin productos registrados</p>';
    }

    // Monto total
    document.getElementById('inv-total-amount').textContent = formatCurrency(purchase.total_amount || 0);

    // Mostrar modal
    modal.classList.add('active');
}

function printInvoice() {
    if (!selectedPurchase) {
        showNotification('No hay factura seleccionada', 'error');
        return;
    }

    window.print();
}

function clearSelection() {
    const rows = document.querySelectorAll('#single-reports-table-body tr');
    rows.forEach(row => row.classList.remove('selected'));
    selectedPurchase = null;
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function createReportRow(purchase, isSelectable = false) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', purchase.id);

    const userName = purchase.user ? 
        `${purchase.user.first_name} ${purchase.user.last_name}` : 
        'Usuario desconocido';

    const mainProduct = purchase.products && purchase.products.length > 0 ?
        (purchase.products.length === 1 ? 
            purchase.products[0].name : 
            `${purchase.products[0].name} (+${purchase.products.length - 1})`) : 
        "Sin productos";

    const totalItems = purchase.products ? 
        purchase.products.reduce((sum, item) => sum + (item.quantity || 0), 0) : 
        0;

    const purchaseDate = purchase.purchase_date ? 
        new Date(purchase.purchase_date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) : 
        'Fecha desconocida';

    const totalAmount = formatCurrency(purchase.total_amount || 0);

    row.innerHTML = `
        <td><strong>#${purchase.id}</strong></td>
        <td>${userName}</td>
        <td>${mainProduct}</td>
        <td>${totalItems}</td>
        <td>${purchaseDate}</td>
        <td><strong>${totalAmount}</strong></td>
    `;

    // Si es seleccionable (reporte individual), agregar evento de clic
    if (isSelectable) {
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            clearSelection();
            row.classList.add('selected');
            showInvoiceModal(purchase);
        });
    }

    return row;
}

function validateDates(startDate, endDate) {
    if (!startDate || !endDate) {
        showNotification('Por favor selecciona ambas fechas', 'error');
        return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        showNotification('La fecha de inicio no puede ser mayor a la fecha fin', 'error');
        return false;
    }

    return true;
}

function showLoading(section, show) {
    const spinnerId = section === 'multi' ? 'multi-loading-spinner' : 'single-loading-spinner';
    const spinner = document.getElementById(spinnerId);
    
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

function hideElements(ids) {
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

function updatePrintTitle(startDate, endDate) {
    const printTitle = document.getElementById('print-title');
    const printDateRange = document.getElementById('print-date-range');
    
    const start = new Date(startDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const end = new Date(endDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    printTitle.textContent = 'Reporte Consolidado de Ventas';
    printDateRange.textContent = `Período: ${start} - ${end}`;
}

function formatCurrency(amount) {
    const num = parseFloat(amount) || 0;
    return `$${num.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function formatDateTime(date) {
    return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification-toast');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification-toast';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);
    }

    let bgColor, icon;
    switch(type) {
        case 'success':
            bgColor = '#27ae60';
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            bgColor = '#e74c3c';
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            bgColor = '#f39c12';
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            bgColor = '#3498db';
            icon = '<i class="fas fa-info-circle"></i>';
    }

    notification.style.background = bgColor;
    notification.innerHTML = `${icon}<span>${message}</span>`;
    notification.style.display = 'flex';

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}

// Agregar estilos de animación si no existen
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
