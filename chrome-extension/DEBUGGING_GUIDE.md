# Chrome Extension Debugging Guide

## Understanding the Auth Check Error

The extension now has a **fallback authentication mechanism** that handles errors gracefully.

### What Happens When You See Auth Errors

#### Scenario 1: Primary endpoint not available
```
❌ Auth check error (endpoint doesn't exist yet)
  ↓
✅ Falls back to /api/tabs endpoint
  ↓
✅ Authentication check continues using fallback
```

#### Scenario 2: Both endpoints fail
```
❌ Primary endpoint fails
❌ Fallback endpoint fails
  ↓
Extension assumes NOT authenticated
User sees "Log In" button
```

## How to Debug Auth Issues

### Step 1: Open Background Script Logs

1. Go to `chrome://extensions/`
2. Find "Tab Stasher" extension
3. Click **"Details"**
4. Click **"Inspect" or "Service worker"** (depending on Chrome version)
5. A new window opens with the console

### Step 2: Look for These Log Patterns

#### ✅ Everything Working
```
Checking authentication with /api/auth/check endpoint...
Auth check response: {
  status: 200,
  isAuthenticated: true,
  user: "user@example.com"
}
✅ Authentication successful!
```

#### ⏳ Trying Fallback
```
Primary auth endpoint failed, trying fallback...
Using fallback authentication check...
Fallback auth check response: { status: 200, ok: true }
```

#### ❌ Auth Failed
```
❌ Auth check error (both methods failed): ...error message...
Auth check attempt: {
  status: 401,
  isAuthenticated: false,
  error: "..."
}
```

### Step 3: Understand the Log Markers

- **✅** - Success
- **⏳** - Waiting or retrying
- **❌** - Failure

### Step 4: Check Specific Issues

#### Issue: "Auth check error: TypeError: Failed to fetch"

**Cause**: Network error or endpoint not responding

**Solutions**:
1. Check internet connection
2. Verify API endpoint is accessible
3. Check if browser has CORS issues
4. Try the fallback (it should handle this)

#### Issue: "Fallback auth check response: { status: 401, ok: false }"

**Cause**: User is not authenticated

**Solutions**:
1. Log in to Tab Stasher website first
2. Click "Refresh Auth" in extension
3. Try logging in again through extension

#### Issue: "Auth check failed after maximum attempts"

**Cause**: Extension tried 3 times with exponential backoff and failed each time

**Solutions**:
1. Check console for the specific error
2. Verify Tab Stasher API is running
3. Reload extension: go to chrome://extensions/ → click refresh
4. Try again

## Monitoring Auth Checks

### Console Output During Normal Flow

```
1. User clicks "Log In"
   → "Opening login page..."

2. User logs in on website

3. Extension detects redirect to /dashboard
   → "Checking authentication with /api/auth/check endpoint..."
   → "Using fallback authentication check..." (if primary fails)

4. Auth check returns success
   → "✅ Authentication successful!"
   → authCompletedAt timestamp stored

5. Popup detects completion
   → UI updates to show "Save This Tab"
   → "Login successful!" message

6. Popup closes
```

## Testing Authentication Manually

### Test 1: Quick Auth Check

Open popup console and run:
```javascript
chrome.runtime.sendMessage({action: 'checkAuth'}, (response) => {
  console.log('Auth result:', response);
});
```

Expected output if authenticated:
```javascript
{isAuthenticated: true, status: 200, user: {...}}
```

### Test 2: Check Storage

In popup console:
```javascript
chrome.storage.local.get(null, (result) => {
  console.log('All storage:', result);
});
```

Look for:
- `authCompletedAt` - timestamp
- `isAuthenticated` - true/false
- `loginInProgress` - true/false

### Test 3: Fetch Endpoint Directly

In browser console (on Tab Stasher domain):
```javascript
fetch('/api/auth/check', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

Should return:
```javascript
{isAuthenticated: true, user: {id: "...", email: "..."}}
```

## Common Issues and Solutions

### Extension Shows "Log In" After Reloading

**Cause**: Chrome sometimes clears storage when reloading extensions

**Solution**:
1. Click "Refresh Auth" button in popup
2. Or log in again

### "Opening login page..." Message Won't Go Away

**Cause**: Popup polling timed out (3 minutes)

**Solution**:
1. Close popup
2. Complete login on website if needed
3. Reopen extension
4. Click "Refresh Auth"

### Auth Check Working but Still Shows "Log In"

**Cause**: UI didn't update properly

**Solution**:
1. Click "Refresh Auth" button
2. Close and reopen popup
3. Reload extension: chrome://extensions/ → refresh

### CORS Errors in Console

**Cause**: Browser CORS policy blocking request

**Solution**:
1. This is normal for cross-origin requests
2. Extension should still work via credentials
3. Check if API returned data anyway
4. Check "Network" tab in DevTools

## Viewing Network Requests

### In Extension DevTools

1. Open extension DevTools (Service worker console)
2. Go to **"Sources"** tab
3. Reload the extension
4. Look for network requests in the **"Network"** panel

### Checking API Responses

1. In browser DevTools (on Tab Stasher site)
2. Go to **"Network"** tab
3. Look for requests to `/api/auth/check` or `/api/tabs`
4. Click the request → **"Response"** tab
5. Should see auth response

## Performance Metrics

### Expected Response Times

- `/api/auth/check`: < 500ms
- `/api/tabs` (fallback): < 1000ms
- Polling interval: 3 seconds
- Total retry time: ~5 seconds (1s + 1.5s + 2.25s delays)

### If Slow

1. Check network latency
2. Monitor API server performance
3. Check database response times
4. Consider increasing timeouts if needed

## Creating Detailed Logs

To enable more detailed logging, add this to popup console:

```javascript
// Save logs to console
window.extensionLogs = [];
const originalLog = console.log;
console.log = (...args) => {
  window.extensionLogs.push({time: Date.now(), level: 'log', args});
  originalLog(...args);
};

// Later, view all logs:
window.extensionLogs.forEach(log => {
  console.log(`[${new Date(log.time).toISOString()}] ${log.args.join(' ')}`);
});
```

## Getting Help

When reporting issues, include:

1. **Console logs** from background script service worker
2. **Storage data** from `chrome.storage.local.get()`
3. **Network requests** from DevTools Network tab
4. **Steps to reproduce** the issue
5. **Expected vs actual** behavior

## Troubleshooting Checklist

- [ ] Extension loaded in chrome://extensions/
- [ ] Extension is not disabled
- [ ] Logged into Tab Stasher website
- [ ] No CORS errors that are actual blockers
- [ ] API endpoints responding (check Network tab)
- [ ] chrome.storage working (check with test script)
- [ ] Cookies being sent with requests (credentials: 'include')
- [ ] No Content Security Policy violations
- [ ] Browser console shows auth logs
- [ ] Polling mechanism working (if login in progress)

## Next Steps

1. **Reload extension**: chrome://extensions/ → refresh
2. **Check logs**: Background script console
3. **Test auth**: Use "Test 1: Quick Auth Check" above
4. **Check network**: DevTools Network tab
5. **Report issue**: Include all logs and steps
