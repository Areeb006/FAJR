from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import hashlib
import secrets
import random
import time
from datetime import datetime, timedelta
import re
from urllib.parse import urlparse, parse_qs
import base64
import mimetypes

app = Flask(__name__, static_folder='client', static_url_path='')
CORS(app, supports_credentials=True)
app.secret_key = secrets.token_hex(16)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_COOKIE_SAMESITE'] = None

# --- Database Setup ---
def get_db_connection():
    try:
        conn = sqlite3.connect('fajr.db', timeout=30.0)
        conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrent access
        conn.execute('PRAGMA journal_mode=WAL;')
        # Set busy timeout
        conn.execute('PRAGMA busy_timeout=30000;')
        return conn
    except sqlite3.Error as e:
        print(f"Database connection error: {e}")
        raise

def init_db():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            gender TEXT,
            date_of_birth TEXT,
            password_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Create products table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, category TEXT NOT NULL,
            gender TEXT NOT NULL, price REAL NOT NULL, description TEXT NOT NULL, image_url TEXT,
            fragrance_family TEXT, volume TEXT, concentration TEXT, longevity TEXT,
            image_data BLOB, image_filename TEXT, image_mimetype TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Create orders table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            order_status TEXT DEFAULT 'pending',
            payment_id TEXT,
            product_id INTEGER,
            quantity INTEGER DEFAULT 1,
            price REAL,
            product_title TEXT,
            product_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )''')
        
        # Create addresses table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            street_address TEXT NOT NULL,
            landmark TEXT,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            country TEXT NOT NULL,
            phone TEXT NOT NULL,
            is_default BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )''')
        
        conn.commit()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

init_db()

# --- Helper Functions ---
def row_get(row, key, default=None):
    try:
        return row[key] if key in row.keys() else default
    except:
        return default

def convert_drive_link_to_direct_url(link):
    """
    Convert Google Drive sharing link to direct image URL
    Handles multiple Google Drive URL formats
    """
    if not link:
        return link
    
    # Return as-is if not a Google Drive link
    if 'drive.google.com' not in link:
        return link
    
    # Check if it's already a direct URL
    if 'drive.google.com/uc?' in link:
        return link
    
    file_id = None
    
    # Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
    match = re.search(r'/file/d/([a-zA-Z0-9_-]+)', link)
    if match:
        file_id = match.group(1)
    
    # Format 2: https://drive.google.com/open?id=FILE_ID
    elif 'open?id=' in link:
        match = re.search(r'id=([a-zA-Z0-9_-]+)', link)
        if match:
            file_id = match.group(1)
    
    # If we found a file ID, create the direct URL
    if file_id:
        return f"https://drive.google.com/uc?export=view&id={file_id}"
    
    # Return original link if we couldn't parse it
    return link

# --- Main Routes ---
@app.route('/')
def index():
    return app.send_static_file('index.html')

# --- Admin File Serving ---
@app.route('/admin/', defaults={'path': 'index.html'})
@app.route('/admin/<path:path>')
def serve_admin_files(path):
    admin_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'admin')
    return send_from_directory(admin_dir, path)

# --- Public API Routes (for client-side) ---
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        import time
        conn = get_db_connection()
        products = conn.execute('SELECT * FROM products').fetchall()
        conn.close()
        products_list = []
        for product in products:
            product_dict = {
                'id': product[0],
                'title': product[1],
                'category': product[2],
                'gender': product[3],
                'price': product[4],
                'description': product[5],
                'image_url': f"/api/product-image/{product[0]}?t={int(time.time()*1000)}",  # Cache-bust per response
                'volume': product[7] if len(product) > 7 else None,
                'longevity': product[8] if len(product) > 8 else None,
                'is_new': False  # You can add logic to determine if product is new
            }
            products_list.append(product_dict)
        return jsonify({'success': True, 'products': products_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        import time
        conn = get_db_connection()
        product = conn.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
        conn.close()
        
        if product:
            product_data = {
                'id': product[0],
                'title': product[1],
                'category': product[2],
                'gender': product[3],
                'price': product[4],
                'description': product[5],
                'image_url': f"/api/product-image/{product[0]}?t={int(time.time()*1000)}",  # Cache-bust per response
                'volume': product[7] if len(product) > 7 else None,
                'longevity': product[8] if len(product) > 8 else None,
            }
            return jsonify({'success': True, 'product': product_data})
        else:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Admin API Routes ---
@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        total_products = cursor.execute('SELECT COUNT(*) FROM products').fetchone()[0]
        total_users = cursor.execute('SELECT COUNT(*) FROM users').fetchone()[0]
        total_orders = cursor.execute('SELECT COUNT(*) FROM orders').fetchone()[0]
        total_revenue = cursor.execute('SELECT SUM(total_amount) FROM orders WHERE order_status = "delivered"').fetchone()[0] or 0
        # Revenue for current month (delivered orders)
        first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        monthly_revenue = cursor.execute(
            'SELECT SUM(total_amount) FROM orders WHERE order_status = "delivered" AND datetime(created_at) >= datetime(?)',
            (first_of_month,)
        ).fetchone()[0] or 0
        recent_products = cursor.execute('SELECT * FROM products ORDER BY created_at DESC LIMIT 5').fetchall()
        recent_users = cursor.execute('SELECT * FROM users ORDER BY created_at DESC LIMIT 5').fetchall()
        conn.close()
        
        recent_products_list = [{'id': p['id'], 'title': p['title'], 'price': p['price'], 'image_url': f"/api/product-image/{p['id']}?t={int(time.time()*1000)}"} for p in recent_products]
        recent_users_list = [{'id': u['id'], 'name': f"{u['first_name']} {u['last_name']}", 'email': u['email']} for u in recent_users]
        
        return jsonify({'success': True, 'stats': {
            'total_products': total_products, 'total_users': total_users, 'total_orders': total_orders,
            'total_revenue': total_revenue, 'monthly_revenue': monthly_revenue,
            'recent_products': recent_products_list, 'recent_users': recent_users_list
        }})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/products', methods=['POST'])
def add_product():
    """Add a new product"""
    try:
        # Get form data
        title = request.form.get('title', '').strip()
        category = request.form.get('category', 'Perfume').strip()
        gender = request.form.get('gender', '').strip()
        price = request.form.get('price', '')
        description = request.form.get('description', '').strip()
        volume = request.form.get('volume', '').strip()
        longevity = request.form.get('longevity', '').strip()
        
        # Validation
        if not title or not gender or not price or not description:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        try:
            price = float(price)
            if price <= 0:
                return jsonify({'success': False, 'message': 'Price must be greater than 0'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid price format'}), 400
        
        # Handle image upload
        image_data = None
        image_filename = None
        image_mimetype = None
        
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                # Check if it's an image file
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    image_data = file.read()
                    image_filename = file.filename
                    image_mimetype = file.mimetype or mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
        
        # Insert product into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO products (title, category, gender, price, description, volume, longevity, image_data, image_filename, image_mimetype)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (title, category, gender, price, description, volume, longevity, image_data, image_filename, image_mimetype))
        
        product_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Product added successfully',
            'product_id': product_id
        })
        
    except Exception as e:
        print(f"Error adding product: {e}")
        return jsonify({'success': False, 'message': 'Failed to add product'}), 500

@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
def update_product_admin(product_id):
    """Update an existing product"""
    try:
        # Get form data
        title = request.form.get('title', '').strip()
        category = request.form.get('category', 'Perfume').strip()
        gender = request.form.get('gender', '').strip()
        price = request.form.get('price', '')
        description = request.form.get('description', '').strip()
        volume = request.form.get('volume', '').strip()
        longevity = request.form.get('longevity', '').strip()
        
        # Validation
        if not title or not gender or not price or not description:
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        try:
            price = float(price)
            if price <= 0:
                return jsonify({'success': False, 'message': 'Price must be greater than 0'}), 400
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid price format'}), 400
        
        # Update product in database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        cursor.execute('SELECT id FROM products WHERE id = ?', (product_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Handle image upload if provided
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename != '':
                # Check if it's an image file
                allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                if '.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions:
                    image_data = file.read()
                    image_filename = file.filename
                    image_mimetype = file.mimetype or mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
                    
                    # Update with image
                    cursor.execute('''
                        UPDATE products 
                        SET title = ?, category = ?, gender = ?, price = ?, description = ?,
                            volume = ?, longevity = ?,
                            image_data = ?, image_filename = ?, image_mimetype = ?
                        WHERE id = ?
                    ''', (title, category, gender, price, description, volume, longevity, image_data, image_filename, image_mimetype, product_id))
                else:
                    # Update without image (invalid file type)
                    cursor.execute('''
                        UPDATE products 
                        SET title = ?, category = ?, gender = ?, price = ?, description = ?,
                            volume = ?, longevity = ?
                        WHERE id = ?
                    ''', (title, category, gender, price, description, volume, longevity, product_id))
            else:
                # Update without image (no file selected)
                cursor.execute('''
                    UPDATE products 
                    SET title = ?, category = ?, gender = ?, price = ?, description = ?,
                        volume = ?, longevity = ?
                    WHERE id = ?
                ''', (title, category, gender, price, description, volume, longevity, product_id))
        else:
            # Update without image (no image field)
            cursor.execute('''
                UPDATE products 
                SET title = ?, category = ?, gender = ?, price = ?, description = ?,
                    volume = ?, longevity = ?
                WHERE id = ?
            ''', (title, category, gender, price, description, volume, longevity, product_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Product updated successfully',
            'product_id': product_id
        })
        
    except Exception as e:
        print(f"Error updating product: {e}")
        return jsonify({'success': False, 'message': 'Failed to update product'}), 500

@app.route('/api/admin/users', methods=['GET'])
def get_users_admin():
    try:
        conn = get_db_connection()
        users = conn.execute('SELECT * FROM users ORDER BY created_at DESC').fetchall()
        conn.close()
        
        user_list = []
        for user in users:
            user_data = {
                'id': row_get(user, 'id'),
                'first_name': row_get(user, 'first_name', ''),
                'last_name': row_get(user, 'last_name', ''),
                'email': row_get(user, 'email', ''),
                'phone': row_get(user, 'phone', ''),
                'gender': row_get(user, 'gender', ''),
                'created_at': row_get(user, 'created_at', '')
            }
            user_list.append(user_data)
        
        return jsonify({'success': True, 'users': user_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/orders', methods=['GET'])
def get_admin_orders():
    """Get all orders for admin with user and product details"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all orders with user and product details
        orders = cursor.execute('''
            SELECT o.*, p.title as product_title,
                   u.first_name, u.last_name, u.email
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        ''').fetchall()
        
        conn.close()
        
        orders_list = []
        for order in orders:
            orders_list.append({
                'id': order['id'],
                'user_name': f"{order['first_name']} {order['last_name']}",
                'user_email': order['email'],
                'total_amount': order['total_amount'],
                'payment_method': order['payment_method'],
                'order_status': order['order_status'],
                'created_at': order['created_at'],
                'items': [{
                    'product_title': order['product_title'],
                    'product_image': f"/api/product-image/{order['product_id']}?t={int(time.time()*1000)}",
                    'quantity': order['quantity']
                }]
            })
        
        return jsonify({'success': True, 'orders': orders_list})
        
    except Exception as e:
        print(f"Error fetching admin orders: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch orders', 'orders': []})

@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.get_json()
    new_status = data.get('status')
    
    # Valid order statuses
    valid_statuses = ['pending', 'placed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']
    
    if not new_status or new_status not in valid_statuses:
        return jsonify({'success': False, 'message': 'Invalid order status'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if order exists
        order = cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,)).fetchone()
        if not order:
            conn.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        
        # Update order status
        cursor.execute('UPDATE orders SET order_status = ? WHERE id = ?', (new_status, order_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Order status updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Fetch the order with joined user, address, and product
        order = cursor.execute('''
            SELECT o.*, u.first_name, u.last_name, u.email,
                   a.street_address, a.apartment, a.city, a.state, a.postal_code, a.country,
                   p.title as product_title
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN addresses a ON o.address_id = a.id
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = ?
        ''', (order_id,)).fetchone()

        if not order:
            conn.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        shipping_address = ''
        if row_get(order, 'street_address'):
            shipping_address = f"{row_get(order, 'street_address', '')}"
            if row_get(order, 'apartment'):
                shipping_address += f", {row_get(order, 'apartment')}"
            shipping_address += f", {row_get(order, 'city', '')}, {row_get(order, 'state', '')} {row_get(order, 'postal_code', '')}, {row_get(order, 'country', '')}"

        # One row per order in current schema
        items_list = [{
            'product_title': row_get(order, 'product_title', 'Product'),
            'product_image': f"/api/product-image/{row_get(order, 'product_id')}?t={int(time.time()*1000)}" if row_get(order, 'product_id') else '',
            'quantity': row_get(order, 'quantity', 1),
            'price': float(row_get(order, 'total_amount', 0))
        }]

        order_data = {
            'id': row_get(order, 'id'),
            'user_id': row_get(order, 'user_id'),
            'user_name': f"{row_get(order, 'first_name', '')} {row_get(order, 'last_name', '')}".strip() or 'Unknown User',
            'user_email': row_get(order, 'email', ''),
            'total_amount': float(row_get(order, 'total_amount', 0)),
            'payment_method': row_get(order, 'payment_method', 'COD'),
            'status': row_get(order, 'order_status', 'pending'),
            'shipping_address': shipping_address or 'No address provided',
            'created_at': row_get(order, 'created_at', ''),
            'items': items_list
        }

        conn.close()
        return jsonify({'success': True, 'order': order_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user details
        user = cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Get user's addresses
        addresses = cursor.execute('SELECT * FROM addresses WHERE user_id = ?', (user_id,)).fetchall()
        
        # Get user's orders
        orders = cursor.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', (user_id,)).fetchall()
        
        # Format addresses
        address_list = []
        for address in addresses:
            address_data = {
                'id': address['id'],
                'title': address['title'],
                'first_name': address['first_name'],
                'last_name': address['last_name'],
                'name': f"{address['first_name']} {address['last_name']}".strip(),
                'street_address': address['street_address'],
                'apartment': address['apartment'] if address['apartment'] else '',
                'landmark': address['apartment'] if address['apartment'] else '',
                'city': address['city'],
                'state': address['state'],
                'postal_code': address['postal_code'],
                'country': address['country'],
                'phone': address['phone'],
                'is_default': bool(address['is_default'])
            }
            address_list.append(address_data)
        
        # Format orders
        order_list = []
        for order in orders:
            order_data = {
                'id': row_get(order, 'id'),
                'total_amount': float(row_get(order, 'total_amount', 0)),
                'status': row_get(order, 'order_status', 'pending'),
                'created_at': row_get(order, 'created_at', '')
            }
            order_list.append(order_data)
        
        user_data = {
            'id': row_get(user, 'id'),
            'first_name': row_get(user, 'first_name', ''),
            'last_name': row_get(user, 'last_name', ''),
            'email': row_get(user, 'email', ''),
            'phone': row_get(user, 'phone', ''),
            'date_of_birth': row_get(user, 'date_of_birth', ''),
            'gender': row_get(user, 'gender', ''),
            'preferred_fragrance': row_get(user, 'preferred_fragrance', ''),
            'created_at': row_get(user, 'created_at', ''),
            'addresses': address_list,
            'orders': order_list,
            'total_orders': len(order_list),
            'total_spent': sum(float(row_get(order, 'total_amount', 0)) for order in orders)
        }
        
        conn.close()
        return jsonify({'success': True, 'user': user_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Authentication API Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    gender = data.get('gender')
    date_of_birth = data.get('date_of_birth')
    
    if not first_name or not last_name or not email or not password:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email is already registered
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        existing_email = cursor.fetchone()
        
        if existing_email:
            return jsonify({
                'success': False, 
                'message': 'Email address is already registered'
            }), 400
        
        # Check if phone is already registered (if phone is provided)
        if phone:
            cursor.execute('SELECT id FROM users WHERE phone = ?', (phone,))
            existing_phone = cursor.fetchone()
            
            if existing_phone:
                return jsonify({
                    'success': False, 
                    'message': 'Phone number is already registered'
                }), 400
        
        # Hash password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Insert new user
        cursor.execute('''
            INSERT INTO users (first_name, last_name, email, phone, password_hash, gender, date_of_birth)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (first_name, last_name, email, phone, password_hash, gender, date_of_birth))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Set session
        session['user_id'] = user_id
        session['user_email'] = email
        session['user_name'] = f"{first_name} {last_name}"
        
        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'user': {
                'id': user_id,
                'first_name': first_name,
                'last_name': last_name,
                'email': email
            }
        })
    except Exception as e:
        print(f"Registration error: {e}")
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    
    # Allow login with either email or phone, and password
    if (not email and not phone) or not password:
        return jsonify({'success': False, 'message': 'Provide email or phone, and password'}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user by email or phone
        if email:
            user = cursor.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        else:
            user = cursor.execute('SELECT * FROM users WHERE phone = ?', (phone,)).fetchone()
        
        if not user:
            conn.close()
            print(f"DEBUG - No user found with identifier: {email or phone}")
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        # Hash the entered password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        stored_hash = row_get(user, 'password_hash')
        
        print(f"DEBUG - Login attempt for: {email or phone}")
        print(f"DEBUG - Entered password hash: {password_hash}")
        print(f"DEBUG - Stored password hash: {stored_hash}")
        print(f"DEBUG - Hashes match: {stored_hash == password_hash}")
        
        # Check if password_hash column exists and has value
        if not stored_hash:
            # Try to check if old 'password' column exists for migration
            try:
                old_password = row_get(user, 'password')
                if old_password:
                    print(f"DEBUG - Found old password column, checking against it...")
                    # Check if the entered password matches the old plain text password
                    if old_password == password:
                        # Migrate: Hash the old password and update
                        new_hash = hashlib.sha256(old_password.encode()).hexdigest()
                        cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?', (new_hash, row_get(user, 'id')))
                        conn.commit()
                        stored_hash = new_hash
                        print(f"DEBUG - Migrated password hash for {email or phone}")
                    else:
                        conn.close()
                        print(f"DEBUG - Password verification failed during migration for {email or phone}")
                        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
                else:
                    conn.close()
                    print(f"DEBUG - No password found for user {email or phone}")
                    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
            except Exception as migrate_error:
                print(f"DEBUG - Migration error: {migrate_error}")
                conn.close()
                return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        # Verify password hash
        if stored_hash != password_hash:
            conn.close()
            print(f"DEBUG - Password verification failed for {email or phone}")
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        conn.close()
        print(f"DEBUG - Login successful for {email or phone}")
        
        # Set session
        session['user_id'] = row_get(user, 'id')
        session['user_email'] = row_get(user, 'email')
        session['user_name'] = f"{row_get(user, 'first_name')} {row_get(user, 'last_name')}"
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'user': {
                'id': row_get(user, 'id'),
                'first_name': row_get(user, 'first_name'),
                'last_name': row_get(user, 'last_name'),
                'email': row_get(user, 'email')
            }
        })
    except Exception as e:
        print(f"DEBUG - Login error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    if 'user_id' in session:
        return jsonify({
            'success': True,
            'authenticated': True,
            'user': {
                'id': session['user_id'],
                'email': session['user_email'],
                'name': session['user_name']
            }
        })
    else:
        return jsonify({
            'success': True,
            'authenticated': False
        })

@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        conn.close()
        
        if user:
            user_data = {
                'id': row_get(user, 'id'),
                'first_name': row_get(user, 'first_name'),
                'last_name': row_get(user, 'last_name'),
                'email': row_get(user, 'email'),
                'phone': row_get(user, 'phone', ''),
                'date_of_birth': row_get(user, 'date_of_birth', ''),
                'gender': row_get(user, 'gender', ''),
                'preferred_fragrance': row_get(user, 'preferred_fragrance', '')
            }
            return jsonify({'success': True, 'user': user_data})
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Add missing API routes for client compatibility
@app.route('/api/check-auth', methods=['GET'])
def check_auth():
    """Alias for /api/auth/status for client compatibility"""
    return auth_status()

@app.route('/api/user', methods=['GET'])
def get_user():
    """Alias for /api/user/profile for client compatibility"""
    return get_user_profile()

@app.route('/api/user', methods=['PUT'])
def update_user():
    """Update user profile information"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update user information
        cursor.execute('''
            UPDATE users SET 
                first_name = ?, last_name = ?, phone = ?, 
                date_of_birth = ?, gender = ?, preferred_fragrance = ?
            WHERE id = ?
        ''', (
            data.get('first_name'), data.get('last_name'), data.get('phone'),
            data.get('date_of_birth'), data.get('gender'), data.get('preferred_fragrance'),
            user_id
        ))
        
        conn.commit()

        # Enforce maximum 50 orders per user: delete older ones beyond the most recent 50
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM orders 
                WHERE user_id = ? 
                  AND id NOT IN (
                      SELECT id FROM orders 
                      WHERE user_id = ? 
                      ORDER BY datetime(created_at) DESC, id DESC 
                      LIMIT 50
                  )
            ''', (user_id, user_id))
            conn.commit()
            conn.close()
        except Exception as _cleanup_err:
            # Best-effort cleanup; do not fail the request
            pass
        conn.close()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/user', methods=['DELETE'])
def delete_user():
    """Delete the currently authenticated user's account and related data"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    try:
        user_id = session['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        # Delete user's orders
        cursor.execute('DELETE FROM orders WHERE user_id = ?', (user_id,))
        # Delete user's addresses
        cursor.execute('DELETE FROM addresses WHERE user_id = ?', (user_id,))
        # Finally delete the user
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        conn.close()
        session.clear()
        return jsonify({'success': True, 'message': 'Account deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_user_orders():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get orders with product details
        orders = cursor.execute('''
            SELECT o.*, p.title, p.price as product_price, p.image_url
            FROM orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ''', (session['user_id'],)).fetchall()
        
        conn.close()
        
        orders_list = []
        for order in orders:
            orders_list.append({
                'id': order['id'],
                'product_id': order['product_id'],
                'product_title': order['title'],
                'product_image': f"/api/product-image/{order['product_id']}?t={int(time.time()*1000)}",
                'quantity': order['quantity'],
                'total_amount': order['total_amount'],
                'payment_method': order['payment_method'],
                'payment_status': order['payment_status'],
                'order_status': order['order_status'],
                'created_at': order['created_at']
            })
        
        return jsonify({'success': True, 'orders': orders_list})
        
    except Exception as e:
        print(f"Error fetching orders: {e}")
        # Return empty list if orders table doesn't exist or other error
        return jsonify({'success': True, 'orders': []})

# Address management API routes
@app.route('/api/addresses', methods=['GET'])
def get_user_addresses():
    """Get all addresses for the logged-in user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        user_id = session['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', (user_id,))
        addresses = cursor.fetchall()
        
        address_list = []
        for address in addresses:
            address_data = {
                'id': address['id'],
                'title': address['title'],
                'first_name': address['first_name'],
                'last_name': address['last_name'],
                'street_address': address['street_address'],
                'apartment': address['apartment'] if address['apartment'] else '',
                'city': address['city'],
                'state': address['state'],
                'postal_code': address['postal_code'],
                'country': address['country'],
                'phone': address['phone'],
                'is_default': bool(address['is_default'])
            }
            address_list.append(address_data)
        
        conn.close()
        return jsonify({'success': True, 'addresses': address_list})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/addresses', methods=['POST'])
def add_address():
    """Add a new address for the logged-in user"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        # Support new payload keys: name (instead of first/last) and landmark (instead of apartment)
        # Validate required fields using new schema
        required_fields = ['name', 'street_address', 'city', 'state', 'postal_code', 'country', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field.replace("_", " ").title()} is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # If this is set as default, unset other defaults
        if data.get('is_default'):
            cursor.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', (user_id,))
        
        # Map new fields to existing columns
        name = data.get('name', '').strip()
        parts = name.split(' ', 1)
        first_name = parts[0] if parts else ''
        last_name = parts[1] if len(parts) > 1 else ''
        apartment = data.get('landmark', '')
        title = data.get('title') or 'Address'

        # Insert new address
        cursor.execute('''
            INSERT INTO addresses (user_id, title, first_name, last_name, street_address, apartment, 
                                 city, state, postal_code, country, phone, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id, title, first_name, last_name,
            data['street_address'], apartment, data['city'],
            data['state'], data['postal_code'], data['country'], data['phone'],
            1 if data.get('is_default') else 0, datetime.now().isoformat()
        ))
        
        address_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Address added successfully', 'address_id': address_id})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/addresses/<int:address_id>', methods=['PUT'])
def update_address(address_id):
    """Update an existing address"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify address belongs to user
        address = cursor.execute('SELECT * FROM addresses WHERE id = ? AND user_id = ?', (address_id, user_id)).fetchone()
        if not address:
            conn.close()
            return jsonify({'success': False, 'message': 'Address not found'}), 404
        
        # If this is set as default, unset other defaults
        if data.get('is_default'):
            cursor.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?', (user_id, address_id))
        
        # Map new fields to existing columns
        name = data.get('name')
        first_name = None
        last_name = None
        if name is not None:
            parts = name.strip().split(' ', 1)
            first_name = parts[0] if parts else ''
            last_name = parts[1] if len(parts) > 1 else ''
        apartment = data.get('landmark') if 'landmark' in data else None
        title = data.get('title')

        # Update address
        cursor.execute('''
            UPDATE addresses SET 
                title = ?, first_name = ?, last_name = ?, street_address = ?, apartment = ?,
                city = ?, state = ?, postal_code = ?, country = ?, phone = ?, is_default = ?
            WHERE id = ? AND user_id = ?
        ''', (
            (title if title is not None else address['title']),
            (first_name if first_name is not None else address['first_name']),
            (last_name if last_name is not None else address['last_name']),
            data.get('street_address', address['street_address']),
            (apartment if apartment is not None else address['apartment']),
            data.get('city', address['city']),
            data.get('state', address['state']),
            data.get('postal_code', address['postal_code']),
            data.get('country', address['country']),
            data.get('phone', address['phone']),
            1 if data.get('is_default') else 0,
            address_id, user_id
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Address updated successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/addresses/<int:address_id>', methods=['DELETE'])
def delete_address(address_id):
    """Delete an address"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        user_id = session['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify address belongs to user
        address = cursor.execute('SELECT * FROM addresses WHERE id = ? AND user_id = ?', (address_id, user_id)).fetchone()
        if not address:
            conn.close()
            return jsonify({'success': False, 'message': 'Address not found'}), 404
        
        # Delete address
        cursor.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', (address_id, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Address deleted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/addresses/<int:address_id>', methods=['GET'])
def get_address(address_id):
    """Get a single address details for edit form population"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    try:
        user_id = session['user_id']
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM addresses WHERE id = ? AND user_id = ?', (address_id, user_id))
        address = cursor.fetchone()
        conn.close()
        if not address:
            return jsonify({'success': False, 'message': 'Address not found'}), 404
        address_data = {
            'id': address['id'],
            'title': address['title'],
            'first_name': address['first_name'],
            'last_name': address['last_name'],
            'street_address': address['street_address'],
            'apartment': address['apartment'] if address['apartment'] else '',
            'city': address['city'],
            'state': address['state'],
            'postal_code': address['postal_code'],
            'country': address['country'],
            'phone': address['phone'],
            'is_default': bool(address['is_default'])
        }
        return jsonify({'success': True, 'address': address_data})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/place-order', methods=['POST'])
def place_order():
    """Place a new order"""
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        print(f"DEBUG - Place order data received: {data}")
        print(f"DEBUG - User ID: {user_id}")
        
        # Validate required fields for cart-based orders
        items = data.get('items', [])
        total_amount = data.get('total_amount') or data.get('totalAmount')
        payment_method = data.get('payment_method') or data.get('paymentMethod')
        address_id = data.get('address_id') or data.get('addressId')
        
        print(f"DEBUG - Parsed data: items={items}, total_amount={total_amount}, payment_method={payment_method}, address_id={address_id}")
        
        if not items:
            print("DEBUG - Error: No items in cart")
            return jsonify({'success': False, 'message': 'Cart items are required'}), 400
        if not total_amount:
            print("DEBUG - Error: No total amount")
            return jsonify({'success': False, 'message': 'Total amount is required'}), 400
        if not payment_method:
            print("DEBUG - Error: No payment method")
            return jsonify({'success': False, 'message': 'Payment method is required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Process each item in the cart
        order_ids = []
        for i, item in enumerate(items):
            print(f"DEBUG - Processing item {i+1}: {item}")
            
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            price = item.get('price', 0)
            
            print(f"DEBUG - Item details: product_id={product_id}, quantity={quantity}, price={price}")
            
            if not product_id:
                conn.close()
                print("DEBUG - Error: Missing product_id")
                return jsonify({'success': False, 'message': 'Product ID is required for all items'}), 400
            
            # Verify product exists
            print(f"DEBUG - Checking if product {product_id} exists...")
            product = cursor.execute('SELECT * FROM products WHERE id = ?', (product_id,)).fetchone()
            if not product:
                conn.close()
                print(f"DEBUG - Error: Product {product_id} not found")
                return jsonify({'success': False, 'message': f'Product {product_id} not found'}), 404
            
            print(f"DEBUG - Product found: {product[1] if product else 'None'}")
            
            # Calculate item total
            item_total = price * quantity
            print(f"DEBUG - Item total: {price} * {quantity} = {item_total}")
            
            # Insert order for this item
            print(f"DEBUG - Inserting order: user_id={user_id}, product_id={product_id}, quantity={quantity}, total_amount={item_total}")
            try:
                cursor.execute('''
                    INSERT INTO orders (user_id, product_id, quantity, total_amount, payment_method, 
                                      address_id, payment_status, order_status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id, product_id, quantity, item_total,
                    payment_method, address_id, 'pending', 'placed', datetime.now().isoformat()
                ))
                
                order_id = cursor.lastrowid
                order_ids.append(order_id)
                print(f"DEBUG - Order created with ID: {order_id}")
                
            except Exception as insert_error:
                conn.close()
                print(f"DEBUG - Insert error: {insert_error}")
                return jsonify({'success': False, 'message': f'Database error: {str(insert_error)}'}), 500
        
        conn.commit()
        conn.close()
        
        print(f"DEBUG - All orders created successfully: {order_ids}")
        
        return jsonify({
            'success': True, 
            'message': 'Order placed successfully!',
            'order_ids': order_ids,
            'total_orders': len(order_ids)
        })
        
    except Exception as e:
        print(f"DEBUG - Place order error: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# --- Image Serving Route ---
@app.route('/api/product-image/<int:product_id>')
def get_product_image(product_id):
    """Serve product image from database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get image data from database
        cursor.execute('SELECT image_data, image_mimetype, image_filename FROM products WHERE id = ?', (product_id,))
        result = cursor.fetchone()
        conn.close()
        
        if not result or not result[0]:
            # Return placeholder image if no image found
            return send_from_directory('client/img', 'placeholder.svg')
        
        image_data, mimetype, filename = result
        
        # Create response with image data
        from flask import Response
        response = Response(image_data, mimetype=mimetype or 'image/jpeg')
        response.headers['Content-Disposition'] = f'inline; filename="{filename or "product.jpg"}"'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'  # Prevent caching for instant updates
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response
        
    except Exception as e:
        print(f"Error serving image for product {product_id}: {e}")
        return send_from_directory('client/img', 'placeholder.svg')

# --- Admin Image Upload Route ---
@app.route('/api/admin/upload-product-image/<int:product_id>', methods=['POST'])
def upload_product_image(product_id):
    """Upload and store product image in database"""
    try:
        # Check if file was uploaded
        if 'image' not in request.files:
            return jsonify({'success': False, 'message': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'}), 400
        
        # Check if it's an image file
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({'success': False, 'message': 'Invalid file type. Please upload an image.'}), 400
        
        # Read file data
        image_data = file.read()
        
        # Get MIME type
        mimetype = file.mimetype or mimetypes.guess_type(file.filename)[0] or 'image/jpeg'
        
        # Store in database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if product exists
        cursor.execute('SELECT id FROM products WHERE id = ?', (product_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Update product with image data
        cursor.execute('''
            UPDATE products 
            SET image_data = ?, image_filename = ?, image_mimetype = ?
            WHERE id = ?
        ''', (image_data, file.filename, mimetype, product_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Image uploaded successfully',
            'image_url': f"/api/product-image/{product_id}?t={int(time.time()*1000)}"
        })
    except Exception as e:
        print(f"Error uploading image for product {product_id}: {e}")
        return jsonify({'success': False, 'message': 'Failed to upload image'}), 500

# Address management endpoints
@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
def get_user_admin(user_id):
    """Get user details for admin"""
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        user_data = {
            'id': user[0],
            'first_name': user[1] if len(user) > 1 else '',
            'last_name': user[2] if len(user) > 2 else '',
            'email': user[3] if len(user) > 3 else '',
            'phone': user[4] if len(user) > 4 else '',
            'gender': user[5] if len(user) > 5 else '',
            'date_of_birth': user[6] if len(user) > 6 else '',
            'created_at': user[7] if len(user) > 7 else ''
        }
        
        return jsonify({'success': True, 'user': user_data})
    except Exception as e:
        print(f"Error getting user: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>/addresses', methods=['GET'])
def get_user_addresses_admin(user_id):
    """Get user addresses for admin"""
    try:
        conn = get_db_connection()
        addresses = conn.execute('''
            SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC
        ''', (user_id,)).fetchall()
        conn.close()
        
        address_list = []
        for addr in addresses:
            address_data = {
                'id': addr[0],
                'user_id': addr[1],
                'name': addr[2],
                'street_address': addr[3],
                'landmark': addr[4],
                'city': addr[5],
                'state': addr[6],
                'postal_code': addr[7],
                'country': addr[8],
                'phone': addr[9],
                'is_default': bool(addr[10]),
                'created_at': addr[11]
            }
            address_list.append(address_data)
        
        return jsonify({'success': True, 'addresses': address_list})
    except Exception as e:
        print(f"Error getting user addresses: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>/orders', methods=['GET'])
def get_user_orders_admin(user_id):
    """Get user orders for admin"""
    try:
        conn = get_db_connection()
        orders = conn.execute('''
            SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        ''', (user_id,)).fetchall()
        conn.close()
        
        order_list = []
        for order in orders:
            order_data = {
                'id': order[0],
                'user_id': order[1],
                'total_amount': order[2],
                'order_status': order[3] if len(order) > 3 else 'pending',
                'created_at': order[4] if len(order) > 4 else ''
            }
            order_list.append(order_data)
        
        return jsonify({'success': True, 'orders': order_list})
    except Exception as e:
        print(f"Error getting user orders: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user_admin(user_id):
    """Delete a user and all associated data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        user = cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Delete user's addresses first (foreign key constraint)
        cursor.execute('DELETE FROM addresses WHERE user_id = ?', (user_id,))
        
        # Delete user's orders
        cursor.execute('DELETE FROM orders WHERE user_id = ?', (user_id,))
        
        # Delete the user
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
    except Exception as e:
        print(f"Error deleting user: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/admin/orders/<int:order_id>', methods=['DELETE'])
def delete_order_admin(order_id):
    """Delete an order"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if order exists
        order = cursor.execute('SELECT id FROM orders WHERE id = ?', (order_id,)).fetchone()
        if not order:
            conn.close()
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        
        # Delete the order
        cursor.execute('DELETE FROM orders WHERE id = ?', (order_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Order deleted successfully'})
    except Exception as e:
        print(f"Error deleting order: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)