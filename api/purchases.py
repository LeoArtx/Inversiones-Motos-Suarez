import json
import os
from datetime import datetime
from flask import Blueprint, jsonify, request, session
from database.db import get_db_connection

purchases_bp = Blueprint('purchases', __name__)

PURCHASES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'purchases.json')

def _load_purchases():
    """Load purchases from JSON file"""
    try:
        if os.path.exists(PURCHASES_FILE):
            with open(PURCHASES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        print(f"Error loading purchases: {e}")
        return []

def _save_purchases(purchases):
    """Save purchases to JSON file"""
    try:
        print(f"Saving to {PURCHASES_FILE}")
        with open(PURCHASES_FILE, 'w', encoding='utf-8') as f:
            json.dump(purchases, f, indent=4, ensure_ascii=False)
        print("Save successful")
    except Exception as e:
        print(f"Error saving purchases: {e}")
        import traceback
        traceback.print_exc()

def generate_purchase_id():
    """Generate a unique purchase ID"""
    purchases = _load_purchases()
    if not purchases:
        return "REF-2024-001"

    # Find the highest ID number
    max_id = 0
    for purchase in purchases:
        try:
            # Extract number from ID like "REF-2024-001"
            id_parts = purchase['id'].split('-')
            if len(id_parts) >= 3:
                num = int(id_parts[2])
                max_id = max(max_id, num)
        except (ValueError, IndexError):
            continue

    return f"PUR-2024-{str(max_id + 1).zfill(3)}"

@purchases_bp.route('/test', methods=['GET'])
def test_route():
    print("Test route called")
    return jsonify({'message': 'Test route working'})

@purchases_bp.route('/debug', methods=['GET', 'POST', 'PUT', 'DELETE'])
def debug_route():
    print(f"Debug route called: {request.method} {request.path}")
    print(f"Data: {request.get_data()}")
    return jsonify({'method': request.method, 'path': request.path})

@purchases_bp.route('/', methods=['GET'])
def get_purchases():
    """Get all purchases"""
    try:
        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM purchases ORDER BY purchase_date DESC")
            purchases = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(purchases), 200
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            # Sort by date descending
            purchases.sort(key=lambda x: x.get('purchase_date', ''), reverse=True)
            return jsonify(purchases), 200
    except Exception as e:
        print(f"Error getting purchases: {e}")
        return jsonify({'error': 'Failed to retrieve purchases'}), 500

@purchases_bp.route('/register', methods=['POST'])
def register_purchase():
    """Register a new purchase from frontend"""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or 'cart' not in data or 'user' not in data:
            return jsonify({'error': 'Cart and user data are required'}), 400

        cart = data['cart']
        user = data['user']

        if not cart or len(cart) == 0:
            return jsonify({'error': 'Cart cannot be empty'}), 400

        # Calculate total amount from cart
        total_amount = sum(item.get('price', 0) * item.get('quantity', 1) for item in cart)

        # Generate purchase ID
        purchase_id = generate_purchase_id()

        # Ensure products have image_url
        products = []
        for item in cart:
            product = dict(item)
            if 'image' in product and 'image_url' not in product:
                product['image_url'] = product['image']
            products.append(product)

        # Create purchase object
        purchase = {
            'id': purchase_id,
            'user': user,  # User object from localStorage
            'products': products,  # Cart items with image_url
            'total_amount': total_amount,
            'status': 'Pendiente',
            'purchase_date': datetime.now().isoformat(),
            'payment_proof': data.get('payment_proof', ''),
            'bank_reference': data.get('bank_reference', '')
        }

        # Save to storage
        purchases = _load_purchases()
        purchases.append(purchase)
        _save_purchases(purchases)

        return jsonify({
            'success': True,
            'message': 'Purchase registered successfully',
            'purchase_id': purchase_id,
            'total_amount': total_amount
        }), 201

    except Exception as e:
        print(f"Error registering purchase: {e}")
        return jsonify({'error': 'Failed to register purchase'}), 500

@purchases_bp.route('/user', methods=['GET'])
def get_user_purchases():
    """Get purchases for the logged-in user"""
    try:
        if 'username' not in session:
            return jsonify({'error': 'User not logged in'}), 401

        user_email = session['username']

        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM purchases WHERE JSON_EXTRACT(user, '$.email') = %s ORDER BY purchase_date DESC", (user_email,))
            purchases = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(purchases), 200
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            # Filter by user email
            user_purchases = [p for p in purchases if p.get('user', {}).get('email') == user_email]
            # Sort by date descending
            user_purchases.sort(key=lambda x: x.get('purchase_date', ''), reverse=True)
            return jsonify(user_purchases), 200
    except Exception as e:
        print(f"Error getting user purchases: {e}")
        return jsonify({'error': 'Failed to retrieve user purchases'}), 500

@purchases_bp.route('/admin', methods=['GET'])
def get_admin_purchases():
    """Get all purchases for admin"""
    try:
        if 'role' not in session or session['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM purchases ORDER BY purchase_date DESC")
            purchases = cursor.fetchall()
            cursor.close()
            conn.close()
            return jsonify(purchases), 200
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            # Sort by date descending
            purchases.sort(key=lambda x: x.get('purchase_date', ''), reverse=True)
            return jsonify(purchases), 200
    except Exception as e:
        print(f"Error getting admin purchases: {e}")
        return jsonify({'error': 'Failed to retrieve purchases'}), 500

@purchases_bp.route('/', methods=['POST'])
def create_purchase():
    """Create a new purchase"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['user_id', 'products', 'total_amount']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Generate purchase ID
        purchase_id = generate_purchase_id()

        # Create purchase object
        purchase = {
            'id': purchase_id,
            'user': data['user'],  # User object with name, cedula, phone, email
            'products': data['products'],  # Array of product objects
            'total_amount': data['total_amount'],
            'status': data.get('status', 'Pendiente'),
            'purchase_date': data.get('purchase_date', datetime.now().isoformat()),
            'payment_proof': data.get('payment_proof', ''),
            'bank_reference': data.get('bank_reference', '')
        }

        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO purchases (id, user_id, products, total_amount, status, purchase_date, payment_proof, bank_reference)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                purchase['id'],
                data['user_id'],
                json.dumps(purchase['products']),
                purchase['total_amount'],
                purchase['status'],
                purchase['purchase_date'],
                purchase['payment_proof'],
                purchase['bank_reference']
            ))
            conn.commit()
            cursor.close()
            conn.close()
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            purchases.append(purchase)
            _save_purchases(purchases)

        return jsonify({
            'success': True,
            'message': 'Purchase created successfully',
            'purchase': purchase
        }), 201

    except Exception as e:
        print(f"Error creating purchase: {e}")
        return jsonify({'error': 'Failed to create purchase'}), 500

@purchases_bp.route('/<purchase_id>', methods=['DELETE'])
def delete_purchase(purchase_id):
    """Delete a purchase by ID"""
    try:
        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor()
            cursor.execute("DELETE FROM purchases WHERE id = %s", (purchase_id,))
            deleted = cursor.rowcount > 0
            conn.commit()
            cursor.close()
            conn.close()

            if not deleted:
                return jsonify({'error': 'Purchase not found'}), 404
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            initial_length = len(purchases)
            purchases = [p for p in purchases if p['id'] != purchase_id]

            if len(purchases) == initial_length:
                return jsonify({'error': 'Purchase not found'}), 404

            _save_purchases(purchases)

        return jsonify({
            'success': True,
            'message': 'Purchase deleted successfully'
        }), 200

    except Exception as e:
        print(f"Error deleting purchase: {e}")
        return jsonify({'error': 'Failed to delete purchase'}), 500

@purchases_bp.route('/update_status', methods=['PUT'])
def update_purchase_status():
    """Update purchase status"""
    try:
        # Parse JSON data manually
        import json
        raw_data = request.data.decode('utf-8')
        print(f"Raw request data: '{raw_data}'")
        try:
            data = json.loads(raw_data)
        except Exception as e:
            print(f"JSON parse error: {e}")
            return jsonify({'error': 'Invalid JSON data'}), 400

        if not data or 'status' not in data or 'purchase_id' not in data:
            return jsonify({'error': 'Status and purchase_id fields are required'}), 400

        purchase_id = data['purchase_id']
        new_status = data['status']

        # Fallback to JSON file (since database connection fails)
        purchases = _load_purchases()
        purchase_found = False

        for purchase in purchases:
            if purchase['id'] == purchase_id:
                purchase['status'] = new_status
                purchase_found = True
                break

        if not purchase_found:
            return jsonify({'error': 'Purchase not found'}), 404

        _save_purchases(purchases)

        return jsonify({
            'success': True,
            'message': 'Purchase status updated successfully'
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to update purchase status: {str(e)}'}), 500

@purchases_bp.route('/reports', methods=['GET'])
def get_reports():
    """Get purchases filtered by date range for reports"""
    try:
        if 'role' not in session or session['role'] != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not start_date or not end_date:
            return jsonify({'error': 'start_date and end_date are required'}), 400

        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        if start_dt > end_dt:
            return jsonify({'error': 'start_date cannot be after end_date'}), 400

        conn = get_db_connection()
        if conn:
            # If database is available, use it
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT * FROM purchases
                WHERE DATE(purchase_date) BETWEEN %s AND %s
                ORDER BY purchase_date DESC
            """, (start_date, end_date))
            purchases = cursor.fetchall()
            cursor.close()
            conn.close()
        else:
            # Fallback to JSON file
            purchases = _load_purchases()
            # Filter by date range
            filtered_purchases = []
            for purchase in purchases:
                purchase_date_str = purchase.get('purchase_date', '')
                if purchase_date_str:
                    try:
                        purchase_dt = datetime.fromisoformat(purchase_date_str.split('T')[0])  # Get date part
                        if start_dt.date() <= purchase_dt.date() <= end_dt.date():
                            filtered_purchases.append(purchase)
                    except ValueError:
                        continue
            purchases = filtered_purchases
            # Sort by date descending
            purchases.sort(key=lambda x: x.get('purchase_date', ''), reverse=True)

        return jsonify(purchases), 200

    except Exception as e:
        print(f"Error getting reports: {e}")
        return jsonify({'error': 'Failed to retrieve reports'}), 500