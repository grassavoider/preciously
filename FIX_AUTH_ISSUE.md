# Fix Authentication Issue

## Current Setup
- **Frontend**: Running on http://localhost:3000
- **Backend**: Running on http://localhost:3001
- **Login page**: http://localhost:3000/login

## The Issue
When you try to import a character, you're being redirected to login because:
1. You're not authenticated (no token)
2. The `/api/characters/import` endpoint requires authentication

## Solution

### Step 1: Login First
1. Go to http://localhost:3000/login
2. Login with:
   - Username: `username`
   - Password: `password`

### Step 2: Verify Authentication
After login, open browser console (F12) and run:
```javascript
// Check if logged in
console.log('Token:', localStorage.getItem('auth_token'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

You should see:
- A token string (JWT)
- User object with id, username, email, role

### Step 3: Try Character Import Again
1. Go to Characters page
2. Click "Import Character"
3. Select your PNG or CharX file
4. Should work now!

## If Still Having Issues

### Check Backend is Running
```bash
curl http://localhost:3001/api/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### Manual Test Import
After logging in, test the import endpoint directly:
```javascript
// In browser console
const testImport = async () => {
  const response = await fetch('http://localhost:3001/api/characters/import', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: new FormData() // empty for test
  });
  console.log('Status:', response.status);
  console.log('Response:', await response.json());
};
testImport();
```

Should return 400 (no file) but NOT 401 (unauthorized).

## The Fix Summary
1. **Login first** at http://localhost:3000/login
2. **Stay logged in** - cookies keep you logged in for 30 days
3. **Import characters** - should work after login

The authentication is working correctly - you just need to login first before importing characters!