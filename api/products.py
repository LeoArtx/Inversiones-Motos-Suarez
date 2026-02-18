import os
import json
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from database.db import get_db_connection

products_bp = Blueprint('products', __name__)

PRODUCTS_FILE = 'products.json'

def load_products():
    if os.path.exists(PRODUCTS_FILE):
        with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_products(products):
    with open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=4, ensure_ascii=False)

@products_bp.route('/', methods=['GET'])
def get_products():
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Products")
        products = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(products), 200
    else:
        # Load from JSON
        products = load_products()
        return jsonify(products), 200

@products_bp.route('/register', methods=['POST'])
def register_product():
    try:
        # Get form data
        name = request.form.get('name')
        price = float(request.form.get('price'))
        stock_quantity = int(request.form.get('stock_quantity'))
        description = request.form.get('description')
        category = request.form.get('category')

        # Handle image upload
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image file provided'}), 400
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'success': False, 'message': 'No image selected'}), 400

        # Secure filename and save
        filename = secure_filename(image_file.filename)
        # Generate unique filename if needed, but for simplicity, use as is
        image_path = os.path.join(current_app.root_path, 'static', 'img', 'products', filename)
        image_file.save(image_path)
        image_url = f'/static/img/products/{filename}'

        # Load existing products
        products = load_products()

        # Generate new ID
        if products:
            new_id = max(p['product_id'] for p in products) + 1
        else:
            new_id = 1

        # Create new product
        new_product = {
            'product_id': new_id,
            'name': name,
            'description': description,
            'price': price,
            'stock_quantity': stock_quantity,
            'category': category,
            'image_url': image_url
        }

        # Add to list and save
        products.append(new_product)
        save_products(products)

        return jsonify({'success': True, 'message': 'Producto registrado exitosamente', 'product': new_product}), 201

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@products_bp.route('/exchange-rate', methods=['GET'])
def get_exchange_rate():
    # Simulate exchange rate similar to pyBCV
    # In a real implementation, this would fetch from an API
    # For now, return a fixed rate (USD to VES)
    exchange_rate = 355.55  # Example rate
    return jsonify({'rate': exchange_rate}), 200

@products_bp.route('/delete/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        # Load existing products
        products = load_products()

        # Find and remove the product
        product_index = None
        for i, product in enumerate(products):
            if product['product_id'] == product_id:
                product_index = i
                break

        if product_index is None:
            return jsonify({'success': False, 'message': 'Producto no encontrado'}), 404

        # Remove the product
        deleted_product = products.pop(product_index)

        # Save updated products
        save_products(products)

        return jsonify({'success': True, 'message': 'Producto eliminado exitosamente', 'product': deleted_product}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500