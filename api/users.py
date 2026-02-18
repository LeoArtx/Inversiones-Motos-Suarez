# api/users.py - Endpoint para actualización de usuarios

from flask import Blueprint, request, jsonify
import json
import os
from threading import Lock
import sys

users_bp = Blueprint('users', __name__)

# Lock para evitar corrupción de datos en escrituras concurrentes
file_lock = Lock()

# Ruta al archivo users.json
# Intentar múltiples ubicaciones posibles
POSSIBLE_PATHS = [
    os.path.join('static', 'data', 'users.json'),
    'users.json',
    os.path.join('data', 'users.json')
]

def get_users_file_path():
    """Encuentra el archivo users.json en las ubicaciones posibles"""
    for path in POSSIBLE_PATHS:
        if os.path.exists(path):
            print(f"[DEBUG] Found users.json at: {path}", file=sys.stderr)
            return path
    # Si no existe, usar el primer path como default
    print(f"[DEBUG] Using default path: {POSSIBLE_PATHS[0]}", file=sys.stderr)
    return POSSIBLE_PATHS[0]

USERS_FILE = get_users_file_path()

# ========================================
# FUNCIONES AUXILIARES
# ========================================

def read_users():
    """Lee el archivo users.json de forma segura"""
    try:
        if not os.path.exists(USERS_FILE):
            print(f"[DEBUG] File does not exist: {USERS_FILE}", file=sys.stderr)
            # Crear directorio si no existe
            os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
            # Crear archivo vacío con array
            with open(USERS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=4)
            print("[DEBUG] Created empty users.json file", file=sys.stderr)
            return []
        
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Handle both formats: {"users": [...]} or [...]
        if isinstance(data, dict) and 'users' in data:
            print("[DEBUG] Loaded users from wrapped format {users: [...]}", file=sys.stderr)
            return data['users']
        elif isinstance(data, list):
            print(f"[DEBUG] Datos recibidos del servidor: {len(data)} usuarios", file=sys.stderr)
            return data
        else:
            print(f"[WARNING] users.json tiene formato inesperado: {type(data)}", file=sys.stderr)
            return []
            
    except json.JSONDecodeError as e:
        print(f"[ERROR] Error al cargar JSON: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"[ERROR] Error al leer {USERS_FILE}: {str(e)}", file=sys.stderr)
        return []

def write_users(users_data):
    """Escribe el archivo users.json de forma segura con mecanismo de respaldo"""
    try:
        with file_lock:
            # Crear backup antes de escribir (solo si el archivo existe y no está vacío)
            if os.path.exists(USERS_FILE) and os.path.getsize(USERS_FILE) > 0:
                backup_file = USERS_FILE + '.backup'
                try:
                    with open(USERS_FILE, 'r', encoding='utf-8') as f:
                        backup_data = f.read()
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        f.write(backup_data)
                    print("[DEBUG] Backup created successfully", file=sys.stderr)
                except Exception as e:
                    print(f"[WARNING] Could not create backup: {e}", file=sys.stderr)
            
            # Escribir nuevos datos primero a un archivo temporal
            temp_file = USERS_FILE + '.tmp'
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(users_data, f, ensure_ascii=False, indent=4)
            
            # Renombrar archivo temporal al archivo original (operación atómica)
            os.replace(temp_file, USERS_FILE)
            
            print("[DEBUG] Guardado exitoso en users.json", file=sys.stderr)
            return True
            
    except Exception as e:
        print(f"[ERROR] Error al escribir {USERS_FILE}: {str(e)}", file=sys.stderr)
        # Intentar restaurar desde backup si existe
        backup_file = USERS_FILE + '.backup'
        if os.path.exists(backup_file):
            try:
                with open(backup_file, 'r', encoding='utf-8') as f:
                    backup_data = f.read()
                with open(USERS_FILE, 'w', encoding='utf-8') as f:
                    f.write(backup_data)
                print("[DEBUG] Restaurado desde backup después de error", file=sys.stderr)
            except:
                pass
        return False

# ========================================
# ENDPOINTS
# ========================================

@users_bp.route('/', methods=['GET'])
def get_users():
    """Obtiene todos los usuarios"""
    try:
        users = read_users()
        
        # Asegurar que siempre retornamos un array
        if not isinstance(users, list):
            print(f"[WARNING] users.json no contiene un array. Retornando array vacío.", file=sys.stderr)
            return jsonify([]), 200
        
        print(f"[DEBUG] Enviando {len(users)} usuarios al cliente", file=sys.stderr)
        
        # Filtrar datos sensibles antes de enviar
        safe_users = []
        for user in users:
            safe_user = {
                'cedula': user.get('cedula', ''),
                'first_name': user.get('first_name', ''),
                'last_name': user.get('last_name', ''),
                'email': user.get('email', ''),
                'phone': user.get('phone', ''),
                'role': user.get('role', 'cliente')
            }
            safe_users.append(safe_user)
        
        return jsonify(safe_users), 200
    except Exception as e:
        print(f"[ERROR] Error in get_users: {str(e)}", file=sys.stderr)
        return jsonify([]), 200  # Retornar array vacío en caso de error

@users_bp.route('/update', methods=['POST'])
def update_user():
    """Actualiza un usuario existente en users.json"""
    try:
        # Obtener datos del request
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "No se recibieron datos"
            }), 400
        
        # Validar que se recibió la cédula (identificador único)
        cedula = data.get('cedula')
        if not cedula:
            return jsonify({
                "status": "error",
                "message": "La cédula es requerida"
            }), 400
        
        # Validar campos requeridos
        required_fields = ['first_name', 'last_name', 'email', 'phone', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    "status": "error",
                    "message": f"El campo {field} es requerido"
                }), 400
        
        # Leer usuarios actuales
        users = read_users()
        
        # Buscar el usuario por cédula
        user_found = False
        for i, user in enumerate(users):
            if user.get('cedula') == cedula:
                # Actualizar solo los campos permitidos
                users[i]['first_name'] = data['first_name']
                users[i]['last_name'] = data['last_name']
                users[i]['email'] = data['email']
                users[i]['phone'] = data['phone']
                users[i]['role'] = data['role']
                
                # Mantener campos que no se deben modificar (como password)
                # Solo actualizar los campos específicos
                
                user_found = True
                break
        
        if not user_found:
            return jsonify({
                "status": "error",
                "message": f"No se encontró un usuario con cédula {cedula}"
            }), 404
        
        # Guardar cambios en el archivo
        if write_users(users):
            return jsonify({
                "status": "success",
                "message": "Usuario actualizado correctamente",
                "user": {
                    "cedula": cedula,
                    "first_name": data['first_name'],
                    "last_name": data['last_name'],
                    "email": data['email'],
                    "phone": data['phone'],
                    "role": data['role']
                }
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Error al guardar los cambios en el archivo"
            }), 500
            
    except Exception as e:
        print(f"Error en update_user: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error interno del servidor: {str(e)}"
        }), 500

@users_bp.route('/<cedula>', methods=['GET'])
def get_user_by_cedula(cedula):
    """Obtiene un usuario específico por su cédula"""
    try:
        users = read_users()
        user = next((u for u in users if u.get('cedula') == cedula), None)
        
        if user:
            return jsonify(user), 200
        else:
            return jsonify({"error": "Usuario no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@users_bp.route('/delete/<cedula>', methods=['DELETE'])
def delete_user(cedula):
    """Elimina un usuario (opcional - para futuras implementaciones)"""
    try:
        users = read_users()
        
        # Filtrar usuarios, eliminando el que coincida con la cédula
        original_count = len(users)
        users = [u for u in users if u.get('cedula') != cedula]
        
        if len(users) < original_count:
            if write_users(users):
                return jsonify({
                    "status": "success",
                    "message": "Usuario eliminado correctamente"
                }), 200
            else:
                return jsonify({
                    "status": "error",
                    "message": "Error al guardar los cambios"
                }), 500
        else:
            return jsonify({
                "status": "error",
                "message": "Usuario no encontrado"
            }), 404
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
