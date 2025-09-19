# Fajr Luxury Authentication System

This project adds a complete authentication system to the Fajr Luxury e-commerce website, allowing users to register, login, and manage their profile information.

## Features

- User registration with email and password
- User login with session management
- Profile management (view and update user information)
- Secure password handling
- Responsive login/registration forms
- User profile data display

## Project Structure

- `server.py` - Flask backend with authentication routes and database management
- `client/` - Frontend files
  - `account.html` - User account page with login/registration forms
  - `js/script.js` - JavaScript for frontend-backend communication
- `requirements.txt` - Python dependencies
- `test_auth.py` - Test script for authentication system

## Setup Instructions

### Prerequisites

- Python 3.7 or higher
- Web browser

### Installation

1. Clone the repository or download the files

2. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```
   python server.py
   ```

4. Open the account page in your browser:
   ```
   http://localhost:5000/client/account.html
   ```

### Testing

To test the authentication system, run:
```
python test_auth.py
```

This will perform a series of tests on the authentication endpoints and verify that the system is working correctly.

## API Endpoints

- `POST /api/register` - Register a new user
- `POST /api/login` - Login a user
- `GET /api/check-auth` - Check if a user is authenticated
- `GET /api/user` - Get user profile data
- `PUT /api/user` - Update user profile data
- `POST /api/logout` - Logout a user

## Security Features

- Password hashing using SHA-256
- Session-based authentication
- CORS support for cross-origin requests
- Input validation

## Future Improvements

- Add email verification
- Implement password reset functionality
- Add social login options
- Enhance security with more robust password hashing (bcrypt)
- Add two-factor authentication