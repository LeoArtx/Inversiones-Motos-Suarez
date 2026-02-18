-- 1. Tabla de Usuarios (Clientes y Administradores)
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Almacenamiento seguro del hash
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('cliente', 'administrador') NOT NULL DEFAULT 'cliente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías de Productos
CREATE TABLE Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Tabla de Productos
CREATE TABLE Products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL,
    category_id INT,
    image_url VARCHAR(255),
    FOREIGN KEY (category_id) REFERENCES Categories(category_id) ON DELETE SET NULL
);
-- Añadir índice para búsqueda rápida
CREATE INDEX idx_product_name ON Products(name);


-- 4. Tabla de Pedidos (Órdenes)
CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado') NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 5. Tabla de Detalles del Pedido (Items de la Orden)
CREATE TABLE OrderDetails (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE SET NULL
);

-- 6. Tabla de Valoraciones y Reseñas
CREATE TABLE Reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    user_id INT,
    rating TINYINT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 7. Tabla de Facturación
CREATE TABLE Billing (
    billing_id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_date DATE NOT NULL,
    client_cedula INT(8) NOT NULL,
    client_name VARCHAR(30) NOT NULL,
    product_name VARCHAR(50) NOT NULL,
    quantity INT(3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);