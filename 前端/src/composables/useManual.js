import { ref, computed } from 'vue'
import { manuals, troubleIcons, colorMap, AI_CONFIG } from '@/data/manuals.js'
import request from '@/api/request.js'

export function useManual() {
  const currentManualId = ref('air')
  const features = ref([])
  const troubles = ref([])
  const loadingFeatures = ref(true)
  const loadingTroubles = ref(true)
  const apiBaseUrl = AI_CONFIG.apiBaseUrl

  const manual = computed(() => manuals[currentManualId.value])

  const currentTroubleItems = computed(() => {
    const m = manuals[currentManualId.value]
    return m?.troubleItems?.map(t => ({ title: t, icon: troubleIcons[t] || '\u{1F527}' })) || []
  })

  async function loadRemoteData(manualId) {
    loadingFeatures.value = true
    loadingTroubles.value = true
    features.value = []
    troubles.value = []

    if (AI_CONFIG.mode === 'api' && apiBaseUrl) {
      try {
        const res = await request.get(`/manuals/${manualId}`, { timeout: 5000 })
        if (res?.features) features.value = res.features
        if (res?.troubles) troubles.value = res.troubles
      } catch (e) {
        console.log('API加载失败:', e.message)
      }
    }

    loadingFeatures.value = false
    loadingTroubles.value = false

    // 如果API没数据，使用本地故障列表
    if (!troubles.value.length) {
      const m = manuals[manualId]
      troubles.value = m?.troubleItems?.map(t => ({ title: t })) || []
    }
  }

  function selectManual(id) {
    currentManualId.value = id
    loadRemoteData(id)
  }

  function renderSections(key) {
    const m = manuals[key]
    if (!m) return ''
    return m.sections.map(([title, items], idx) => {
      const list = items.map(item => `<li>${item}</li>`).join('')
      const noticeClass = idx === 1 ? 'warning' : 'tip'
      const noticeText = idx === 1
        ? '安全提示：使用前请完整阅读本章节。'
        : '提示：不同批次产品的显示文案可能略有差异，请以实物为准。'
      let diagramHtml = ''
      if (idx === 2) {
        diagramHtml = `<div class="diagram"><div class="diagram-inner"><div class="panel-visual" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div><div style="font-size:13px;color:var(--muted);font-weight:600;">${m.diagram}</div></div></div>`
      }
      return `<section class="manual-section" id="section-${key}-${idx}">
        <h3><span class="section-num">${idx + 1}</span>${title}</h3>
        <ul>${list}</ul>${diagramHtml}
        <div class="notice ${noticeClass}"><span>${noticeText}</span></div>
      </section>`
    }).join('')
  }

  function renderToc(key) {
    const m = manuals[key]
    if (!m) return ''
    return m.sections.map(([title], idx) =>
      `<a href="#section-${key}-${idx}">${title}</a>`
    ).join('')
  }

  // Init
  loadRemoteData('air')

  return {
    currentManualId,
    manual,
    features,
    troubles,
    currentTroubleItems,
    loadingFeatures,
    loadingTroubles,
    colorMap,
    selectManual,
    loadRemoteData,
    renderSections,
    renderToc
  }
}
