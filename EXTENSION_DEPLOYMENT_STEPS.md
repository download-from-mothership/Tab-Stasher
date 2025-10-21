# Extension Deployment Steps

## Overview
This document outlines the steps to deploy the fixed Chrome extension with proper authentication state management.

## What Was Fixed

### Backend (Tab Stasher API)
- ✅ Created new `/api/auth/check` endpoint for reliable authentication verification
- **File**: `src/app/api/auth/check/route.ts`

### Extension (Chrome)
- ✅ Fixed popup state management during login
- ✅ Added auth completion polling
- ✅ Implemented better state persistence
- ✅ Improved authentication detection
- ✅ Added logout functionality

## Deployment Checklist

### Step 1: Deploy Backend Changes

1. **Deploy the new auth endpoint**
   - File location: `src/app/api/auth/check/route.ts`
   - This is a new GET endpoint
   - No database changes needed
   - No environment variables needed

2. **Verify deployment**
   ```bash
   # Test the endpoint is accessible
   curl -X GET https://tab-stasher.tab-stasher.workers.dev/api/auth/check \
     -H "Content-Type: application/json" \
     -b "sb-access-token=your-token"

   # Should return:
   # {"isAuthenticated": false, "user": null} if not logged in
   # {"isAuthenticated": true, "user": {...}} if logged in
   ```

### Step 2: Update Extension Files

1. **Update background.js**
   - Change auth check endpoint from `/api/instagram-mapping` to `/api/auth/check`
   - No manual changes needed - already updated in files

2. **Update popup.js**
   - Added polling mechanism for login completion
   - Added storage management for auth state
   - No manual changes needed - already updated in files

3. **Update manifest.json**
   - Already updated with CSP headers (from previous fix)

### Step 3: Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Find "Tab Stasher" extension
3. Click the refresh icon to reload
4. Or disable and re-enable the extension

### Step 4: Test the Flow

#### Test 1: Fresh Login
```
1. Open Chrome
2. Navigate to any website (e.g., www.google.com)
3. Click Tab Stasher extension icon
4. Click "Log In"
5. Complete login on Tab Stasher website
6. Verify popup shows authenticated state
7. Verify "Save This Tab" button is visible
```

#### Test 2: Save a Tab
```
1. Stay logged in from Test 1
2. Navigate to another website
3. Click Tab Stasher extension
4. Click "Save This Tab"
5. Verify success notification appears
6. Check Tab Stasher dashboard for the saved tab
```

#### Test 3: Logout
```
1. With extension open and authenticated
2. Click "Log Out" button
3. Verify UI shows "Log In" button
```

#### Test 4: Refresh Extension Mid-Login
```
1. Click "Log In"
2. Extension opens login page
3. Go back to Chrome and refresh the extension (chrome://extensions/)
4. Click extension icon again
5. Close/reopen popup mid-login
6. Verify it detects the login is in progress
```

### Step 5: Monitor and Debug

#### Check Logs in Extension
1. Go to `chrome://extensions/`
2. Click "Details" on Tab Stasher
3. Click "Background script" (or service worker)
4. Look for console logs with auth check results

#### Check Backend Logs
1. Monitor server logs for `/api/auth/check` requests
2. Look for success/failure patterns
3. Check response times

#### Common Issues and Fixes

**Issue**: Extension still shows "Log In" after login
- **Fix**:
  1. Check that `/api/auth/check` endpoint is deployed and accessible
  2. Reload extension in chrome://extensions/
  3. Check browser console for error messages
  4. Verify cookies are being sent with requests

**Issue**: Polling timeout message appears
- **Fix**:
  1. Increase polling timeout in `pollForAuthCompletion()` if needed
  2. Check server response times
  3. Verify network connectivity

**Issue**: "Login successful" message doesn't show
- **Fix**:
  1. Check that auth check passes (curl the endpoint)
  2. Verify storage is working (check devtools)
  3. Reload extension

## Rollback Plan

If issues occur, you can quickly revert:

1. **Extension**:
   - Go to `chrome://extensions/`
   - Disable Tab Stasher
   - Wait a few seconds
   - Re-enable Tab Stasher
   - (This will use the old cached version if not fully reloaded)

2. **API**:
   - If the new endpoint causes issues, it's not used by existing code
   - Can be safely removed without breaking existing functionality
   - Just revert the `src/app/api/auth/check/route.ts` file

## Metrics to Monitor

After deployment, monitor these metrics:

- **Auth check endpoint response time** (target: < 500ms)
- **Auth check success rate** (target: > 95%)
- **Login completion rate** (how many users successfully log in)
- **Polling timeout rate** (how many logins timeout)
- **Extension crashes** (if any)

## Performance Impact

- **Minimal**: The new endpoint is lightweight and only called when needed
- **No impact** on existing functionality
- **Improved**: Login reliability and user experience

## Files Summary

### New Files
```
src/app/api/auth/check/route.ts          - New auth verification endpoint
chrome-extension/AUTHENTICATION_FIX.md   - Documentation of the fix
```

### Modified Files
```
chrome-extension/background.js           - Updated auth check endpoint
chrome-extension/popup.js                - Added polling & state management
chrome-extension/manifest.json           - Already had CSP headers (from previous fix)
```

### Documentation
```
AUTHENTICATION_FIX.md                    - Detailed fix documentation
EXTENSION_DEPLOYMENT_STEPS.md            - This file
```

## Questions?

If you have issues during deployment:

1. Check the `AUTHENTICATION_FIX.md` for detailed technical information
2. Enable debugging in the extension (chrome://extensions/)
3. Check server logs for `/api/auth/check` requests
4. Verify cookies are properly configured
5. Test the endpoint directly with curl

## Success Indicators

✅ Users can log in through the extension
✅ Extension state updates after login
✅ "Save This Tab" button appears when authenticated
✅ Tabs can be saved successfully
✅ Logout works properly
✅ Logging back in works

## Timeline

- **Deploy API endpoint**: 5 minutes
- **Update extension code**: 2 minutes (just refresh in chrome://extensions/)
- **Testing**: 10 minutes
- **Monitor**: Ongoing

**Total deployment time**: ~20 minutes
