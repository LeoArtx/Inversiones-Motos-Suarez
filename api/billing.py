import json
import os
from flask import Blueprint, request, jsonify
from datetime import datetime

billing_bp = Blueprint('billing', __name__)

# File path for storing billing data
BILLING_DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'billing_data.json')

def load_billing_data():
    """Load billing data from JSON file"""
    if os.path.exists(BILLING_DATA_FILE):
        try:
            with open(BILLING_DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_billing_data(data):
    """Save billing data to JSON file"""
    with open(BILLING_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@billing_bp.route('/create', methods=['POST'])
def create_billing():
    try:
        # Get form data
        invoice_date = request.form.get('invoice_date')
        client_cedula = request.form.get('client_cedula')
        client_name = request.form.get('client_name')
        client_phone = request.form.get('client_phone')
        client_email = request.form.get('client_email')
        product_name = request.form.get('product_name')
        quantity = request.form.get('quantity')
        unit_price = request.form.get('unit_price')
        total = request.form.get('total')

        # Validate required fields
        if not all([invoice_date, client_cedula, client_name, client_phone, client_email, product_name, quantity, unit_price, total]):
            return jsonify({'success': False, 'message': 'Todos los campos son requeridos'}), 400

        # Validate data types and lengths
        try:
            client_cedula = int(client_cedula)
            if len(str(client_cedula)) > 8:
                return jsonify({'success': False, 'message': 'Cédula debe tener máximo 8 dígitos'}), 400

            quantity = int(quantity)
            if len(str(quantity)) > 3:
                return jsonify({'success': False, 'message': 'Cantidad debe tener máximo 3 dígitos'}), 400

            unit_price = float(unit_price)
            total = float(total)

            if len(client_name) > 30:
                return jsonify({'success': False, 'message': 'Nombre del cliente debe tener máximo 30 caracteres'}), 400

            # Validate phone number (11 digits)
            if len(str(client_phone)) != 11 or not str(client_phone).isdigit():
                return jsonify({'success': False, 'message': 'Número de teléfono debe tener exactamente 11 dígitos'}), 400

            # Validate email format and length
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if len(client_email) > 255:
                return jsonify({'success': False, 'message': 'Correo electrónico debe tener máximo 255 caracteres'}), 400
            if not re.match(email_pattern, client_email):
                return jsonify({'success': False, 'message': 'Formato de correo electrónico inválido'}), 400

            if len(product_name) > 50:
                return jsonify({'success': False, 'message': 'Nombre del producto debe tener máximo 50 caracteres'}), 400

        except ValueError:
            return jsonify({'success': False, 'message': 'Datos numéricos inválidos'}), 400

        # Load existing billing data
        billing_data = load_billing_data()

        # Create new billing record
        new_billing = {
            'billing_id': len(billing_data) + 1,
            'invoice_date': invoice_date,
            'client_cedula': client_cedula,
            'client_name': client_name,
            'client_phone': client_phone,
            'client_email': client_email,
            'product_name': product_name,
            'quantity': quantity,
            'unit_price': unit_price,
            'total': total,
            'created_at': datetime.now().isoformat()
        }

        # Add to billing data
        billing_data.append(new_billing)

        # Save to file
        save_billing_data(billing_data)

        return jsonify({'success': True, 'message': 'Factura creada exitosamente'}), 201

    except Exception as e:
        print(f"Error creating billing: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

@billing_bp.route('/latest_sales', methods=['GET'])
def get_latest_sales():
    try:
        # Load billing data from JSON file
        billing_data = load_billing_data()

        # Sort by creation date (most recent first) and get last 10
        sorted_billing = sorted(billing_data, key=lambda x: x.get('created_at', ''), reverse=True)
        latest_sales = sorted_billing[:10]

        # Format data for the table
        sales_list = []
        for sale in latest_sales:
            sales_list.append({
                'id': sale.get('billing_id', 0),
                'fecha': sale.get('invoice_date', ''),
                'cedula_cliente': str(sale.get('client_cedula', '')),
                'nombre_cliente': sale.get('client_name', ''),
                'telefono_cliente': str(sale.get('client_phone', '')),
                'correo_cliente': sale.get('client_email', ''),
                'cantidad_total': sale.get('quantity', 0),
                'total_factura': float(sale.get('total', 0))
            })

        return jsonify({'success': True, 'sales': sales_list}), 200

    except Exception as e:
        print(f"Error getting latest sales: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500

@billing_bp.route('/delete/<int:billing_id>', methods=['DELETE'])
def delete_billing(billing_id):
    try:
        # Load billing data from JSON file
        billing_data = load_billing_data()

        # Find and remove the billing record
        updated_data = [bill for bill in billing_data if bill.get('billing_id') != billing_id]

        if len(updated_data) == len(billing_data):
            return jsonify({'success': False, 'message': 'Factura no encontrada'}), 404

        # Save updated data
        save_billing_data(updated_data)

        return jsonify({'success': True, 'message': 'Factura eliminada exitosamente'}), 200

    except Exception as e:
        print(f"Error deleting billing: {e}")
        return jsonify({'success': False, 'message': 'Error interno del servidor'}), 500