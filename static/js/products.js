// Products Display JavaScript

let productsInventory = []; // Variable global para almacenar el inventario de productos

// Función para convertir Markdown básico a HTML
function convertToHTML(markdownText) {
    if (!markdownText) return '';

    // Dividir el texto en líneas
    let lines = markdownText.split('\n');
    let htmlLines = [];
    let inParagraph = false;

    for (let line of lines) {
        let trimmedLine = line.trim();

        // Si la línea está vacía, cerrar párrafo si estaba abierto
        if (trimmedLine === '') {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            continue;
        }

        // Procesar encabezados
        if (trimmedLine.startsWith('###### ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h6>' + trimmedLine.substring(7) + '</h6>');
        } else if (trimmedLine.startsWith('##### ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h5>' + trimmedLine.substring(6) + '</h5>');
        } else if (trimmedLine.startsWith('#### ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h4>' + trimmedLine.substring(5) + '</h4>');
        } else if (trimmedLine.startsWith('### ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h3>' + trimmedLine.substring(4) + '</h3>');
        } else if (trimmedLine.startsWith('## ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h2>' + trimmedLine.substring(3) + '</h2>');
        } else if (trimmedLine.startsWith('# ')) {
            if (inParagraph) {
                htmlLines.push('</p>');
                inParagraph = false;
            }
            htmlLines.push('<h1>' + trimmedLine.substring(2) + '</h1>');
        } else {
            // Texto normal - manejar como párrafo
            if (!inParagraph) {
                htmlLines.push('<p>');
                inParagraph = true;
            }
            // Aplicar formato en línea (negrita, cursiva) a esta línea
            let formattedLine = trimmedLine;
            formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
            htmlLines.push(formattedLine);
        }
    }

    // Cerrar el último párrafo si estaba abierto
    if (inParagraph) {
        htmlLines.push('</p>');
    }

    let html = htmlLines.join('\n');

    // Limpiar párrafos vacíos
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    // Cargar el inventario de productos
    loadProductInventory();

    // Event listeners para el modal
    setupModal();
});

// Función para cargar el inventario de productos
async function loadProductInventory() {
    try {
        const response = await fetch('/api/products/');
        const products = await response.json();

        // Almacenar el inventario globalmente
        productsInventory = products;

        const tableBody = document.getElementById('products-table-body');
        const noProductsMessage = document.getElementById('no-products-message');
        const productTableContainer = document.getElementById('product-table-container');

        tableBody.innerHTML = ''; // Limpiar contenido anterior

        if (!products || products.length === 0) {
            // Mostrar mensaje de vacío
            noProductsMessage.style.display = 'block';
            productTableContainer.style.display = 'none';
        } else {
            // Ocultar mensaje y mostrar tabla
            noProductsMessage.style.display = 'none';
            productTableContainer.style.display = 'block';

            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.product_id}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>$${product.price.toFixed(2)}</td>
                    <td>${product.stock_quantity}</td>
                    <td class="actions-cell">
                        <button class="action-btn details-btn" data-product-id="${product.product_id}" title="Ver Detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete-btn" data-product-id="${product.product_id}" title="Eliminar Producto">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error al cargar el inventario de productos:', error);
        // En caso de error, mostrar mensaje de vacío
        document.getElementById('no-products-message').style.display = 'block';
        document.getElementById('product-table-container').style.display = 'none';
    }
}

// Función para configurar el modal
function setupModal() {
    const modal = document.getElementById('product-modal');
    const closeBtn = document.getElementById('close-modal');
    const overlay = document.getElementById('modal-overlay');

    // Cerrar modal al hacer clic en la X
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Cerrar modal al hacer clic en el fondo
    overlay.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Event delegation para botones de detalles y eliminar
    document.addEventListener('click', (event) => {
        if (event.target.closest('.details-btn')) {
            const button = event.target.closest('.details-btn');
            const productId = button.getAttribute('data-product-id');
            showProductDetails(productId);
        } else if (event.target.closest('.delete-btn')) {
            const button = event.target.closest('.delete-btn');
            const productId = button.getAttribute('data-product-id');
            deleteProduct(productId);
        }
    });
}

// Función para mostrar los detalles del producto en el modal
function showProductDetails(productId) {
    // Buscar el producto en el inventario almacenado
    const product = productsInventory.find(p => p.product_id == productId);

    if (product) {
        // Inyectar los datos en los placeholders del modal
        document.getElementById('modal-product-image').src = product.image_url;
        document.getElementById('modal-product-name').textContent = product.name;
        document.getElementById('modal-product-price').textContent = product.price.toFixed(2);
        document.getElementById('modal-product-stock').textContent = product.stock_quantity;
        document.getElementById('modal-product-category').textContent = product.category;
        // Procesar la descripción con Markdown básico
        document.getElementById('modal-product-description').innerHTML = convertToHTML(product.description);

        // Hacer visible el modal
        document.getElementById('product-modal').style.display = 'block';
    } else {
        alert('Producto no encontrado.');
    }
}

// Función para eliminar un producto
async function deleteProduct(productId) {
    if (confirm('¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.')) {
        try {
            const response = await fetch(`/api/products/delete/${productId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                alert('Producto eliminado exitosamente');
                // Recargar el inventario
                loadProductInventory();
            } else {
                alert('Error al eliminar el producto: ' + data.message);
            }
        } catch (error) {
            console.error('Error al eliminar el producto:', error);
            alert('Error al eliminar el producto');
        }
    }
}