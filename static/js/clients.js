// Clients Management JavaScript

function registerClient(event) {
    event.preventDefault();

    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const cedula = document.getElementById('cedula').value;
    const phone = document.getElementById('phone').value;

    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // Clear messages
    errorMessage.textContent = '';
    successMessage.textContent = '';

    // Validation
    if (!firstName || !lastName || !email || !cedula || !phone) {
        errorMessage.textContent = 'Todos los campos son requeridos.';
        return;
    }

    // Submit to API
    fetch('/api/clients/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'first-name': firstName,
            'last-name': lastName,
            email: email,
            cedula: cedula,
            phone: phone
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Cliente registrado exitosamente') {
                successMessage.textContent = 'Cliente registrado exitosamente. Puede iniciar sesión con la contraseña "123".';
                document.getElementById('client-form').reset();
                setTimeout(() => {
                    successMessage.textContent = '';
                }, 5000);
            } else {
                errorMessage.textContent = data.message;
                setTimeout(() => {
                    errorMessage.textContent = '';
                }, 5000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorMessage.textContent = 'Error de conexión.';
            setTimeout(() => {
                errorMessage.textContent = '';
            }, 5000);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    // Verificar estado del usuario al cargar la página
    checkUserStatus();

    // Configurar todos los menús desplegables
    setupDropdownMenus();

    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        clientForm.addEventListener('submit', registerClient);
    }
});