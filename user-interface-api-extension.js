(function(){
  const endpoints = {
    health: '/api/health',
    manuals: '/api/manuals',
    manualDetail: id => '/api/manuals/' + encodeURIComponent(id),
    manualQuestions: id => '/api/manuals/' + encodeURIComponent(id) + '/questions',
    chat: '/api/chat',
    repairCreate: '/api/repair',
    repairQuote: '/api/repair/quote',
    feedback: '/api/feedback',
    eventTrack: '/api/events'
  };

  async function request(path, options = {}) {
    const { timeout = 8000, fallback = null, ...fetchOptions } = options;
    try {
      const res = await fetch(apiBaseUrl + path, { ...fetchOptions, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const type = res.headers.get('content-type') || '';
      return type.includes('application/json') ? await res.json() : await res.text();
    } catch (err) {
      if (typeof fallback === 'function') return fallback(err);
      if (fallback !== null) return fallback;
      throw err;
    }
  }

  window.UserApi = {
    health: () => request(endpoints.health, { timeout: 5000 }),
    manuals: () => request(endpoints.manuals, { timeout: 3500, fallback: null }),
    manualDetail: id => request(endpoints.manualDetail(id), { timeout: 3500, fallback: null }),
    manualQuestions: id => request(endpoints.manualQuestions(id), { timeout: 3500, fallback: null }),
    chatStream: payload => fetch(apiBaseUrl + endpoints.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
    createRepair: data => request(endpoints.repairCreate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }),
    quoteRepair: data => request(endpoints.repairQuote, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      fallback: null
    }),
    feedback: data => request(endpoints.feedback, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      fallback: null
    }),
    track: (eventName, payload = {}) => request(endpoints.eventTrack, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventName, payload, page: 'user', createdAt: new Date().toISOString() }),
      fallback: null
    })
  };

  if (typeof testConnection === 'function') {
    testConnection = async function(){
      const url = document.getElementById('apiUrl').value.trim();
      if(!url){ alert('请输入后端API地址'); return; }
      apiBaseUrl = url.replace(/\/$/,'');
      const btn = event.target; btn.textContent = '测试中...'; btn.disabled = true;
      try {
        const data = await UserApi.health();
        if(data.status === 'ok') alert('✅ 连接成功！\n服务：' + data.service + '\n模型：' + (data.model || 'unknown'));
        else alert('❌ 服务返回异常');
      } catch(e) {
        alert('❌ 连接失败：' + e.message + '\n\n请确认后端服务、地址端口、跨域和防火墙配置。');
      }
      btn.textContent = '测试连接'; btn.disabled = false;
    };
  }

  if (typeof sendViaAPI === 'function') {
    sendViaAPI = async function(text){
      try{
        const response = await UserApi.chatStream({ message: text, manualId: currentManualId, history: chatHistory });
        if(!response.ok) throw new Error('HTTP ' + response.status);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        messages.push({ id: 'ai-' + Date.now(), role: 'assistant', content: '' });
        while(true){
          const { done, value } = await reader.read();
          if(done) break;
          const lines = decoder.decode(value).split('\n');
          for(const line of lines){
            if(line.startsWith('data: ')){
              try{
                const data = JSON.parse(line.slice(6));
                if(data.content){ fullText += data.content; updateLastAssistantMessage(fullText); }
                if(data.finish_reason){ hideTyping(); return fullText; }
              }catch(e){}
            }
          }
        }
        hideTyping();
        if(!fullText) updateLastAssistantMessage('抱歉，AI未返回有效内容，请稍后重试。');
        return fullText;
      }catch(e){
        hideTyping();
        const errMsg = '❌ API调用失败：' + e.message + '\n\n已自动切换到本地模拟模式回答。';
        updateLastAssistantMessage(errMsg);
        return errMsg;
      }
    };
  }

  async function hydrateRemoteContent(){
    if (!localStorage.getItem('ai_api_url')) return;
    const remote = await UserApi.manuals();
    if (!remote || typeof remote !== 'object') return;
    if (remote.manuals && typeof manuals === 'object') Object.assign(manuals, remote.manuals);
    if (remote.quickQuestions && typeof quickQuestions === 'object') Object.assign(quickQuestions, remote.quickQuestions);
    if (typeof buildQuickTags === 'function') buildQuickTags();
    if (typeof renderManual === 'function') renderManual(currentManualId);
  }

  document.addEventListener('submit', async function(e){
    if (e.target && e.target.id === 'repairForm') {
      UserApi.track('repair_form_submit', { applianceId: currentManualId });
    }
  }, true);

  hydrateRemoteContent();
})();
