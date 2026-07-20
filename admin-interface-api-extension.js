(function(){
  const endpoints = {
    repairList: '/api/repair',
    repairStats: '/api/repair/stats',
    repairDetail: id => '/api/repair/' + encodeURIComponent(id),
    repairUpdate: id => '/api/repair/' + encodeURIComponent(id),
    repairAssign: id => '/api/repair/' + encodeURIComponent(id) + '/assign',
    technicians: '/api/technicians',
    exportRepairs: '/api/repair/export',
    eventTrack: '/api/events'
  };

  async function request(path, options = {}) {
    const { timeout = 8000, fallback = null, ...fetchOptions } = options;
    try {
      const res = await fetch(API_BASE + path, { ...fetchOptions, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const type = res.headers.get('content-type') || '';
      return type.includes('application/json') ? await res.json() : await res.text();
    } catch (err) {
      if (typeof fallback === 'function') return fallback(err);
      if (fallback !== null) return fallback;
      throw err;
    }
  }

  window.AdminApi = {
    listRepairs: () => request(endpoints.repairList, { timeout: 5000 }),
    stats: () => request(endpoints.repairStats, { timeout: 3500, fallback: null }),
    detail: id => request(endpoints.repairDetail(id), { timeout: 3500, fallback: null }),
    updateRepair: (id, updates) => request(endpoints.repairUpdate(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }),
    assignRepair: (id, data) => request(endpoints.repairAssign(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    technicians: () => request(endpoints.technicians, { timeout: 3500, fallback: [] }),
    exportRepairs: () => request(endpoints.exportRepairs, { timeout: 10000, fallback: null }),
    track: (eventName, payload = {}) => request(endpoints.eventTrack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, payload, page: 'admin', createdAt: new Date().toISOString() }),
      fallback: null
    })
  };

  if (typeof loadAppointments === 'function') {
    loadAppointments = async function(){
      try {
        allAppointments = await AdminApi.listRepairs();
      } catch (e) {
        allAppointments = JSON.parse(localStorage.getItem('repair_appointments') || '[]');
      }
      applyFilters();
      updateStats();
      syncRemoteStats();
    };
  }

  window.syncRemoteStats = async function(){
    const stats = await AdminApi.stats();
    if (!stats) return;
    const counts = stats.counts || stats;
    document.getElementById('statPending').textContent = counts.pending || 0;
    document.getElementById('statConfirmed').textContent = (counts.confirmed || 0) + (counts.assigned || 0);
    document.getElementById('statProcessing').textContent = counts.processing || 0;
    document.getElementById('statCompleted').textContent = counts.completed || 0;
    document.getElementById('statTotal').textContent = stats.total || allAppointments.length || 0;
  };

  if (typeof updateStatus === 'function') {
    updateStatus = async function(id, action){
      const statusMap = { confirm: 'confirmed', assign: 'assigned', process: 'processing', complete: 'completed', cancel: 'cancelled' };
      const newStatus = statusMap[action];
      if (!newStatus) return;
      try {
        await AdminApi.updateRepair(id, { status: newStatus });
        AdminApi.track('repair_status_updated', { id, status: newStatus });
        loadAppointments();
        return;
      } catch (e) {}
      const appts = JSON.parse(localStorage.getItem('repair_appointments') || '[]');
      const idx = appts.findIndex(a => a.id === id);
      if (idx !== -1) {
        appts[idx].status = newStatus;
        appts[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('repair_appointments', JSON.stringify(appts));
        loadAppointments();
      }
    };
  }

  if (typeof saveDetail === 'function') {
    saveDetail = async function(){
      if (!currentDetailId) return;
      const updates = {
        status: document.getElementById('detailStatus').value,
        repairNotes: document.getElementById('detailNotes').value
      };
      try {
        await AdminApi.updateRepair(currentDetailId, updates);
        AdminApi.track('repair_detail_saved', { id: currentDetailId, status: updates.status });
        closeDetailModal();
        loadAppointments();
        return;
      } catch (e) {}
      const appts = JSON.parse(localStorage.getItem('repair_appointments') || '[]');
      const idx = appts.findIndex(a => a.id === currentDetailId);
      if (idx !== -1) {
        appts[idx].status = updates.status;
        appts[idx].repairNotes = updates.repairNotes;
        appts[idx].updatedAt = new Date().toISOString();
        localStorage.setItem('repair_appointments', JSON.stringify(appts));
        closeDetailModal();
        loadAppointments();
      }
    };
  }

  loadAppointments();
})();
