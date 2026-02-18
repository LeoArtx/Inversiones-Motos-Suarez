import json
import os
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from config import Config

from api.auth import auth_bp
from api.products import products_bp
from api.billing import billing_bp
from api.clients import clients_bp
from api.purchases import purchases_bp
from api.users import users_bp

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config.from_object(Config)

# Configuración de sesiones/cookies seguras
app.secret_key = app.config['SECRET_KEY']

# Registro de Blueprints (Módulos API)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(billing_bp, url_prefix='/api/billing')
app.register_blueprint(clients_bp, url_prefix='/api/clients')
app.register_blueprint(purchases_bp, url_prefix='/api/purchases')
app.register_blueprint(users_bp, url_prefix='/api/users')
print("Purchases blueprint registered")

# Error handlers to return JSON instead of HTML
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# --- Rutas del Frontend (Renderizado de plantillas) ---

@app.route('/')
def index():
    # Load products for frontend display
    products = []
    if os.path.exists('products.json'):
        with open('products.json', 'r', encoding='utf-8') as f:
            all_products = json.load(f)
            # Filter active products (for now, assume all are active since no status field)
            products = [p for p in all_products if p.get('status', 'active') == 'active']
            # Sort by ID descending for most recent
            products.sort(key=lambda x: x['product_id'], reverse=True)
            # Limit to, say, 6 products
            products = products[:6]
    return render_template('index.html', products=products)

@app.route('/cart')
def cart_page():
    return render_template('cart.html')

@app.route('/payment')
def payment_page():
    return render_template('payment.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register_page():
    return render_template('register.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    #Autenticación y Autorización basada en roles aquí**
    # Si session.get('role') == 'administrador':
    return render_template('admin/dashboard.html')
    # else:
    # return redirect(url_for('login_page'))

@app.route('/admin_index')
def admin_index():
    return render_template('admin/admin_index.html')

@app.route('/admin/billing')
def admin_billing():
    return render_template('admin/billing.html')

@app.route('/admin/clients')
def admin_clients():
    return render_template('admin/clients.html')

@app.route('/admin/products')
def admin_products():
    return render_template('admin/products.html')

@app.route('/admin/products_management')
def admin_products_management():
    return render_template('admin/products_management.html')

@app.route('/payment')
def payment():
    return render_template('payment.html')

@app.route('/admin/purchases')
def admin_purchases():
    return render_template('admin/purchases.html')

@app.route('/admin/reports')
def admin_reports():
    return render_template('admin/reports.html')

@app.route('/profile')
def profile_page():
    return render_template('profile.html')

@app.route('/my-purchases')
def my_purchases_page():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('my_purchases.html')

@app.route('/api/my-purchases')
def api_my_purchases():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    user_email = session.get('username')
    purchases = []
    if os.path.exists('purchases.json'):
        with open('purchases.json', 'r', encoding='utf-8') as f:
            all_purchases = json.load(f)
            purchases = [p for p in all_purchases if p.get('user', {}).get('email') == user_email]
            # Sort by most recent first
            purchases.sort(key=lambda x: x.get('purchase_date', ''), reverse=True)
    return jsonify(purchases)

@app.route('/catalog')
def catalog_page():
    # Load all products for catalog display
    products = []
    if os.path.exists('products.json'):
        with open('products.json', 'r', encoding='utf-8') as f:
            all_products = json.load(f)
            # Filter active products
            products = [p for p in all_products if p.get('status', 'active') == 'active']
            # Sort by ID descending for most recent
            products.sort(key=lambda x: x['product_id'], reverse=True)
    return render_template('catalog.html', products=products)

if __name__ == '__main__':
    # Usar debug=True solo para desarrollo
    app.run(debug=True)