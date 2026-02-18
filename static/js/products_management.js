// Products Management JavaScript

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Form submission
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmission);
    }
});

// Función para manejar el envío del formulario
async function handleProductSubmission(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('product-name').value);
    formData.append('price', document.getElementById('product-price').value);
    formData.append('stock_quantity', document.getElementById('product-stock').value);
    formData.append('description', document.getElementById('product-description').value);
    formData.append('category', document.getElementById('product-category').value);
    formData.append('image', document.getElementById('product-image').files[0]);

    try {
        const response = await fetch('/api/products/register', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('success-message').textContent = data.message;
            document.getElementById('error-message').textContent = '';
            // Limpiar formulario
            document.getElementById('product-form').reset();
        } else {
            document.getElementById('error-message').textContent = data.message;
            document.getElementById('success-message').textContent = '';
        }
    } catch (error) {
        console.error('Error al registrar producto:', error);
        document.getElementById('error-message').textContent = 'Error al registrar el producto.';
        document.getElementById('success-message').textContent = '';
    }
}