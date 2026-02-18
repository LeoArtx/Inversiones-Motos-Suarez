// static/js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    setupMobileMenu();
});

// Load cart items from localStorage
function loadCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartItems = document.getElementById('cart-items');
    const emptyCart = document.getElementById('empty-cart');
    const cartContent = document.getElementById('cart-content');
    const cartSummary = document.getElementById('cart-summary');

    updateCartCount();

    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartContent) cartContent.style.display = 'none';
        return;
    }

    if (emptyCart) emptyCart.style.display = 'none';
    if (cartContent) cartContent.style.display = 'flex';

    // Update cart summary text
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartSummary) {
        cartSummary.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''} en el carrito`;
    }

    // Render cart items
    if (cartItems) {
        cartItems.innerHTML = '';
        cart.forEach((item, index) => {
            const itemElement = createCartItem(item, index);
            cartItems.appendChild(itemElement);
        });
    }

    updateCartTotals();
}

function createCartItem(item, index) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'cart-item';
    itemDiv.innerHTML = `
        <div class="item-image">
            <img src="${item.image || 'https://via.placeholder.com/100x80/3498db/ffffff?text=Moto'}" alt="${item.name}">
        </div>
        <div class="item-details">
            <h4>${item.name}</h4>
            <p class="item-price">$${item.price.toLocaleString()}</p>
        </div>
        <div class="item-quantity">
            <button onclick="updateQuantity(${index}, -1)" class="quantity-btn">
                <i class="fas fa-minus"></i>
            </button>
            <span class="quantity">${item.quantity}</span>
            <button onclick="updateQuantity(${index}, 1)" class="quantity-btn">
                <i class="fas fa-plus"></i>
            </button>
        </div>
        <div class="item-total">
            <p>$${(item.price * item.quantity).toLocaleString()}</p>
        </div>
        <div class="item-actions">
            <button onclick="removeItem(${index})" class="remove-btn">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    return itemDiv;
}

function updateQuantity(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        loadCart();
    }
}

function removeItem(index) {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
    showNotification('Producto eliminado del carrito', 'success');
}

async function updateCartTotals() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const iva = subtotal * 0.16; // 16% IVA
    const totalUSD = subtotal + iva;

    // Fetch exchange rate
    let exchangeRate = 36.50; // Default fallback rate
    try {
        const response = await fetch('/api/products/exchange-rate');
        if (response.ok) {
            const data = await response.json();
            exchangeRate = data.rate;
        }
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Use fallback rate
    }

    const totalVES = totalUSD * exchangeRate;

    // Update DOM elements
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-iva').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('total-usd').textContent = `$${totalUSD.toFixed(2)}`;
    document.getElementById('total-bs').textContent = `Bs.${totalVES.toFixed(2)}`;

    // Enable/disable checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
    }
}

// Checkout functionality
document.addEventListener('click', (e) => {
    if (e.target.id === 'checkout-btn' || e.target.closest('#checkout-btn')) {
        handleCheckout();
    }
});

function handleCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) {
        showNotification('Tu carrito está vacío', 'error');
        return;
    }

    // Since cart.html is session-protected, assume user is authenticated
    // Redirect to payment page
    window.location.href = '/payment';
}

function checkUserLogin() {
    // This would check session/cookies for authentication
    // For now, we'll simulate this
    return false; // Change to true when login system is implemented
}

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

// Add cart-specific styles
const cartStyles = document.createElement('style');
cartStyles.textContent = `
    .cart-page {
        background: white;
        min-height: calc(100vh - 200px);
        padding: 2rem 5%;
    }

    .cart-container {
        max-width: 1200px;
        margin: 0 auto;
    }

    .cart-header {
        text-align: center;
        margin-bottom: 3rem;
    }

    .cart-header h1 {
        color: #2c3e50;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }

    .cart-header #cart-summary {
        color: #7f8c8d;
        font-size: 1.1rem;
    }

    .empty-cart {
        text-align: center;
        padding: 4rem 2rem;
        color: #7f8c8d;
    }

    .empty-cart i {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: #bdc3c7;
    }

    .empty-cart h2 {
        margin-bottom: 1rem;
        color: #2c3e50;
    }

    .cart-content {
        display: flex;
        gap: 2rem;
        align-items: flex-start;
    }

    .cart-items {
        flex: 1;
        background: #f8f9fa;
        border-radius: 15px;
        padding: 2rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }

    .cart-item {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 1.5rem 0;
        border-bottom: 1px solid #e9ecef;
    }

    .cart-item:last-child {
        border-bottom: none;
    }

    .item-image img {
        width: 100px;
        height: 80px;
        object-fit: cover;
        border-radius: 8px;
    }

    .item-details {
        flex: 1;
    }

    .item-details h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
    }

    .item-price {
        color: #e74c3c;
        font-weight: 600;
        margin: 0;
    }

    .item-quantity {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .quantity-btn {
        background: #3498db;
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    }

    .quantity-btn:hover {
        background: #2980b9;
        transform: scale(1.1);
    }

    .quantity {
        font-weight: 600;
        min-width: 30px;
        text-align: center;
    }

    .item-total {
        min-width: 100px;
        text-align: right;
    }

    .item-total p {
        font-weight: 700;
        color: #27ae60;
        margin: 0;
    }

    .remove-btn {
        background: #e74c3c;
        color: white;
        border: none;
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .remove-btn:hover {
        background: #c0392b;
        transform: scale(1.1);
    }

    .cart-summary {
        width: 350px;
        background: white;
        border-radius: 15px;
        padding: 2rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
        position: sticky;
        top: 2rem;
    }

    .summary-card h3 {
        color: #2c3e50;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #3498db;
    }

    .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        color: #555;
    }

    .summary-row.total {
        font-size: 1.2rem;
        font-weight: 700;
        color: #2c3e50;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 2px solid #ecf0f1;
    }

    .checkout-btn {
        width: 100%;
        background: linear-gradient(45deg, #27ae60, #2ecc71);
        color: white;
        border: none;
        padding: 1rem;
        border-radius: 10px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 1.5rem;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .checkout-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(39,174,96,0.3);
    }

    .checkout-btn:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .shipping-note {
        text-align: center;
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-top: 1rem;
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ecc71;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification.error {
        background: #e74c3c;
    }

    .notification.info {
        background: #3498db;
    }

    @media (max-width: 768px) {
        .cart-content {
            flex-direction: column;
        }

        .cart-summary {
            width: 100%;
            position: static;
        }

        .cart-item {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
        }

        .item-quantity {
            justify-content: center;
        }

        .item-total {
            text-align: center;
        }
    }
`;
document.head.appendChild(cartStyles);