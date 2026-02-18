from flask import Blueprint, request, jsonify, session, redirect, url_for
import bcrypt
import json
import os

auth_bp = Blueprint('auth', __name__)

# Función de ayuda para hashear
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Función para cargar usuarios desde JSON
def load_users():
    try:
        users_path = os.path.join(os.getcwd(), 'users.json')
        if not os.path.exists(users_path):
            # Try alternative path
            users_path = os.path.join('static', 'data', 'users.json')
        
        if os.path.exists(users_path):
            with open(users_path, 'r') as f:
                data = json.load(f)
                
            # Handle both formats: {"users": [...]} or [...]
            if isinstance(data, dict) and 'users' in data:
                print("[DEBUG] auth.py: Loaded users from wrapped format")
                return data
            elif isinstance(data, list):
                print("[DEBUG] auth.py: Loaded users from array format")
                return {"users": data}
            else:
                print("[WARNING] auth.py: Unknown format, returning empty")
                return {"users": []}
        return {"users": []}
    except json.JSONDecodeError as e:
        print(f"[ERROR] auth.py: Invalid JSON - {e}")
        return {"users": []}
    except Exception as e:
        print(f"Error loading users: {e}")
        return {"users": []}

# Función para guardar usuarios en JSON
def save_users(data):
    try:
        import tempfile
        import os
        
        # Handle both formats - always save as {"users": [...]} for auth.py compatibility
        if isinstance(data, list):
            data = {"users": data}
        
        users_path = os.path.join(os.getcwd(), 'users.json')
        if not os.path.exists(users_path):
            users_path = os.path.join('static', 'data', 'users.json')
        
        dir_path = os.path.dirname(users_path) if os.path.exists(users_path) else '.'
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json', dir=dir_path) as temp_file:
            json.dump(data, temp_file, indent=4)
            temp_file.flush()
            os.fsync(temp_file.fileno())
        os.replace(temp_file.name, users_path)
        print("[DEBUG] auth.py: Users saved successfully")
    except Exception as e:
        print(f"Error saving users: {e}")
        raise  # Re-raise to let the endpoint handle it

# Endpoint: /api/auth/register
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    id_card = data.get('id_card')
    password = data.get('password')
    phone = data.get('phone')

    if not all([first_name, last_name, email, id_card, password, phone]):
        return jsonify({"message": "Faltan datos requeridos"}), 400

    users_data = load_users()
    # Check if user already exists
    for user in users_data['users']:
        if user['email'] == email:
            return jsonify({"message": "El correo ya existe"}), 400
        if user.get('cedula') == id_card:
            return jsonify({"message": "La cédula ya existe"}), 400

    hashed_password = hash_password(password)

    new_user = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password_hash": hashed_password.decode('utf-8'),
        "cedula": id_card,
        "phone": phone,
        "role": "cliente"
    }

    users_data['users'].append(new_user)
    save_users(users_data)

    return jsonify({"message": "Usuario registrado con éxito"}), 201

# Endpoint: /api/auth/login
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    users_data = load_users()

    for user in users_data['users']:
        if user['email'] == email and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            session['user_id'] = len(users_data['users'])  # Simple ID based on index
            session['username'] = user['email']
            session['role'] = user['role']
            return jsonify({"message": "Login exitoso", "role": user['role'], "user": {"first_name": user['first_name'], "last_name": user['last_name'], "email": user['email'], "phone": user.get('phone', ''), "cedula": user.get('cedula', '')}, "redirect": "/"}), 200

    return jsonify({"message": "Usuario o contraseña inválidos"}), 401

# Endpoint: /api/auth/status
@auth_bp.route('/status')
def status():
    # Check localStorage via query parameter or fallback to session
    is_logged_in = request.args.get('localStorage', 'false') == 'true' or 'user_id' in session
    return jsonify({
        "is_logged_in": is_logged_in,
        "role": session.get('role') or 'cliente'
    })

# Endpoint: /api/auth/logout
@auth_bp.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('role', None)
    return jsonify({"message": "Logout exitoso"}), 200