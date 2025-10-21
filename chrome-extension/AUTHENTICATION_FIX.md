# Chrome Extension Authentication State Fix

## Problem Summary

After logging in through the extension, the authentication state was not updating. Users would:
1. Click "Log In"
2. Successfully authenticate on the Tab Stasher website
3. Return to the extension
4. Still see the "Log In" button instead of the authenticated state

## Root Causes

1. **Popup closed too quickly** (500ms) before authentication flow could complete
2. **Wrong auth check endpoint** - Used `/api/instagram-mapping` which wasn't a proper auth verification endpoint
3. **No state persistence** - Auth completion wasn't being saved to browser storage
4. **No polling mechanism** - Popup couldn't detect when login completed
5. **Poor error handling** - No fallback or retry logic

## Solutions Implemented

### 1. Created Dedicated Auth Check Endpoint

**File**: `src/app/api/auth/check/route.ts` (NEW)

A simple GET endpoint that checks if the user is authenticated:
- Uses Supabase's `getUser()` method to verify authentication
- Returns JSON with `isAuthenticated` boolean and user info
- Includes CORS headers for cross-origin requests
- Has proper error handling and logging

**Usage**:
```
GET https://tab-stasher.tab-stasher.workers.dev/api/auth/check
Headers: Content-Type: application/json
Returns: { isAuthenticated: true, user: { id, email } }
```

### 2. Updated Extension Authentication Check

**File**: `chrome-extension/background.js`

Changed `checkAuthentication()` method to:
- Use the new `/api/auth/check` endpoint instead of `/api/instagram-mapping`
- Parse JSON response properly
- Return user information if authenticated
- Better logging for debugging

### 3. Added Auth State Polling

**File**: `chrome-extension/popup.js`

New `pollForAuthCompletion()` method:
- Polls every 3 seconds for auth completion
- Checks for `authCompletedAt` flag in storage
- Runs for up to 3 minutes (180 attempts)
- Automatically updates UI when auth is detected
- Shows success message before closing popup

### 4. Enhanced Initialization

**File**: `chrome-extension/popup.js`

Updated `initialize()` method to:
- Check if login is already in progress
- Resume polling if user reopens popup mid-login
- Trust recently stored auth state (within 30 seconds)
- Fall back to API verification for older auth states

### 5. Improved checkAuthStatus

**File**: `chrome-extension/popup.js`

Enhanced to:
- Check stored auth state first (faster response)
- Only verify with API if auth state is older than 30 seconds
- Update storage with latest auth status
- Provide fallback for network errors

### 6. Better Storage Management

Chrome storage keys used:
- `authCompletedAt` - Timestamp when auth last completed
- `isAuthenticated` - Boolean flag for quick checks
- `loginInProgress` - Flag indicating login is in progress
- `loginStartedAt` - Timestamp when login was initiated

### 7. Improved Logout

**File**: `chrome-extension/popup.js`

Updated logout flow to:
- Clear all auth-related storage flags
- Show loading state
- Update UI immediately
- Refresh auth status after delay

## New Authentication Flow

```
1. User clicks "Log In"
   ↓
2. Extension sets loginInProgress flag
3. Opens login page in new tab
4. Shows "Opening login page..." status
5. Starts polling for auth completion every 3 seconds
   ↓
6. User completes login on website
7. Redirected to /dashboard
   ↓
8. Background script detects redirect
9. Retries auth check with exponential backoff
10. Auth check succeeds
   ↓
11. Background script sets authCompletedAt & isAuthenticated flags
12. Sends 'authCompleted' message to popup
   ↓
13. Popup polling detects authCompletedAt flag
14. Calls refreshAuthState()
15. Auth state updates to authenticated
16. UI shows "Save This Tab" button
17. Shows "Login successful!" message
   ↓
18. After 2 seconds: Popup closes (user is now authenticated)
```

## Testing Instructions

### Test 1: Fresh Login
1. Install extension in Chrome
2. Click extension icon
3. Click "Log In"
4. Complete login on Tab Stasher website
5. Verify popup updates to show authenticated state
6. Verify "Save This Tab" button is visible
7. Try saving a tab to confirm it works

### Test 2: Reopen Popup During Login
1. Click "Log In"
2. Close the popup (don't wait for completion)
3. Click extension icon again
4. Verify popup shows "Login in progress..."
5. Complete login
6. Verify popup updates automatically

### Test 3: Logout
1. Be logged in
2. Click "Log Out" button
3. Verify UI shows "Log In" button
4. Try logging in again

### Test 4: Persistent Login
1. Log in successfully
2. Close popup
3. Open popup again within 30 seconds
4. Verify it shows authenticated state immediately

## Technical Details

### Authentication Flow
- Extension uses cookie-based authentication (Supabase tokens in httpOnly cookies)
- Credentials sent with `credentials: 'include'` in fetch requests
- Browser automatically includes cookies in cross-origin requests

### Retry Logic
- Initial auth check delay: 1 second
- Exponential backoff: 1s → 1.5s → 2.25s
- Maximum 3 retries after redirect detection
- Total maximum wait: ~5 seconds

### Polling Configuration
- Poll interval: 3 seconds
- Maximum attempts: 60 (3 minutes total)
- Checks for `authCompletedAt` flag set by background script
- If found, immediately refreshes auth state

### State Persistence
- Uses `chrome.storage.local` (not synced across devices)
- Auth state expires after 30 seconds (verified with API)
- Older auth states require API verification
- Storage cleared on logout

## Files Modified/Created

### Created:
- `src/app/api/auth/check/route.ts` - Auth check endpoint

### Modified:
- `chrome-extension/background.js` - Auth endpoint & retry logic
- `chrome-extension/popup.js` - Polling, state persistence, UI updates
- `chrome-extension/popup.html` - Already had logout button (previous fix)

## Debugging

### Check Browser Console
```javascript
// In Chrome extension background script (go to chrome://extensions → Tab Stasher → service worker)
// Look for logs like:
"Auth check response: {status: 200, isAuthenticated: true, user: {email: 'user@example.com'}}"
"Auth completion detected via polling"
"Authentication successful!"
```

### Check Storage
```javascript
// In popup console:
chrome.storage.local.get(['authCompletedAt', 'isAuthenticated', 'loginInProgress'], (result) => {
  console.log('Auth storage:', result);
});
```

### Test Auth Endpoint Directly
```bash
# In browser console on Tab Stasher dashboard:
fetch('/api/auth/check', {
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

## API Response Examples

### Successfully Authenticated
```json
{
  "isAuthenticated": true,
  "user": {
    "id": "user-uuid-here",
    "email": "user@example.com"
  }
}
```

### Not Authenticated
```json
{
  "isAuthenticated": false,
  "user": null
}
```

### Error
```json
{
  "isAuthenticated": false,
  "error": "Internal server error"
}
```

## Security Considerations

- No sensitive data stored in chrome.storage
- Auth tokens remain in httpOnly cookies (browser-managed)
- API endpoint includes CORS headers
- Timeout protection on all fetch requests
- Proper error handling without exposing sensitive details
- Credentials only sent to Tab Stasher domain

## Performance Impact

- Polling: Lightweight (1 HTTP request every 3 seconds during login only)
- Auth checks: Minimal overhead (5 second timeout limit)
- Storage: Negligible (few small keys)
- No background processing when not logging in

## Known Limitations

- Polling has 3-minute timeout (then user must manually refresh)
- Auth state verified every 30 seconds with API check
- Requires active browser tab with extension (can't check auth in background)
- CORS dependent on Tab Stasher API configuration

## Future Enhancements

- [ ] Add service worker background sync for auth validation
- [ ] Store user profile info (name, avatar) locally
- [ ] Add offline detection and retry logic
- [ ] Implement refresh token rotation
- [ ] Add analytics for auth success rates
- [ ] Support multiple authentication methods (OAuth, etc.)
