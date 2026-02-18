import requests
import json

url = 'http://localhost:5000/api/auth/register'
data = {
    "first_name": "Test",
    "last_name": "User",
    "email": "test2@example.com",
    "id_card": "87654321",
    "phone": "04123456789",
    "password": "password123"
}

response = requests.post(url, json=data)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")