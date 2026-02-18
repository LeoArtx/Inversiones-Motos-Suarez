// static/js/admin/purchases.js

let mockPurchases = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredPurchases = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadPurchasesData();
    setupFilters();
    setupModal();
    setupLightbox();
});

// Load purchases data from API
async function loadPurchasesData() {
    try {
        const response = await fetch('/api/purchases/admin');
        if (!response.ok) {
            throw new Error('Failed to load purchases');
        }
        const data = await response.json();
        mockPurchases = data;
        filteredPurchases = [...mockPurchases];
        loadPurchases();
    } catch (error) {
        console.error('Error loading purchases data:', error);
        showNotification('Error al cargar los datos de compras: ' + error.message, 'error');
        // Fallback: show empty table
        mockPurchases = [];
        filteredPurchases = [];
        loadPurchases();
    }
}

// Load and display purchases
function loadPurchases() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const purchasesToShow = filteredPurchases.slice(startIndex, endIndex);

    const tableBody = document.getElementById('purchases-table-body');
    tableBody.innerHTML = '';

    purchasesToShow.forEach(purchase => {
        const row = createPurchaseRow(purchase);
        tableBody.appendChild(row);
    });

    updatePagination();
}

// Create purchase table row
function createPurchaseRow(purchase) {
    const row = document.createElement('tr');

    const userName = `${purchase.user.first_name} ${purchase.user.last_name}`;
    const mainProduct = purchase.products.length === 1 ?
        purchase.products[0].name : "Múltiples Productos";
    const totalItems = purchase.products.reduce((sum, item) => sum + item.quantity, 0);
    const purchaseDate = new Date(purchase.purchase_date).toLocaleString('es-ES');

    row.innerHTML = `
        <td>${userName}</td>
        <td>${mainProduct}</td>
        <td>${totalItems}</td>
        <td>${purchase.id}</td>
        <td>${purchaseDate}</td>
        <td><span class="status-badge status-${purchase.status}">${getStatusText(purchase.status)}</span></td>
        <td class="actions-cell">
            <button class="action-btn details-btn" data-purchase-id="${purchase.id}" title="Ver Detalles">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn delete-btn" data-purchase-id="${purchase.id}" title="Eliminar Compra">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    return row;
}

// Get status text in Spanish
function getStatusText(status) {
    const statusMap = {
        'Pendiente': 'Pendiente',
        'Procesando': 'Procesando',
        'Completada': 'Completada',
        'Cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
}

// Setup filters and search
function setupFilters() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const clearFilters = document.getElementById('clear-filters');

    // Search functionality
    searchInput.addEventListener('input', applyFilters);

    // Filter by status
    statusFilter.addEventListener('change', applyFilters);

    // Filter by date range
    dateFrom.addEventListener('change', applyFilters);
    dateTo.addEventListener('change', applyFilters);

    // Clear filters
    clearFilters.addEventListener('click', () => {
        searchInput.value = '';
        statusFilter.value = '';
        dateFrom.value = '';
        dateTo.value = '';
        applyFilters();
    });
}

// Apply all filters
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    filteredPurchases = mockPurchases.filter(purchase => {
        const userName = `${purchase.user.first_name} ${purchase.user.last_name}`.toLowerCase();
        const matchesSearch = userName.includes(searchTerm) || purchase.id.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || purchase.status === statusFilter;

        let matchesDate = true;
        if (dateFrom || dateTo) {
            const purchaseDate = new Date(purchase.purchase_date).toISOString().split('T')[0];
            if (dateFrom && purchaseDate < dateFrom) matchesDate = false;
            if (dateTo && purchaseDate > dateTo) matchesDate = false;
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    currentPage = 1;
    loadPurchases();
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
    const paginationInfo = document.getElementById('pagination-info');
    const currentPageSpan = document.getElementById('current-page');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredPurchases.length);

    paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${filteredPurchases.length} compras`;
    currentPageSpan.textContent = currentPage;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Setup pagination event listeners
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadPurchases();
        }
    };

    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadPurchases();
        }
    };
}

// Setup modal functionality
function setupModal() {
    const modal = document.getElementById('purchase-modal');
    const closeBtn = document.getElementById('close-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const overlay = document.getElementById('modal-overlay');
    const updateStatusBtn = document.getElementById('update-status-btn');

    // Close modal events
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    overlay.addEventListener('click', () => modal.style.display = 'none');

    // Update status button
    updateStatusBtn.addEventListener('click', updatePurchaseStatus);

    // Delegate click events for action buttons
    document.addEventListener('click', (e) => {
        if (e.target.closest('.details-btn')) {
            const button = e.target.closest('.details-btn');
            const purchaseId = button.getAttribute('data-purchase-id');
            openPurchaseModal(purchaseId);
        }

        if (e.target.closest('.delete-btn')) {
            const button = e.target.closest('.delete-btn');
            const purchaseId = button.getAttribute('data-purchase-id');
            deletePurchase(purchaseId);
        }
    });
}

// Open purchase details modal
function openPurchaseModal(purchaseId) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    // Fill user details
    document.getElementById('modal-user-name').textContent =
        `${purchase.user.first_name} ${purchase.user.last_name}`;
    document.getElementById('modal-user-cedula').textContent = purchase.user.cedula;
    document.getElementById('modal-user-phone').textContent = purchase.user.phone;
    document.getElementById('modal-user-email').textContent = purchase.user.email;

    // Fill transaction details
    document.getElementById('modal-purchase-ref').textContent = purchase.id;
    document.getElementById('modal-purchase-date').textContent =
        new Date(purchase.purchase_date).toLocaleString('es-ES');
    document.getElementById('modal-purchase-status').value = purchase.status;
    document.getElementById('modal-purchase-total').textContent =
        `$${purchase.total_amount.toFixed(2)}`;

    // Fill products list
    const productsList = document.getElementById('modal-products-list');
    productsList.innerHTML = '';
    purchase.products.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item-detail';
        productItem.innerHTML = `
            <span class="product-name">${product.name}</span>
            <span class="product-price">$${product.price.toFixed(2)}</span>
            <span class="product-quantity">x${product.quantity}</span>
            <span class="product-subtotal">$${(product.price * product.quantity).toFixed(2)}</span>
        `;
        productsList.appendChild(productItem);
    });

    // Set payment proof image
    const proofImage = document.getElementById('modal-payment-proof');
    if (purchase.payment_proof) {
        proofImage.src = purchase.payment_proof;
        proofImage.style.display = 'block';
        document.getElementById('zoom-proof').style.display = 'block';
    } else {
        proofImage.src = '';
        proofImage.style.display = 'none';
        document.getElementById('zoom-proof').style.display = 'none';
    }

    // Show modal
    document.getElementById('purchase-modal').style.display = 'block';
}

// Update purchase status
async function updatePurchaseStatus() {
    const purchaseRef = document.getElementById('modal-purchase-ref').textContent;
    const newStatus = document.getElementById('modal-purchase-status').value;

    try {
        const response = await fetch('/api/purchases/update_status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                purchase_id: purchaseRef,
                status: newStatus
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error updating status');
        }

        // Close modal and reload data
        document.getElementById('purchase-modal').style.display = 'none';
        loadPurchasesData();

        // Show success message
        showNotification('Estado de la compra actualizado exitosamente', 'success');

    } catch (error) {
        console.error('Error updating purchase status:', error);
        showNotification('Error al actualizar el estado: ' + error.message, 'error');
    }
}

// Delete purchase with confirmation
async function deletePurchase(purchaseId) {
    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    const userName = `${purchase.user.first_name} ${purchase.user.last_name}`;

    // Show confirmation dialog
    const confirmed = confirm(
        `¿Está seguro de que desea eliminar la compra ${purchaseId} de ${userName}?\n\n` +
        `Esta acción eliminará permanentemente la compra.`
    );

    if (confirmed) {
        try {
            const response = await fetch(`/api/purchases/${purchaseId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error deleting purchase');
            }

            // Reload data to reflect changes
            loadPurchasesData();

            // Show success message
            showNotification('Compra eliminada exitosamente', 'success');

        } catch (error) {
            console.error('Error deleting purchase:', error);
            showNotification('Error al eliminar la compra: ' + error.message, 'error');
        }
    }
}

// Setup lightbox for payment proof images
function setupLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const zoomBtn = document.getElementById('zoom-proof');
    const closeBtn = document.querySelector('.lightbox-close');

    // Open lightbox
    zoomBtn.addEventListener('click', () => {
        const imgSrc = document.getElementById('modal-payment-proof').src;
        lightboxImg.src = imgSrc;
        lightboxCaption.textContent = 'Comprobante de Pago';
        lightbox.style.display = 'block';
    });

    // Close lightbox
    closeBtn.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });

    // Close on click outside
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.style.display = 'none';
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add purchases-specific styles
const purchasesStyles = document.createElement('style');
purchasesStyles.textContent = `
    .admin-content {
        background: white;
        min-height: calc(100vh - 200px);
        padding: 2rem 5%;
    }

    .admin-container {
        max-width: 1400px;
        margin: 0 auto;
    }

    .filters-section {
        background: #f8f9fa;
        padding: 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }

    .search-container {
        position: relative;
        margin-bottom: 1.5rem;
    }

    .search-container i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #7f8c8d;
    }

    .search-container input {
        width: 100%;
        padding: 0.75rem 0.75rem 0.75rem 2.5rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
    }

    .filter-controls {
        display: flex;
        gap: 1rem;
        align-items: end;
        flex-wrap: wrap;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .filter-group label {
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.9rem;
    }

    .filter-group select,
    .filter-group input {
        padding: 0.5rem;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
    }

    .clear-filters-btn {
        background: #95a5a6;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .clear-filters-btn:hover {
        background: #7f8c8d;
    }

    .purchases-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }

    .purchases-table th,
    .purchases-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #e9ecef;
    }

    .purchases-table th {
        background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .purchases-table tbody tr:nth-child(even) {
        background: rgba(59, 130, 246, 0.05);
    }

    .purchases-table tbody tr:hover {
        background: rgba(59, 130, 246, 0.1);
        transform: scale(1.01);
        transition: all 0.2s ease;
    }

    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .status-pendiente {
        background: rgba(243, 156, 18, 0.1);
        color: #f39c12;
    }

    .status-procesando {
        background: rgba(52, 152, 219, 0.1);
        color: #3498db;
    }

    .status-completada {
        background: rgba(39, 174, 96, 0.1);
        color: #27ae60;
    }

    .status-cancelada {
        background: rgba(231, 76, 60, 0.1);
        color: #e74c3c;
    }

    .details-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .details-btn:hover {
        background: #2980b9;
        transform: translateY(-2px);
    }

    .delete-btn {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 0.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: 0.5rem;
    }

    .delete-btn:hover {
        background: #c0392b;
        transform: scale(1.1);
    }

    .pagination-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2rem;
        padding: 1rem;
    }

    .pagination-info {
        color: #7f8c8d;
        font-weight: 500;
    }

    .pagination-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .pagination-btn {
        background: #f8f9fa;
        border: 2px solid #ddd;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .pagination-btn:hover:not(:disabled) {
        background: #3498db;
        color: white;
        border-color: #3498db;
    }

    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Modal Styles */
    .large-modal {
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-body {
        display: grid;
        gap: 2rem;
    }

    .modal-section {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 4px solid #3498db;
    }

    .modal-section h3 {
        margin-bottom: 1rem;
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .user-details-grid,
    .transaction-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .detail-item label {
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.9rem;
    }

    .detail-item span {
        color: #555;
    }

    .status-select {
        padding: 0.5rem;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 0.9rem;
    }

    .products-list-section h4 {
        margin-bottom: 1rem;
        color: #2c3e50;
    }

    .products-list {
        background: white;
        border-radius: 8px;
        overflow: hidden;
    }

    .product-item-detail {
        display: grid;
        grid-template-columns: 2fr 1fr 0.5fr 1fr;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid #e9ecef;
        align-items: center;
    }

    .product-item-detail:last-child {
        border-bottom: none;
    }

    .product-name {
        font-weight: 600;
        color: #2c3e50;
    }

    .product-price,
    .product-quantity,
    .product-subtotal {
        text-align: right;
        color: #555;
    }

    .payment-proof-container {
        text-align: center;
    }

    .payment-proof-image {
        max-width: 100%;
        max-height: 300px;
        border-radius: 8px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        cursor: pointer;
        transition: transform 0.3s ease;
    }

    .payment-proof-image:hover {
        transform: scale(1.05);
    }

    .proof-actions {
        margin-top: 1rem;
    }

    .zoom-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0 auto;
    }

    .zoom-btn:hover {
        background: #2980b9;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 2px solid #e9ecef;
    }

    .primary-btn,
    .secondary-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .primary-btn {
        background: linear-gradient(45deg, #27ae60, #2ecc71);
        color: white;
        border: none;
    }

    .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(39,174,96,0.3);
    }

    .secondary-btn {
        background: #95a5a6;
        color: white;
        border: none;
    }

    .secondary-btn:hover {
        background: #7f8c8d;
    }

    /* Lightbox Styles */
    .lightbox {
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.9);
    }

    .lightbox-content {
        max-width: 90%;
        max-height: 90%;
        margin: auto;
        display: block;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
    }

    .lightbox-close {
        position: absolute;
        top: 20px;
        right: 30px;
        color: white;
        font-size: 40px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .lightbox-close:hover {
        color: #ccc;
    }

    .lightbox-caption {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        text-align: center;
        font-size: 1.1rem;
        background: rgba(0,0,0,0.7);
        padding: 1rem;
        border-radius: 8px;
    }

    @media (max-width: 768px) {
        .filter-controls {
            flex-direction: column;
            align-items: stretch;
        }

        .purchases-table {
            font-size: 0.9rem;
        }

        .purchases-table th,
        .purchases-table td {
            padding: 8px 10px;
        }

        .user-details-grid,
        .transaction-details-grid {
            grid-template-columns: 1fr;
        }

        .product-item-detail {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 0.5rem;
        }

        .modal-actions {
            flex-direction: column;
        }
    }
`;
document.head.appendChild(purchasesStyles);