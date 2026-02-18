// Función para cargar usuarios desde localStorage y users.json
async function loadUsers() {
    // Primero cargar desde localStorage
    let users = JSON.parse(localStorage.getItem('users')) || [];

    return users;
}

// Cargar usuarios al inicio
let users = [];
loadUsers().then(loadedUsers => {
    users = loadedUsers;
});

// Función para manejar el envío del formulario de login
function setupLoginForm() {
    const loginForm = document.querySelector('.login-form');
    const modal = document.getElementById('login-modal');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevenir el envío por defecto

            // Capturar los valores de los campos
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');

            try {
                // First, check localStorage users
                const localUsers = JSON.parse(localStorage.getItem('users')) || [];
                const localUser = localUsers.find(u => u.email === email && u.password === password);

                if (localUser) {
                    // Login from localStorage
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userRole', localUser.role);
                    const activeUser = {
                        first_name: localUser.first_name,
                        last_name: localUser.last_name,
                        email: localUser.email,
                        cedula: localUser.cedula || '',
                        phone: localUser.phone,
                        role: localUser.role
                    };
                    localStorage.setItem('activeUser', JSON.stringify(activeUser));

                    // Cerrar el modal
                    if (modal) {
                        modal.style.display = 'none';
                    }

                    // Limpiar el formulario
                    loginForm.reset();

                    // Actualizar la barra de navegación del usuario
                    updateUserNavbar();

                    // Check if there's a pending product to add to cart
                    if (window.pendingCartProductId) {
                        // Add the product to cart
                        const product = window.frontendProducts?.find(p => p.product_id == window.pendingCartProductId);
                        if (product) {
                            // Add multiple items to cart based on stored quantity
                            for (let i = 0; i < window.pendingCartQuantity; i++) {
                                window.addToCart(product.product_id, product.name, product.price);
                            }
                            // Show success notification
                            window.showNotification('✅ ¡Producto añadido al carrito!', 'success');
                            // Animate cart icon
                            window.animateCartIcon();
                        }
                        // Clear the pending product
                        window.pendingCartProductId = null;
                        window.pendingCartQuantity = 1;
                    } else {
                        // Redirección basada en el rol
                        if (localUser.role === 'admin') {
                            window.location.href = '/admin_index';
                        } else {
                            // Recargar la página para actualizar el estado
                            window.location.reload();
                        }
                    }
                    return;
                }

                // If not in localStorage, try API
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Login exitoso
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userRole', data.role);
                    if (data.user) {
                        const activeUser = {
                            first_name: data.user.first_name,
                            last_name: data.user.last_name,
                            email: data.user.email,
                            cedula: data.user.cedula || '',
                            phone: data.user.phone,
                            role: data.role
                        };
                        localStorage.setItem('activeUser', JSON.stringify(activeUser));
                    }

                    // Cerrar el modal
                    if (modal) {
                        modal.style.display = 'none';
                    }

                    // Limpiar el formulario
                    loginForm.reset();

                    // Actualizar la barra de navegación del usuario
                    updateUserNavbar();

                    // Check if there's a pending product to add to cart
                    if (window.pendingCartProductId) {
                        // Add the product to cart
                        const product = window.frontendProducts?.find(p => p.product_id == window.pendingCartProductId);
                        if (product) {
                            // Add multiple items to cart based on stored quantity
                            for (let i = 0; i < window.pendingCartQuantity; i++) {
                                window.addToCart(product.product_id, product.name, product.price);
                            }
                            // Show success notification
                            window.showNotification('✅ ¡Producto añadido al carrito!', 'success');
                            // Animate cart icon
                            window.animateCartIcon();
                        }
                        // Clear the pending product
                        window.pendingCartProductId = null;
                        window.pendingCartQuantity = 1;
                    } else {
                        // Redirección basada en el rol
                        if (data.role === 'admin') {
                            window.location.href = '/admin_index';
                        } else {
                            // Recargar la página para actualizar el estado
                            window.location.reload();
                        }
                    }
                } else {
                    // Error de login
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Error en el login.';
                        // Limpiar el mensaje después de 5 segundos
                        setTimeout(() => {
                            errorMessage.textContent = '';
                        }, 5000);
                    }
                }
            } catch (error) {
                console.error('Error during login:', error);
                if (errorMessage) {
                    errorMessage.textContent = 'Error de conexión.';
                    setTimeout(() => {
                        errorMessage.textContent = 'Error de conexión.';
                        setTimeout(() => {
                            errorMessage.textContent = '';
                        }, 5000);
                    }, 5000);
                }
            }
        });
    }
}

// Función centralizada para actualizar la barra de navegación del usuario
function updateUserNavbar() {
    // Obtener el nombre del usuario y el rol desde localStorage
    const userName = JSON.parse(localStorage.getItem('activeUser') || '{}').first_name || 'Usuario';
    const userRole = localStorage.getItem('userRole') || '';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // Seleccionar los elementos
    const userGreeting = document.getElementById('user-greeting');
    const userDropdown = document.getElementById('user-dropdown');
    const authLink = document.getElementById('auth-link');
    const adminLink = document.getElementById('admin-link');

    if (isLoggedIn) {
        // Ocultar #auth-link
        if (authLink) {
            authLink.style.display = 'none';
        }

        // Mostrar #user-dropdown
        if (userDropdown) {
            userDropdown.style.display = 'flex';
        }

        // Mostrar el enlace de admin si el rol es administrador
        if (adminLink && userRole === 'administrador') {
            adminLink.style.display = 'flex';
        }

        // Insertar el texto "Hola, [Nombre]" dentro de #user-greeting
        if (userGreeting) {
            userGreeting.innerHTML = `
                <i class="fas fa-hand-sparkles" style="margin-right: 5px;"></i>
                ¡Hola, ${userName}!
            `;
            userGreeting.style.visibility = 'visible';
        }

    } else {
        // Mostrar #auth-link
        if (authLink) {
            authLink.style.display = 'flex';
        }

        // Ocultar #user-dropdown
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }

        // Ocultar enlace de admin
        if (adminLink) {
            adminLink.style.display = 'none';
        }

        // Limpiar el contenido de #user-greeting
        if (userGreeting) {
            userGreeting.innerHTML = '';
            userGreeting.style.visibility = 'hidden';
        }
    }
}

// Función para manejar el logout
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');

    window.location.href = '/';
}

// Función para manejar el logout en todas las páginas
function setupLogoutListeners() {
    // Buscar todos los elementos con id logout-link
    const logoutLinks = document.querySelectorAll('#logout-link');

    logoutLinks.forEach(link => {
        // Remover event listeners existentes para evitar duplicados
        link.replaceWith(link.cloneNode(true));
    });

    // Volver a buscar los elementos después del clone
    const freshLogoutLinks = document.querySelectorAll('#logout-link');

    freshLogoutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    });

    // También buscar por clase por si hay múltiples elementos
    const logoutButtons = document.querySelectorAll('.logout-btn');

    logoutButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    });
}

// Función para manejar el envío del formulario de registro
function setupRegisterForm() {
    const registerForm = document.querySelector('.register-form');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');

    if (registerForm) {
        registerForm.addEventListener('submit', async function (event) {
            event.preventDefault(); // Prevenir el envío por defecto

            // Capturar los valores de los campos
            const firstName = document.getElementById('register-first-name').value.trim();
            const lastName = document.getElementById('register-last-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const idCard = document.getElementById('register-id-card').value.trim();
            const phone = document.getElementById('register-phone').value.trim();
            const password = document.getElementById('register-password').value.trim();
            const errorMessage = document.getElementById('register-error-message');

            // Validación: Verificar que ningún campo esté vacío
            if (!firstName || !lastName || !email || !idCard || !phone || !password) {
                errorMessage.textContent = 'Todos los campos son obligatorios.';
                setTimeout(() => errorMessage.textContent = '', 5000);
                return;
            }

            // Validación: Formato de correo electrónico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errorMessage.textContent = 'Por favor, ingresa un correo electrónico válido.';
                setTimeout(() => errorMessage.textContent = '', 5000);
                return;
            }

            try {
                // Enviar los datos mediante una petición POST
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        id_card: idCard,
                        phone: phone,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Registro exitoso
                    errorMessage.style.color = 'green';
                    errorMessage.textContent = data.message;

                    // Ocultar el contenedor de registro
                    if (registerContainer) {
                        registerContainer.style.display = 'none';
                    }

                    // Limpiar el formulario
                    registerForm.reset();

                    // Mostrar notificación de éxito
                    window.showNotification('✅ ' + data.message, 'success');

                    // Mostrar el contenedor de login
                    if (loginContainer) {
                        loginContainer.style.display = 'block';
                    }

                    // Limpiar el mensaje después de 5 segundos
                    setTimeout(() => {
                        errorMessage.textContent = '';
                        errorMessage.style.color = 'red';
                    }, 5000);
                } else {
                    // Error en el registro
                    errorMessage.textContent = data.message;
                    setTimeout(() => errorMessage.textContent = '', 5000);
                }
            } catch (error) {
                console.error('Error during registration:', error);
                errorMessage.textContent = 'Error de conexión.';
                setTimeout(() => errorMessage.textContent = '', 5000);
            }
        });
    }
}

// Función para manejar la alternancia entre formularios de login y registro
function setupFormToggles() {
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', function (event) {
            event.preventDefault();
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'block';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', function (event) {
            event.preventDefault();
            registerContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        });
    }
}


// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    setupLoginForm();
    setupRegisterForm();
    setupFormToggles();
    setupLogoutListeners();

    // Actualizar la barra de navegación del usuario al cargar la página
    updateUserNavbar();
});