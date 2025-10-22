# Chrome Extension Service Worker Guide

## Why Service Worker Shows as "Inactive"

**This is completely normal!** Chrome terminates idle service workers to save resources. The service worker:
- ✅ Starts automatically when the extension loads
- ✅ Wakes up immediately when a message arrives
- ✅ Handles the message
- ✅ Goes back to sleep when idle

This is Chrome's design - not a bug.

## How to View Service Worker Logs

### Method 1: Keep Service Worker Inspector Open (Recommended)

1. Go to `chrome://extensions/`
2. Find **"Tab Stasher"**
3. Click **"Details"**
4. Click **"Service worker"** or **"Inspect"** button
   - A console window opens
5. **Keep this window open** while testing
6. Perform an action (login, save tab, etc.)
7. Logs appear in real-time in the console

### Method 2: View Logs After Action

1. Perform action (save a tab, login, etc.)
2. Immediately go to `chrome://extensions/`
3. Click **"Service worker"** on Tab Stasher
4. Logs from the last few seconds appear
5. The service worker will be active/highlighted

**Note**: If too much time passes, logs may be cleared when service worker shuts down.

## Understanding the Logs

### Startup Logs
When extension loads or service worker wakes up:
```
🚀 Tab Stasher Background Script Initializing...
✅ Tab Stasher Background Script Initialized
```

### Message Logs
When popup sends a command:
```
📨 Message received: saveTab
[processing...]
✅ saveTab response sent
```

### Auth Flow Logs
During login:
```
📨 Message received: handleAuth
🔐 Handling authentication flow...
Checking authentication with /api/auth/check endpoint...
[retries with backoff]
✅ Authentication successful!
✅ handleAuth complete, response sent
```

### Tab Saving Logs
When saving a tab:
```
📨 Message received: saveTab
Tab save response: {
  status: 200,
  statusText: "OK",
  ok: true,
  headers: { contentType: "application/json" }
}
✅ Tab saved successfully: {
  tabId: "...",
  title: "...",
  url: "..."
}
✅ saveTab response sent
```

### Error Logs
If something fails:
```
❌ saveTab error: Network error or specific error message
```

## Troubleshooting Service Worker

### Service Worker Won't Show Logs

**Problem**: Click "Service worker" but nothing happens

**Solution**:
1. The service worker might be sleeping
2. Perform an action (save a tab, login) immediately
3. Quickly open the service worker inspector
4. You should see logs from that action

### Can't Click Service Worker Button

**Possible causes**:
1. Extension not properly loaded
2. Extension has an error during initialization

**Fix**:
1. Go to `chrome://extensions/`
2. Toggle Tab Stasher off/on to reload it
3. Try again

### All Logs Show "Inactive"

**This is normal!** Service workers are inactive by design when idle.

**What to do**:
1. Open service worker inspector
2. Perform action (save tab, login)
3. Service worker wakes up and processes
4. Logs appear
5. Service worker goes back to sleep

## Expected Log Sequence for Tab Saving

```
1. 📨 Message received: saveTab
2. Checking authentication...
3. Auth check response (status 200 or fallback)
4. Preparing payload...
5. Tab save response: { status: 200, ok: true }
6. ✅ Tab saved successfully: { tabId: "...", ... }
7. 📨 Message received: showNotification
8. ✅ saveTab response sent
```

If you see this entire sequence, the tab was saved successfully.

## Expected Log Sequence for Login

```
1. 📨 Message received: handleAuth
2. 🔐 Handling authentication flow...
3. Opening login page...
4. (User logs in on website)
5. Redirect detected to /dashboard
6. Checking authentication: /api/auth/check
7. Auth check attempt: { isAuthenticated: true, ... }
8. ✅ Authentication successful!
9. 📨 Message received: authCompleted
10. ✅ handleAuth complete, response sent
```

## Checking if Tab Was Saved

After saving, check:
1. Do you see "✅ Tab saved successfully" in logs?
2. If yes → Tab was sent to API
3. Then check dashboard:
   - Refresh the page (Ctrl+R)
   - Does the tab appear?

## Common Issues and Logs

### Issue: "Service worker inactive"
```
This is normal. Just open inspector and perform action.
```

### Issue: "Tab save shows error"
```
Look for: ❌ saveTab error: [error message]
This tells you exactly what failed
```

### Issue: "Auth fails"
```
Look for: ❌ Auth check error: [error message]
Or: ⏳ Auth check failed, retrying...
```

### Issue: "Notification shows but tab doesn't save"
```
Check logs for "✅ Tab saved successfully"
If present → Tab was saved, dashboard just needs refresh
If missing → Check error in logs
```

## Monitoring Service Worker Health

### Good Signs
- ✅ Logs appear quickly when performing action
- ✅ "Message received" logs show expected actions
- ✅ See "Response sent" logs
- ✅ No error logs (❌)

### Bad Signs
- ❌ No logs appear when performing action
- ❌ Error messages in logs
- ❌ Messages received but no response sent
- ❌ Repeated error log patterns

## Developer Tips

### Keep Inspector Open While Testing
Pin the service worker inspector window so you can see logs in real-time:
1. Open service worker inspector
2. Right-click window title → "Keep on top"
3. Resize to see alongside extension

### View All Logs
Clear old logs and start fresh:
```javascript
// In service worker console
console.clear();
// Now perform action and logs will be clean
```

### Search Logs
Use console filter (search icon in DevTools):
1. Click filter icon
2. Type keyword: "Tab saved", "Auth", "error", etc.
3. Shows only matching logs

### Export Logs
Copy all logs for debugging:
```javascript
// In service worker console
copy(console.log.toString());
```

## Service Worker Lifecycle

```
1. Extension loads
   └─ Service worker starts
      └─ "🚀 Initializing..." log appears
      └─ "✅ Initialized" log appears

2. Popup sends message
   └─ Service worker wakes up (if sleeping)
   └─ "📨 Message received" log appears
   └─ Processes message
   └─ Sends response
   └─ Goes back to sleep

3. No activity for ~30 seconds
   └─ Service worker goes to sleep (normal)

4. Next message
   └─ Service worker wakes up again
   └─ Cycle repeats
```

This is efficient and by design in Chrome.

## When to Check Logs

**Before performing action**:
1. Open service worker inspector
2. Click in console area so it's focused
3. Perform action
4. Watch logs appear in real-time

**If you miss it**:
1. Keep inspector open
2. Perform action again
3. Logs will be visible

## Service Worker vs Content Script

Two different contexts:
- **Service Worker** (background.js)
  - Handles API requests
  - Manages authentication
  - Listens for popup messages
  - `chrome://extensions/` → Service worker button

- **Content Script** (content.js)
  - Runs on every webpage
  - Extracts page content
  - Shows toast notifications
  - Not easily inspectable (normal behavior)

For tab saving issues, focus on **Service Worker** logs.

## Still Having Issues?

1. Open service worker inspector
2. Perform the problematic action
3. Look for these:
   - 📨 Message received
   - ❌ Any error messages
   - ✅ Response sent
4. Share the full log sequence
5. Include any ❌ error messages

The detailed logging should help identify exactly where the problem is!
