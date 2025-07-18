# Testing Authentication & Character Import

## 1. First, check if you're logged in

Open browser console (F12) and run:
```javascript
// Check stored auth
console.log('Token:', localStorage.getItem('auth_token'));
console.log('User:', localStorage.getItem('user'));
console.log('Cookie Token:', document.cookie);
```

## 2. If not logged in, login first

1. Go to http://localhost:3000/login (or whatever port your frontend is on)
2. Login with:
   - Username: `username`
   - Password: `password`

## 3. After login, check auth again

Run in console:
```javascript
// Should now see token and user data
console.log('Token:', localStorage.getItem('auth_token'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

## 4. Test character import

1. Go to Characters page
2. Click "Import Character"
3. Select a PNG or CharX file
4. Check Network tab (F12) to see the API request

## Common Issues & Fixes

### Issue: Redirected to login when importing
**Cause**: No auth token or expired token
**Fix**: Login again

### Issue: 404 on /api/characters/import
**Cause**: Backend not running or wrong port
**Fix**: Ensure backend is running on port 3001

### Issue: CORS error
**Cause**: Frontend and backend on different ports
**Fix**: Check vite proxy config

## Debug Commands

### Check if backend is running:
```bash
curl http://localhost:3001/api/health
```

### Test login:
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"username","password":"password"}'
```

### Check what port frontend is using:
Look at the URL in your browser - it should be http://localhost:3000 or similar

## Quick Fix Script

Run this in browser console to manually set auth (temporary fix):
```javascript
// Only use this for testing!
const testToken = 'test-token-' + Date.now();
localStorage.setItem('auth_token', testToken);
localStorage.setItem('user', JSON.stringify({
  id: 'test-user',
  username: 'username',
  email: 'test@test.com',
  role: 'ADMIN'
}));
location.reload();
```

But you should properly login through the UI for real testing.