'use client';

import { useState, useEffect, useCallback } from 'react';

interface SyncState {
  lastSync: string | null;
  isSyncing: boolean;
  error: string | null;
  tabsSynced: number;
}

export function SyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>({
    lastSync: null,
    isSyncing: false,
    error: null,
    tabsSynced: 0
  });
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load last sync time from localStorage
    const lastSync = localStorage.getItem('tabstasher_last_sync');
    if (lastSync) {
      setSyncState(prev => ({ ...prev, lastSync }));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (syncState.isSyncing) return;

    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const lastSync = localStorage.getItem('tabstasher_last_sync');
      const params = new URLSearchParams();
      if (lastSync) params.set('since', lastSync);

      const response = await fetch(`/api/sync?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data = await response.json();

      localStorage.setItem('tabstasher_last_sync', data.serverTime);

      setSyncState({
        lastSync: data.serverTime,
        isSyncing: false,
        error: null,
        tabsSynced: data.count
      });
    } catch (error: any) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message
      }));
    }
  }, [syncState.isSyncing]);

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '8px',
      background: isOnline ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${isOnline ? '#bbf7d0' : '#fecaca'}`,
      fontSize: '12px',
      color: isOnline ? '#166534' : '#991b1b'
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: isOnline ? '#22c55e' : '#ef4444',
        display: 'inline-block'
      }} />

      <span>{isOnline ? 'Online' : 'Offline'}</span>

      <span style={{ color: '#6b7280', margin: '0 4px' }}>|</span>

      <span style={{ color: '#6b7280' }}>
        Synced: {formatLastSync(syncState.lastSync)}
      </span>

      <button
        onClick={syncNow}
        disabled={syncState.isSyncing || !isOnline}
        style={{
          marginLeft: 'auto',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #d1d5db',
          background: syncState.isSyncing ? '#f3f4f6' : '#ffffff',
          fontSize: '11px',
          cursor: syncState.isSyncing || !isOnline ? 'not-allowed' : 'pointer',
          color: '#374151'
        }}
      >
        {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      {syncState.error && (
        <span style={{ color: '#dc2626', fontSize: '11px' }}>
          {syncState.error}
        </span>
      )}
    </div>
  );
}
