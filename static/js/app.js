// static/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    checkUserRole();
    setupFilters();
    setupMobileMenu();
    setupThemeSelector();
    setupDropdownMenu();
    setupLoginModal();
});

// Mobile menu functionality
function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('header nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-menu-open');
        });
    }
}

// Filter functionality
function setupFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const priceFilter = document.getElementById('price-filter');
    const priceValue = document.getElementById('price-value');

    if (priceFilter && priceValue) {
        priceFilter.addEventListener('input', (e) => {
            priceValue.textContent = `$${parseInt(e.target.value).toLocaleString()}`;
            filterProducts();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterProducts);
    }
}

function filterProducts() {
    const categoryFilter = document.getElementById('category-filter')?.value || '';
    const maxPrice = parseInt(document.getElementById('price-filter')?.value || '50000');

    const productCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    productCards.forEach(card => {
        const category = card.dataset.category || '';
        const price = parseFloat(card.dataset.price || 0);

        const categoryMatch = !categoryFilter || category === categoryFilter;
        const priceMatch = price <= maxPrice;

        if (categoryMatch && priceMatch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide no products message
    const noProducts = document.getElementById('no-products');
    if (noProducts) {
        noProducts.style.display = visibleCount === 0 ? 'block' : 'none';
    }
}

// Función para cargar los productos del catálogo
async function loadProducts() {
    const loading = document.getElementById('loading');
    const productList = document.getElementById('product-list');

    if (loading) loading.style.display = 'block';

    try {
        const response = await fetch('/api/products/');
        if (!response.ok) {
            throw new Error('No se pudo cargar el catálogo.');
        }
        const products = await response.json();

        if (loading) loading.style.display = 'none';
        if (productList) productList.innerHTML = ''; // Limpiar

        if (products.length === 0) {
            if (productList) productList.innerHTML = '<div class="no-products"><i class="fas fa-box-open"></i><h3>No hay productos disponibles</h3><p>Estamos trabajando para traerte las mejores motos</p></div>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.category = product.category || 'motor_encendido';
            card.dataset.price = product.price;

            card.innerHTML = `
                <img src="${product.image_url || 'https://via.placeholder.com/300x200/3498db/ffffff?text=Moto+' + product.product_id}" alt="${product.name}" loading="lazy">
                <h3>${product.name}</h3>
                <p class="price">$${product.price.toLocaleString()}</p>
                <div class="product-info">
                    <span class="stock ${product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                        ${product.stock_quantity > 0 ? `Disponible: ${product.stock_quantity}` : 'Agotado'}
                    </span>
                </div>
                <button onclick="addToCart(${product.product_id})" ${product.stock_quantity === 0 ? 'disabled' : ''}>
                    <i class="fas fa-cart-plus"></i>
                    ${product.stock_quantity > 0 ? 'Añadir al Carrito' : 'Agotado'}
                </button>
            `;
            if (productList) productList.appendChild(card);
        });

        filterProducts();

    } catch (error) {
        console.error("Error al cargar productos:", error);
        if (loading) loading.style.display = 'none';
        if (productList) productList.innerHTML = '<div class="no-products"><i class="fas fa-exclamation-triangle"></i><h3>Error al cargar productos</h3><p>Por favor, intenta de nuevo más tarde</p></div>';
    }
}

// Función para verificar el rol y actualizar la UI
function checkUserRole() {
    // Verificar directamente desde localStorage para evitar dependencias del servidor
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    updateAuthUI({ is_logged_in: isLoggedIn });
}

function updateAuthUI(status) {
    const authLink = document.getElementById('auth-link');
    const adminLink = document.getElementById('admin-link');
    const userDropdown = document.getElementById('user-dropdown');
    const userGreeting = document.getElementById('user-greeting');

    if (status.is_logged_in) {
        // Hide login link and show dropdown menu
        if (authLink) {
            authLink.style.display = 'none';
        }
        if (userDropdown) {
            userDropdown.style.display = 'block';
        }
        if (adminLink && status.role === 'administrador') {
            adminLink.style.display = 'flex';
        }
    } else {
        // Show login link and hide dropdown menu
        if (authLink) {
            authLink.style.display = 'flex';
        }
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }
        if (adminLink) {
            adminLink.style.display = 'none';
        }
    }
}

// Carrito
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'inline' : 'none';
    }
}

function addToCart(productId, productName = null, productPrice = null) {
    let name, price, image;

    if (productName && productPrice) {
        // Direct parameters provided (from modal)
        name = productName;
        price = productPrice;
        // For modal, we need to get image from the global products array
        const product = frontendProducts.find(p => p.product_id == productId);
        image = product ? product.image_url : 'https://via.placeholder.com/100x80/3498db/ffffff?text=Moto';
    } else {
        // Get from DOM (from product cards)
        const productCard = event.target.closest('.product-card');
        name = productCard.querySelector('h3').textContent;
        price = parseFloat(productCard.dataset.price);
        const imgElement = productCard.querySelector('img');
        image = imgElement ? imgElement.src : 'https://via.placeholder.com/100x80/3498db/ffffff?text=Moto';
    }

    // Ver si el producto ya está en el carrito
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            image: image,
            quantity: 1
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();

    showNotification(`${name} añadido al carrito`, 'success');

    const cartLink = document.querySelector('.cart-link');
    if (cartLink) {
        cartLink.style.animation = 'bounce 0.6s ease';
        setTimeout(() => cartLink.style.animation = '', 600);
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

updateCartCount();

// Theme selector functionality
function setupThemeSelector() {
    const themeSelector = document.getElementById('theme-selector');
    const body = document.body;

    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
        updateThemeIcon(true);
    }

    if (themeSelector) {
        themeSelector.addEventListener('click', () => {
            const isDark = body.classList.toggle('dark-theme');
            updateThemeIcon(isDark);

            // Save theme preference
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

function updateThemeIcon(isDark) {
    const icon = document.querySelector('#theme-selector i');
    if (icon) {
        icon.className = isDark ? 'fas fa-moon' : 'fas fa-lightbulb';
    }
}

// Dropdown menu functionality
function setupDropdownMenu() {
    const dropdownToggle = document.getElementById('dropdown-toggle');
    const dropdownContent = document.getElementById('dropdown-content');
    const logoutLink = document.getElementById('logout-link');

    if (dropdownToggle && dropdownContent) {
        // Toggle dropdown on button click
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownToggle.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
            }
        });

        // Handle logout
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }
}

// Login modal functionality
function setupLoginModal() {
    const authLink = document.getElementById('auth-link');
    const modal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const loginForm = document.getElementById('login-form');

    if (authLink && modal) {
        authLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            // Limpiar formularios al cerrar
            if (loginForm) {
                loginForm.reset();
            }
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.reset();
            }
            // Limpiar mensajes de error
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = '';
            }
            const registerErrorMessage = document.getElementById('register-error-message');
            if (registerErrorMessage) {
                registerErrorMessage.textContent = '';
            }
            // Mostrar login container y ocultar register
            const loginContainer = document.getElementById('login-container');
            const registerContainer = document.getElementById('register-container');
            if (loginContainer) loginContainer.style.display = 'block';
            if (registerContainer) registerContainer.style.display = 'none';
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            modal.style.display = 'none';
            // Limpiar formularios al cerrar
            if (loginForm) {
                loginForm.reset();
            }
            const registerForm = document.getElementById('register-form');
            if (registerForm) {
                registerForm.reset();
            }
            // Limpiar mensajes de error
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = '';
            }
            const registerErrorMessage = document.getElementById('register-error-message');
            if (registerErrorMessage) {
                registerErrorMessage.textContent = '';
            }
            // Mostrar login container y ocultar register
            const loginContainer = document.getElementById('login-container');
            const registerContainer = document.getElementById('register-container');
            if (loginContainer) loginContainer.style.display = 'block';
            if (registerContainer) registerContainer.style.display = 'none';
        });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            // Limpiar el formulario al cerrar
            if (loginForm) {
                loginForm.reset();
            }
            // Limpiar mensajes de error
            const errorMessage = document.getElementById('error-message');
            if (errorMessage) {
                errorMessage.textContent = '';
            }
        }
    });
}
// CSS animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
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

    .stock {
        font-size: 0.9rem;
        padding: 0.25rem 0.5rem;
        border-radius: 15px;
        font-weight: 500;
    }

    .in-stock {
        background: #d4edda;
        color: #155724;
    }

    .out-of-stock {
        background: #f8d7da;
        color: #721c24;
    }

    .product-info {
        padding: 0 1.5rem 1rem;
    }

    .mobile-menu-open {
        display: flex !important;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        flex-direction: column;
        padding: 1rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .mobile-menu-open .nav-link {
        margin: 0.5rem 0;
        padding: 1rem;
        border-radius: 10px;
    }

    @media (min-width: 769px) {
        .mobile-menu-toggle {
            display: none !important;
        }
    }
// Legacy functions - kept for compatibility but no longer used
function updateNavbar() {
    // This function is no longer needed as we use the dropdown menu
}

function removeAuthButtons() {
    // This function is no longer needed as we use the dropdown menu
}
`;
document.head.appendChild(style);

// Product details modal functionality
let frontendProducts = []; // Store products for modal
let currentModalProductId = null; // Track current product in modal
let pendingCartProductId = null; // Track product to add after login
let pendingCartQuantity = 1; // Track quantity to add after login

// Función para convertir Markdown básico a HTML
function convertToHTML(markdownText) {
    let html = markdownText;

    // Dividir el texto en líneas para procesar encabezados
    let lines = markdownText.split('\n');
    let htmlLines = [];

    for (let line of lines) {
        let processedLine = line;

        // Convertir encabezados (procesar de más # a menos #)
        if (processedLine.startsWith('###### ')) {
            processedLine = '<h6>' + processedLine.substring(7) + '</h6>';
        } else if (processedLine.startsWith('##### ')) {
            processedLine = '<h5>' + processedLine.substring(6) + '</h5>';
        } else if (processedLine.startsWith('#### ')) {
            processedLine = '<h4>' + processedLine.substring(5) + '</h4>';
        } else if (processedLine.startsWith('### ')) {
            processedLine = '<h3>' + processedLine.substring(4) + '</h3>';
        } else if (processedLine.startsWith('## ')) {
            processedLine = '<h2>' + processedLine.substring(3) + '</h2>';
        } else if (processedLine.startsWith('# ')) {
            processedLine = '<h1>' + processedLine.substring(2) + '</h1>';
        }

        htmlLines.push(processedLine);
    }

    html = htmlLines.join('\n');

    // Convertir negrita (**texto**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convertir cursiva (*texto*)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convertir saltos de línea dobles en párrafos
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Limpiar párrafos vacíos
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<p>/g, '<p>');
    html = html.replace(/<\/p>\s*<\/p>/g, '</p>');

    return html;
}

// Función para mostrar los detalles del producto en el modal
function showProductDetails(productId) {
    // Buscar el producto en el inventario almacenado
    const product = frontendProducts.find(p => p.product_id == productId);

    if (product) {
        currentModalProductId = productId; // Set current product

        // Inyectar los datos en los placeholders del modal
        document.getElementById('product-modal-image').src = product.image_url;
        document.getElementById('product-modal-name').textContent = product.name;
        document.getElementById('product-modal-price').textContent = '$' + product.price.toFixed(2);
        // Rating placeholder - set to 5 stars for now
        document.getElementById('product-rating-stars').setAttribute('data-value', '5');
        // Procesar la descripción con Markdown básico
        document.getElementById('product-modal-description').innerHTML = convertToHTML(product.description);

        // Inicializar cantidad y stock
        const quantityInput = document.getElementById('quantity-input');
        quantityInput.value = 1;
        document.getElementById('available-stock').textContent = `Stock Disponible: ${product.stock_quantity}`;

        // Configurar botones de cantidad
        updateQuantityButtons(product.stock_quantity);

        // Hacer visible el modal
        document.getElementById('product-details-modal').style.display = 'block';

        // Set up add to cart button
        const addToCartBtn = document.getElementById('add-to-cart-modal');
        addToCartBtn.onclick = () => addToCartFromModal(product.product_id);
    } else {
        alert('Producto no encontrado.');
    }
}

// Función para actualizar el estado de los botones de cantidad
function updateQuantityButtons(stock) {
    const quantityInput = document.getElementById('quantity-input');
    const decrementBtn = document.getElementById('decrement-btn');
    const incrementBtn = document.getElementById('increment-btn');
    const currentQuantity = parseInt(quantityInput.value);

    // Deshabilitar decremento si cantidad es 1
    decrementBtn.disabled = currentQuantity <= 1;

    // Deshabilitar incremento si cantidad alcanza el stock
    incrementBtn.disabled = currentQuantity >= stock;
}

// Función para incrementar la cantidad
function incrementQuantity() {
    const quantityInput = document.getElementById('quantity-input');
    const product = frontendProducts.find(p => p.product_id == currentModalProductId);
    if (product) {
        const currentQuantity = parseInt(quantityInput.value);
        if (currentQuantity < product.stock_quantity) {
            quantityInput.value = currentQuantity + 1;
            updateQuantityButtons(product.stock_quantity);
        }
    }
}

// Función para decrementar la cantidad
function decrementQuantity() {
    const quantityInput = document.getElementById('quantity-input');
    const product = frontendProducts.find(p => p.product_id == currentModalProductId);
    if (product) {
        const currentQuantity = parseInt(quantityInput.value);
        if (currentQuantity > 1) {
            quantityInput.value = currentQuantity - 1;
            updateQuantityButtons(product.stock_quantity);
        }
    }
}

// Función para añadir al carrito desde el modal
function addToCartFromModal(productId) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn) {
        // Usuario no ha iniciado sesión
        // Cerrar modal de producto
        document.getElementById('product-details-modal').style.display = 'none';

        // Abrir modal de login
        openLoginModal(productId);

        return;
    }

    // Usuario tiene sesión activa
    const product = frontendProducts.find(p => p.product_id == productId);
    const quantity = parseInt(document.getElementById('quantity-input').value);

    if (product) {
        // Add multiple items to cart
        for (let i = 0; i < quantity; i++) {
            addToCart(product.product_id, product.name, product.price);
        }

        // Close modal after adding
        document.getElementById('product-details-modal').style.display = 'none';

        // Show success notification
        showNotification('✅ ¡Producto añadido al carrito!', 'success');

        // Animate cart icon
        animateCartIcon();
    }
}

// Función para abrir el modal de login
function openLoginModal(productId) {
    pendingCartProductId = productId; // Store the product to add after login
    pendingCartQuantity = parseInt(document.getElementById('quantity-input').value); // Store the quantity
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Función para animar el ícono del carrito
function animateCartIcon() {
    const cartLink = document.querySelector('.dropdown-item[href="/cart"]');
    if (cartLink) {
        cartLink.classList.add('cart-pulsate');
        setTimeout(() => {
            cartLink.classList.remove('cart-pulsate');
        }, 1000);
    }
}

// Set up modal close functionality
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('product-details-modal');
    const closeBtn = document.getElementById('close-product-modal');
    const overlay = document.getElementById('product-modal-overlay');
    const decrementBtn = document.getElementById('decrement-btn');
    const incrementBtn = document.getElementById('increment-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (decrementBtn) {
        decrementBtn.addEventListener('click', decrementQuantity);
    }

    if (incrementBtn) {
        incrementBtn.addEventListener('click', incrementQuantity);
    }

    // Load products into global variable and initialize carousel
    fetch('/api/products/')
        .then(response => response.json())
        .then(products => {
            frontendProducts = products;
            initializeCarousel(products);
        })
        .catch(error => console.error('Error loading products:', error));
});

// Carousel functionality
let currentSlide = 0;
let totalSlides = 0;
let itemsPerSlide = 3; // Default for desktop

function initializeCarousel(products) {
    const carouselTrack = document.getElementById('product-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (!carouselTrack || !prevBtn || !nextBtn) return;

    // Determine items per slide based on screen size
    updateItemsPerSlide();

    // Set total slides
    totalSlides = Math.ceil(products.length / itemsPerSlide);

    // Set CSS custom property for total products
    document.documentElement.style.setProperty('--total-products', products.length);

    // Show/hide arrows based on whether we need navigation
    updateArrowVisibility(products.length);

    // Add event listeners for arrows
    prevBtn.addEventListener('click', () => moveSlide(-1));
    nextBtn.addEventListener('click', () => moveSlide(1));

    // Update on window resize
    window.addEventListener('resize', () => {
        updateItemsPerSlide();
        totalSlides = Math.ceil(products.length / itemsPerSlide);
        updateArrowVisibility(products.length);
        // Reset to first slide on resize
        currentSlide = 0;
        updateCarouselPosition();
    });
}

function updateItemsPerSlide() {
    itemsPerSlide = window.innerWidth <= 768 ? 2 : 3;
}

function updateArrowVisibility(totalProducts) {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (totalProducts <= itemsPerSlide) {
        // Hide arrows if all products fit in one view
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        // Show arrows
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
        updateArrowStates();
    }
}

function updateArrowStates() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    // Disable prev button on first slide
    prevBtn.disabled = currentSlide === 0;
    prevBtn.style.opacity = currentSlide === 0 ? '0.5' : '1';

    // Disable next button on last slide
    nextBtn.disabled = currentSlide >= totalSlides - 1;
    nextBtn.style.opacity = currentSlide >= totalSlides - 1 ? '0.5' : '1';
}

function moveSlide(direction) {
    const newSlide = currentSlide + direction;

    if (newSlide >= 0 && newSlide < totalSlides) {
        currentSlide = newSlide;
        updateCarouselPosition();
        updateArrowStates();
    }
}

function updateCarouselPosition() {
    const carouselTrack = document.getElementById('product-carousel');
    const slideWidth = carouselTrack.children[0]?.offsetWidth + 32; // 32px for gap
    const translateX = -currentSlide * slideWidth * itemsPerSlide;

    carouselTrack.style.transform = `translateX(${translateX}px)`;
}

// Smart Header Functionality
let lastScrollY = 0;
let ticking = false;
let header = null;

function initSmartHeader() {
    header = document.querySelector('header');
    if (!header) return;

    // Initial state
    header.classList.add('header-visible');
    header.classList.add('header-at-top');

    // Add scroll listener with requestAnimationFrame for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function handleScroll() {
    if (!ticking && header) {
        requestAnimationFrame(updateHeaderVisibility);
        ticking = true;
    }
}

function updateHeaderVisibility() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;
    const isAtTop = currentScrollY === 0;
    const minScrollDelta = 10; // Minimum scroll before triggering hide/show

    // Update header state based on scroll position and direction
    if (isAtTop) {
        // At the top - show header
        header.classList.remove('header-hidden');
        header.classList.add('header-visible');
        header.classList.add('header-at-top');
        header.classList.remove('header-glass');
    } else if (scrollDelta > minScrollDelta) {
        // Scrolling down - hide header
        header.classList.add('header-hidden');
        header.classList.remove('header-visible');
        header.classList.remove('header-at-top');
        header.classList.add('header-glass');
    } else if (scrollDelta < -minScrollDelta) {
        // Scrolling up - show header
        header.classList.remove('header-hidden');
        header.classList.add('header-visible');
        header.classList.remove('header-at-top');
        header.classList.add('header-glass');
    }

    lastScrollY = currentScrollY;
    ticking = false;
}

// Initialize smart header when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initSmartHeader();
});