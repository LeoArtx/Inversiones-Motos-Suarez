// static/js/my_purchases.js

document.addEventListener('DOMContentLoaded', () => {
    loadPurchases();
});

async function loadPurchases() {
    try {
        const response = await fetch('/api/purchases/user');

        if (response.status === 401) {
            // Redirigir al login
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load purchases: ' + response.status);
        }

        const purchases = await response.json();

        displayPurchases(purchases);
    } catch (error) {
        console.error('Error loading purchases:', error);
        displayPurchases([]);
    }
}

function displayPurchases(purchases) {
    const tableBody = document.getElementById('purchases-table-body');
    const table = document.getElementById('purchases-table');
    const emptyState = document.getElementById('empty-purchases');

    // Always show the table with headers
    table.style.display = 'block';

    if (purchases.length === 0) {
        emptyState.style.display = 'none';
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-color);">No has realizado compras aún.</td></tr>';
        return;
    }

    emptyState.style.display = 'none';

    tableBody.innerHTML = '';

    purchases.forEach(purchase => {
        const row = createPurchaseRow(purchase);
        tableBody.appendChild(row);
    });
}

function createPurchaseRow(purchase) {
    const row = document.createElement('tr');

    // Determine product info
    const products = purchase.products || [];
    const totalItems = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const firstProduct = products.length > 0 ? products[0] : null;
    const productName = products.length === 1 ? firstProduct.name : 'Múltiples Productos';
    const productImage = firstProduct && firstProduct.image_url ? firstProduct.image_url : '/static/img/products/repuestos.png';

    // Format date
    const purchaseDate = new Date(purchase.purchase_date).toLocaleString('es-ES');

    // Format amount
    const amountPaid = `$${purchase.total_amount.toFixed(2)}`;

    // Create cells
    const imgCell = document.createElement('td');
    imgCell.className = 'product-cell';
    const img = document.createElement('img');
    img.src = productImage;
    img.alt = productName;
    img.className = 'product-thumbnail';
    imgCell.appendChild(img);

    const nameCell = document.createElement('td');
    nameCell.textContent = productName;

    const qtyCell = document.createElement('td');
    qtyCell.textContent = totalItems;

    const amountCell = document.createElement('td');
    amountCell.textContent = amountPaid;

    const dateCell = document.createElement('td');
    dateCell.textContent = purchaseDate;

    const idCell = document.createElement('td');
    idCell.textContent = purchase.id;

    const statusCell = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = `status-badge status-${purchase.status}`;
    statusSpan.textContent = getStatusText(purchase.status);
    statusCell.appendChild(statusSpan);

    // Append cells to row
    row.appendChild(imgCell);
    row.appendChild(nameCell);
    row.appendChild(qtyCell);
    row.appendChild(amountCell);
    row.appendChild(dateCell);
    row.appendChild(idCell);
    row.appendChild(statusCell);

    return row;
}

function getStatusText(status) {
    const statusMap = {
        'pendiente': 'Pendiente',
        'procesando': 'Procesando',
        'completada': 'Completada',
        'cancelada': 'Cancelada'
    };
    return statusMap[status] || status;
}

function showEmptyState() {
    const table = document.getElementById('purchases-table');
    const emptyState = document.getElementById('empty-purchases');

    if (table) table.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}