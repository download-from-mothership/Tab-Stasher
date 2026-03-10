# Tab Saving Diagnostics Guide

## Symptom
- Extension shows "Tab Saved!" toast notification ✅
- Popup shows success message ✅
- But tab doesn't appear in dashboard ❌

## Possible Causes

### 1. **CORS Issue** (Most Common for Cross-Origin Requests)
**Symptoms**:
- Success message shows but no error in console
- Tab appears saved but doesn't persist
- Backend logs show no request received

**Check**:
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try to save a tab
4. Look for `/api/tabs` request
5. Check **Headers** tab:
   - Should see `Request Headers`: `Origin: chrome-extension://...`
   - Should see `Response Headers`: `Access-Control-Allow-Origin: *`

**Solution**:
```typescript
// The /api/tabs endpoint has CORS headers:
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Return these headers in response
return NextResponse.json(result, { headers })
```

### 2. **Cookies Not Being Sent**
**Symptoms**:
- 401 Unauthorized error
- Backend gets 401 response

**Check**:
1. In DevTools Network tab → `/api/tabs` request
2. Check **Cookies** tab
3. Should see: `sb-access-token` and `sb-refresh-token` cookies

**Solution**:
The extension already uses `credentials: 'include'`:
```javascript
const response = await fetch(`${this.apiBaseUrl}/api/tabs`, {
  method: 'POST',
  credentials: 'include', // ← This sends cookies
  ...
});
```

### 3. **User ID Mismatch**
**Symptoms**:
- Tab saves successfully (200 OK)
- But shows in different user's dashboard
- Or doesn't show at all

**Check**:
1. Open Dashboard
2. Open browser DevTools console
3. Run:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user ID:', user.id);
```

4. Then in extension DevTools (Service Worker):
   - Look for logs: `Auth check response: { isAuthenticated: true, user: ... }`
   - Verify the user ID matches

### 4. **Database Issue**
**Symptoms**:
- API returns 200 OK
- But nothing appears in database
- No error in backend logs

**Check**:
1. Open browser DevTools → extension Service Worker
2. Look for: `✅ Tab saved successfully: { tabId: "...", title: "..." }`
3. If you see this but no dashboard update, check database:
   ```sql
   SELECT * FROM tabs WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 10;
   ```

### 5. **Dashboard Not Refreshing**
**Symptoms**:
- Tab is saved (200 OK response)
- Tab IS in database
- But dashboard doesn't show it
- Page needs manual refresh to see new tab

**Check**:
1. Open dashboard page
2. Check browser DevTools console for errors
3. Look for `refreshTabs()` being called

**Solution**:
The dashboard auto-refreshes when tabs are saved via the web interface, but not via extension. This might be expected behavior since the extension doesn't trigger the dashboard's refresh callback.

**Workaround**:
- Add a "Refresh" button to dashboard
- Or manually refresh the page after saving

## Diagnostic Steps

### Step 1: Check Extension Logs
1. Go to `chrome://extensions/`
2. Click **Details** on Tab Stasher
3. Click **Service worker** or **Inspect**
4. Try saving a tab
5. Look for these exact logs:

```
✅ Tab saved successfully: { tabId: "...", title: "...", url: "..." }
```

If you see this, the API accepted the tab.

### Step 2: Check API Response
In DevTools Network tab, click the `/api/tabs` request:

**Response tab** should show:
```json
{
  "id": "tab-uuid-here",
  "url": "https://example.com",
  "title": "Page Title",
  "description": "...",
  "user_id": "user-uuid-here",
  "status": "active",
  "created_at": "2024-10-21T..."
}
```

**Status** should be `200 OK`

### Step 3: Check Dashboard User
In Dashboard page console:
```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Dashboard user ID:', user.id);

// Query their tabs
const { data: tabs } = await supabase
  .from('tabs')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
console.log('User tabs:', tabs);
```

### Step 4: Check Saved Tab
If you have the tab ID from the extension logs:

```javascript
const { data: tab } = await supabase
  .from('tabs')
  .select('*')
  .eq('id', 'tab-id-from-extension');
console.log('Saved tab:', tab);
```

## Common Scenarios

### Scenario 1: Success Message + Tab in Database = Dashboard Refresh Needed
**Solution**: Manual page refresh
```javascript
// In dashboard console:
window.location.reload();
```

### Scenario 2: Success Message + Tab NOT in Database
**Cause**: Database error or permission issue
**Solution**: Check backend logs for errors in `save_tab_with_tags` function

### Scenario 3: Error Message (but no visible error)
**Solution**:
1. Check extension Service Worker logs
2. Look for: `Error saving tab: ...`
3. Check exact error message

### Scenario 4: No Response at All
**Cause**: CORS blocked or network timeout
**Solution**:
1. Check DevTools Network tab for failed requests
2. Look for CORS errors
3. Try saving again with longer timeout

## Manual Testing

### Test 1: Save a Tab and Check Logs
```
1. Open extension popup
2. Click "Save This Tab"
3. Go to chrome://extensions/
4. Click Service worker for Tab Stasher
5. Look for "✅ Tab saved successfully"
6. Copy the tabId
```

### Test 2: Query the Tab
```javascript
// In Dashboard console:
const { data: tab } = await supabase
  .from('tabs')
  .select('*')
  .eq('id', 'PASTE-TAB-ID-HERE');
console.log('Tab from DB:', tab);
```

### Test 3: Compare User IDs
```javascript
// In Dashboard console - get dashboard user
const dashUser = (await supabase.auth.getUser()).data.user;
console.log('Dashboard user:', dashUser.id);

// In extension Service Worker - check who saved the tab
// Look for logs showing user ID during auth check
```

### Test 4: Full Flow
```javascript
// 1. Clear extension storage
chrome.storage.local.clear();

// 2. Log in fresh
// Click "Log In" in extension

// 3. Check auth state
chrome.storage.local.get(null, (result) => console.log('Storage:', result));

// 4. Save a tab

// 5. Check logs in Service Worker console
// Should see all steps logged

// 6. Check database
// Via Dashboard console
```

## Quick Checklist

- [ ] Extension login works ✅
- [ ] Tab save shows success message ✅
- [ ] Check Service Worker logs for "✅ Tab saved successfully"
- [ ] Check Network tab for 200 OK response
- [ ] Verify user ID matches between extension and dashboard
- [ ] Query database directly for saved tab
- [ ] Manual dashboard page refresh
- [ ] Tab appears after refresh
- [ ] Check for any error messages in console
- [ ] Verify cookies are being sent in request

## Still Not Working?

1. **Collect all logs**:
   - Extension Service Worker console (full session)
   - DevTools Network tab (the /api/tabs request)
   - Dashboard console output
   - Backend server logs

2. **Try the database query directly**:
   ```sql
   SELECT * FROM tabs
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC;
   ```

3. **Check for errors**:
   - Backend logs for any SQL/database errors
   - Check `save_tab_with_tags` function return values
   - Verify user_id is being passed correctly

4. **Test with web form**:
   - Use the dashboard "Add Tab" form to save a tab
   - If that works, issue is specific to extension
   - If that fails, issue is backend/database
