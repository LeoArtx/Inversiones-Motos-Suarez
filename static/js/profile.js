// Profile JavaScript

document.addEventListener('DOMContentLoaded', function () {
    loadUserProfile();
});

function loadUserProfile() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        alert('No has iniciado sesión. Redirigiendo a la página de inicio de sesión.');
        window.location.href = '/login';
        return;
    }

    const activeUserStr = localStorage.getItem('activeUser');
    if (!activeUserStr) {
        alert('Datos del usuario no encontrados. Por favor, inicia sesión nuevamente.');
        window.location.href = '/login';
        return;
    }

    const activeUser = JSON.parse(activeUserStr);
    const userName = `${activeUser.first_name} ${activeUser.last_name}`;

    const tableBody = document.querySelector('#user-data-table tbody');

    // Nombre Completo
    const row1 = document.createElement('tr');
    row1.innerHTML = `
        <td class="label">Nombre Completo</td>
        <td class="value">${userName}</td>
    `;
    tableBody.appendChild(row1);

    // Correo Electrónico
    const row2 = document.createElement('tr');
    row2.innerHTML = `
        <td class="label">Correo Electrónico</td>
        <td class="value">${activeUser.email}</td>
    `;
    tableBody.appendChild(row2);

    // Número de Teléfono
    const row3 = document.createElement('tr');
    row3.innerHTML = `
        <td class="label">Número de Teléfono</td>
        <td class="value">${activeUser.phone}</td>
    `;
    tableBody.appendChild(row3);

    // Cédula de Identidad
    const row4 = document.createElement('tr');
    row4.innerHTML = `
        <td class="label">Cédula de Identidad</td>
        <td class="value">${activeUser.cedula}</td>
    `;
    tableBody.appendChild(row4);
}