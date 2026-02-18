from flask import Blueprint, request, jsonify
import bcrypt
import json
import os

clients_bp = Blueprint('clients', __name__)

# Función de ayuda para hashear
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Función para cargar usuarios desde JSON
def load_users():
    # Try static/data/users.json first (primary location)
    if os.path.exists('static/data/users.json'):
        with open('static/data/users.json', 'r') as f:
            return json.load(f)
    # Fallback to root users.json
    elif os.path.exists('users.json'):
        with open('users.json', 'r') as f:
            return json.load(f)
    return {"users": []}

# Función para guardar usuarios en JSON
def save_users(data):
    # Save to static/data/users.json (primary)
    with open('static/data/users.json', 'w') as f:
        json.dump(data, f, indent=4)
    # Also save to root users.json for backup
    with open('users.json', 'w') as f:
        json.dump(data, f, indent=4)

# Endpoint: /api/clients/register
@clients_bp.route('/register', methods=['POST'])
def register_client():
    data = request.get_json()
    first_name = data.get('first-name')
    last_name = data.get('last-name')
    email = data.get('email')
    cedula = data.get('cedula')
    phone = data.get('phone')

    if not all([first_name, last_name, email, cedula, phone]):
        return jsonify({"message": "Faltan datos requeridos"}), 400

    users_data = load_users()

    # Check if email or cedula already exists
    for user in users_data['users']:
        if user['email'] == email:
            return jsonify({"message": "El correo electrónico ya está registrado"}), 400
        if user.get('cedula') == cedula:
            return jsonify({"message": "La cédula de identidad ya está registrada"}), 400

    # Hash default password
    hashed_password = hash_password('123')

    new_client = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "cedula": cedula,
        "phone": phone,
        "password_hash": hashed_password.decode('utf-8'),
        "role": "client"
    }

    users_data['users'].append(new_client)
    save_users(users_data)

    return jsonify({"message": "Cliente registrado exitosamente"}), 201

# Endpoint: /api/clients (GET) - List all clients
@clients_bp.route('', methods=['GET'])
def get_clients():
    users_data = load_users()
    # Include both 'client' and 'cliente' roles
    clients = [user for user in users_data['users'] if user.get('role') in ['client', 'cliente']]
    return jsonify(clients), 200

# Endpoint: /api/clients/<cedula> (PUT) - Update client
@clients_bp.route('/<cedula>', methods=['PUT'])
def update_client(cedula):
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    role = data.get('role', 'cliente')  # Default to 'cliente'

    if not all([first_name, last_name, email, phone]):
        return jsonify({"message": "Faltan datos requeridos"}), 400

    users_data = load_users()
    for user in users_data['users']:
        if user.get('cedula') == cedula and user.get('role') in ['client', 'cliente']:
            user['first_name'] = first_name
            user['last_name'] = last_name
            user['email'] = email
            user['phone'] = phone
            user['role'] = role
            save_users(users_data)
            return jsonify({"message": "Cliente actualizado exitosamente"}), 200

    return jsonify({"message": "Cliente no encontrado"}), 404