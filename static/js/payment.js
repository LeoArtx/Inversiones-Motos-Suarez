// static/js/payment.js

document.addEventListener('DOMContentLoaded', () => {
    loadPaymentPage();
    setupPaymentForm();
    startDateTimeUpdate();
});

// Load payment page data
function loadPaymentPage() {
    loadUserData();
    loadSelectedProducts();
}

// Load user information from localStorage
function loadUserData() {
    const activeUserStr = localStorage.getItem('activeUser');
    if (!activeUserStr) {
        alert('Datos del usuario no encontrados. Por favor, inicia sesión nuevamente.');
        window.location.href = '/login';
        return;
    }

    const activeUser = JSON.parse(activeUserStr);
    const userName = `${activeUser.first_name} ${activeUser.last_name}`;

    // Fill user information
    document.getElementById('user-name').textContent = userName;
    document.getElementById('user-phone').textContent = activeUser.phone || 'No especificado';
    document.getElementById('user-cedula').textContent = activeUser.cedula || 'No especificado';
}

// Load and display selected products from cart
function loadSelectedProducts() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    if (cart.length === 0) {
        // Redirect to cart if empty
        window.location.href = '/cart';
        return;
    }

    const selectedProductsContainer = document.getElementById('selected-products');
    selectedProductsContainer.innerHTML = '';

    cart.forEach((item) => {
        const productElement = document.createElement('div');
        productElement.className = 'selected-product-item';
        productElement.innerHTML = `
            <div class="product-image">
                <img src="${item.image || 'https://via.placeholder.com/60x60/3498db/ffffff?text=Producto'}" alt="${item.name}">
            </div>
            <div class="product-info">
                <h4>${item.name}</h4>
                <p class="product-price">$${item.price.toLocaleString()}</p>
                <p class="product-quantity">Cantidad: ${item.quantity}</p>
            </div>
        `;
        selectedProductsContainer.appendChild(productElement);
    });
}

// Start date and time update
function startDateTimeUpdate() {
    updateDateTime();
    setInterval(updateDateTime, 1000); // Update every second
}

// Update current date and time display
function updateDateTime() {
    const now = new Date();
    const formattedDateTime = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    document.getElementById('current-datetime').textContent = formattedDateTime;
}

// Setup payment form submission
function setupPaymentForm() {
    const paymentForm = document.getElementById('payment-form');
    if (!paymentForm) return;

    paymentForm.addEventListener('submit', handlePaymentSubmission);
}

// Validate payment form
function validatePaymentForm(formData) {
    const errors = [];

    // Check required fields
    if (!formData.get('payment-bank')) {
        errors.push('Debe seleccionar un banco emisor');
    }

    const reference = formData.get('payment-reference') || '';
    if (!reference.trim()) {
        errors.push('Debe ingresar el código de referencia');
    } else if (!/^\d{12}$/.test(reference)) {
        errors.push('El código de referencia debe tener exactamente 12 dígitos numéricos');
    }

    // Check file upload
    const proofInput = document.getElementById('proof-of-payment');
    if (!proofInput || !proofInput.files || proofInput.files.length === 0) {
        errors.push('Debe subir un comprobante de pago');
    } else {
        const file = proofInput.files[0];
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            errors.push('El archivo debe ser una imagen (.jpg, .jpeg, .png)');
        }

        if (file.size > maxSize) {
            errors.push('El archivo no debe superar los 5MB');
        }
    }

    return errors;
}

// Handle payment form submission
async function handlePaymentSubmission(event) {
    event.preventDefault();

    const paymentSubmitBtn = document.getElementById('payment-submit-btn');
    const paymentMessage = document.getElementById('payment-message');

    // Get form data for validation
    const formData = new FormData(event.target);

    // Validate form
    const validationErrors = validatePaymentForm(formData);
    if (validationErrors.length > 0) {
        paymentMessage.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${validationErrors.join('<br>')}</div>`;
        paymentMessage.style.color = 'red';
        return;
    }

    // Disable button and show processing
    paymentSubmitBtn.disabled = true;
    paymentSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
        // Get cart data from localStorage
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) {
            throw new Error('El carrito está vacío');
        }

        // Get user data from localStorage
        const activeUserStr = localStorage.getItem('activeUser');
        if (!activeUserStr) {
            throw new Error('Datos del usuario no encontrados. Por favor, inicia sesión nuevamente.');
        }
        const activeUser = JSON.parse(activeUserStr);

        // Get form data
        const formData = new FormData(event.target);
        const paymentData = Object.fromEntries(formData.entries());

        // Handle payment proof image
        let proofImageUrl = '';
        const proofInput = document.getElementById('proof-of-payment');
        if (proofInput && proofInput.files && proofInput.files[0]) {
            proofImageUrl = await convertFileToDataURL(proofInput.files[0]);
        }

        // Prepare data to send to server
        const requestData = {
            cart: cart,
            user: {
                first_name: activeUser.first_name,
                last_name: activeUser.last_name,
                cedula: activeUser.cedula,
                phone: activeUser.phone,
                email: activeUser.email
            },
            payment_proof: proofImageUrl,
            bank_reference: paymentData['payment-reference']
        };

        // Send to server
        const response = await fetch('/api/purchases/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al registrar la compra');
        }

        const result = await response.json();

        // Success
        paymentMessage.innerHTML = `<div class="success-message"><i class="fas fa-check-circle"></i> ¡Pago registrado exitosamente! ID de compra: ${result.purchase_id}. Su pedido está siendo procesado.</div>`;
        paymentMessage.style.color = 'green';

        // Clear cart and redirect after success
        localStorage.removeItem('cart');
        setTimeout(() => {
            window.location.href = '/?payment=success';
        }, 3000);

    } catch (error) {
        console.error('Payment registration error:', error);
        paymentMessage.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${error.message || 'Error al registrar el pago. Por favor, inténtelo de nuevo.'}</div>`;
        paymentMessage.style.color = 'red';
        paymentSubmitBtn.disabled = false;
        paymentSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Registrar Pago';
    }
}

// Convert file to Data URL for localStorage storage
function convertFileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al procesar la imagen'));
        reader.readAsDataURL(file);
    });
}

// Add payment-specific styles
const paymentStyles = document.createElement('style');
paymentStyles.textContent = `
    .payment-confirmation-page {
        background: white;
        min-height: calc(100vh - 200px);
        padding: 2rem 5%;
    }

    .payment-container {
        max-width: 1000px;
        margin: 0 auto;
    }

    .payment-header {
        text-align: center;
        margin-bottom: 3rem;
        padding: 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 15px;
        color: white;
    }

    .payment-header h1 {
        margin-bottom: 0.5rem;
        font-size: 2.5rem;
    }

    .payment-header p {
        font-size: 1.2rem;
        opacity: 0.9;
    }

    .payment-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
    }

    .order-summary-section,
    .buyer-data-section,
    .payment-form-section {
        background: #f8f9fa;
        padding: 2rem;
        border-radius: 15px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }

    .order-summary-section h3,
    .buyer-data-section h3,
    .payment-form-section h3 {
        color: #2c3e50;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #3498db;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .selected-products {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    .selected-product-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .selected-product-item .product-image img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 8px;
    }

    .selected-product-item .product-info h4 {
        margin: 0 0 0.5rem 0;
        color: #2c3e50;
        font-size: 1rem;
    }

    .selected-product-item .product-info .product-price {
        margin: 0 0 0.25rem 0;
        color: #e74c3c;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .selected-product-item .product-info .product-quantity {
        margin: 0;
        color: #7f8c8d;
        font-size: 0.85rem;
    }

    .buyer-info {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid #e9ecef;
    }

    .info-row:last-child {
        border-bottom: none;
    }

    .info-row .label {
        font-weight: 600;
        color: #2c3e50;
    }

    .info-row .value {
        color: #7f8c8d;
    }

    .payment-form {
        background: white;
        padding: 2rem;
        border-radius: 10px;
    }

    .form-section {
        margin-bottom: 2rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
    }

    .form-group input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
        outline: none;
        border-color: #3498db;
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .form-group select {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.3s ease;
        background: white;
        cursor: pointer;
    }

    .form-hint {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.85rem;
        color: #7f8c8d;
    }

    .payment-instructions {
        background: #e8f4f8;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 2rem;
        border-left: 4px solid #3498db;
    }

    .payment-instructions h4 {
        margin: 0 0 1rem 0;
        color: #2c3e50;
    }

    .payment-instructions ul {
        margin: 0;
        padding-left: 1.5rem;
    }

    .payment-instructions li {
        margin-bottom: 0.5rem;
        color: #555;
    }

    .payment-submit-btn {
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

    .payment-submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(39,174,96,0.3);
    }

    .payment-submit-btn:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .success-message, .error-message {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }

    .success-message {
        background: rgba(39, 174, 96, 0.1);
        color: #27ae60;
    }

    .error-message {
        background: rgba(231, 76, 60, 0.1);
        color: #e74c3c;
    }

    @media (max-width: 768px) {
        .selected-products {
            grid-template-columns: 1fr;
        }

        .selected-product-item {
            flex-direction: column;
            text-align: center;
        }

        .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }
`;
document.head.appendChild(paymentStyles);