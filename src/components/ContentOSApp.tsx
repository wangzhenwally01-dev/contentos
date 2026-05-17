'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ===== 类型定义 =====
interface User { id: string; email: string }
interface Account { id?: string; name: string; emoji: string; industry: string; positioning: string; targetAudience: string; color: string; user_id?: string }
interface CopyVersion { style: string; hook: string; content: string }
interface Topic { title: string; category: string; reason: string; hook: string; tags: string[] }
interface Insight { icon: string; title: string; detail: string }
interface SavedContent { id?: string; topic: string; style: string; content: string; created_at?: string }
interface StyleTemplate { id: string; name: string; summary: string; traits: string[]; structure: any; vocabulary: any; examples: any; bestFor: string[]; score: number }
interface CreatorVideo { rank: number; title: string; script: string; likes: number; comments: number; collects: number; shares: number; publishDate: string; duration: string; tags: string[]; hook: string; type: string }
interface RadarData { date: string; mediaHotspots: any[]; industryTrends: any[]; viralFormats: any[]; keywords: any[]; todayAction: any }

// ===== 默认数据 =====
const DEFAULT_ACCOUNTS: Account[] = [
  { name: '老李面馆', emoji: '🍜', industry: '餐饮', positioning: '本地餐饮·老板IP流·面馆老板的真实日常', targetAudience: '周边3km上班族、家庭用户，25-45岁', color: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
  { name: '美颜工坊', emoji: '💆', industry: '美业', positioning: '本地美容·技术流·真实效果展示', targetAudience: '25-40岁女性，注重外貌管理', color: 'linear-gradient(135deg,#4ECDC4,#44A08D)' },
]

const HOTSPOTS = [
  { rank: 1, title: '#端午节限定套餐', heat: '2.3M播放 · ↑340%', rel: '强相关', relColor: '#FF9500' },
  { rank: 2, title: '#餐饮老板真实日常', heat: '1.8M播放 · ↑180%', rel: '相关', relColor: '#007AFF' },
  { rank: 3, title: '#创业踩坑经历', heat: '1.2M播放 · ↑95%', rel: '相关', relColor: '#007AFF' },
  { rank: 4, title: '#本地探店攻略', heat: '980K播放 · ↑62%', rel: '一般', relColor: '#8E8E93' },
  { rank: 5, title: '#上班族午餐推荐', heat: '760K播放 · ↑48%', rel: '强相关', relColor: '#34C759' },
]

const QUICK_TOPICS = [
  '开店3年，我踩过的5个最贵的坑',
  '为什么我的店午餐时间总是排队？',
  '顾客说了一句话，让我感动了好久',
  '上班族午餐选择困难？30元吃好吃饱',
]

const TV = { '--bg': '#F2F2F7', '--card': '#FFF', '--card2': '#F9F9FB', '--inp': '#EFEFF4', '--tab-bg': 'rgba(255,255,255,.96)', '--b': 'rgba(0,0,0,.07)', '--t1': '#1C1C1E', '--t2': '#3A3A3C', '--t3': '#8E8E93', '--t4': '#C7C7CC', '--accent': '#007AFF', '--green': '#34C759', '--orange': '#FF9500', '--purple': '#AF52DE', '--red': '#FF3B30' }

export default function ContentOSApp() {
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<'dashboard' | 'materials' | 'content' | 'positioning' | 'operations'>('dashboard')
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [account, setAccount] = useState(0)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<any>(null)
  const [contentStep, setContentStep] = useState(1)
  const [selectedTopic, setSelectedTopic] = useState('开面馆 3 年，我踩过的 5 个最贵的坑')
  const [copyStyle, setCopyStyle] = useState('犀利观点')
  const [userInput, setUserInput] = useState('')
  const [copyVersions, setCopyVersions] = useState<CopyVersion[]>([])
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [copyTokens, setCopyTokens] = useState<number | null>(null)
  const [aiTopics, setAiTopics] = useState<Topic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [matTab, setMatTab] = useState<'hotspot' | 'topics' | 'saved' | 'creator' | 'radar'>('hotspot')
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [savedContents, setSavedContents] = useState<SavedContent[]>([])
  const [posStep, setPosStep] = useState(0)
  const [posForm, setPosForm] = useState({ industry: '', product: '', targetCustomer: '', city: '', advantage: '' })
  const [posResult, setPosResult] = useState<any>(null)
  const [posLoading, setPosLoading] = useState(false)
  // 博主追踪
  const [creatorUrl, setCreatorUrl] = useState('')
  const [creatorCount, setCreatorCount] = useState(20)
  const [creatorSort, setCreatorSort] = useState('likes')
  const [creatorLoading, setCreatorLoading] = useState(false)
  const [creatorData, setCreatorData] = useState<any>(null)
  const [trackedCreators, setTrackedCreators] = useState<any[]>([])
  const [creatorView, setCreatorView] = useState<'list' | 'detail'>('list')
  // 内容情报雷达
  const [radarData, setRadarData] = useState<RadarData | null>(null)
  const [radarLoading, setRadarLoading] = useState(false)
  const [radarTab, setRadarTab] = useState<'hotspot' | 'format' | 'keyword' | 'action'>('hotspot')
  // 文案风格模板
  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>([])
  const [styleMode, setStyleMode] = useState<'list' | 'create' | 'detail'>('list')
  const [styleInput, setStyleInput] = useState('')
  const [styleUrl, setStyleUrl] = useState('')
  const [styleName, setStyleName] = useState('')
  const [styleLoading, setStyleLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<StyleTemplate | null>(null)

  const acc = accounts[account] || accounts[0]

  // 检查登录状态
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email! })
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ id: session.user.id, email: session.user.email! })
      else setUser(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 加载保存的内容
  useEffect(() => {
    if (user) loadSavedContents()
  }, [user])

  // 加载本地风格模板
  useEffect(() => {
    try {
      const local = localStorage.getItem('contentos_style_templates')
      if (local) setStyleTemplates(JSON.parse(local))
    } catch {}
    try {
      const local = localStorage.getItem('contentos_tracked_creators')
      if (local) setTrackedCreators(JSON.parse(local))
    } catch {}
  }, [])

  async function loadSavedContents() {
    try {
      const { data, error } = await supabase.from('contents').select('*').order('created_at', { ascending: false }).limit(20)
      if (data && !error) { setSavedContents(data); return }
    } catch {}
    try {
      const local = localStorage.getItem('contentos_saved')
      if (local) setSavedContents(JSON.parse(local))
    } catch {}
  }

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  async function handleAuth() {
    setAuthLoading(true); setAuthError('')
    try {
      if (authMode === 'register') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
        if (error) setAuthError(error.message)
        else showToast('注册成功，请查收验证邮件')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) setAuthError('邮箱或密码错误')
      }
    } catch { setAuthError('网络错误，请重试') }
    finally { setAuthLoading(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    showToast('已退出登录')
  }

  async function generateCopy() {
    setCopyLoading(true); setCopyVersions([]); setCopyError('')
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicTitle: selectedTopic, accountName: acc.name, industry: acc.industry, positioning: acc.positioning, targetAudience: acc.targetAudience, style: copyStyle, userInput }),
      })
      const data = await res.json()
      if (data.success) { setCopyVersions(data.versions); setCopyTokens(data.tokens); setExpandedIdx(0) }
      else setCopyError(data.error || '生成失败')
    } catch { setCopyError('网络错误，请重试') }
    finally { setCopyLoading(false) }
  }

  async function saveCopy(version: CopyVersion) {
    const newItem = {
      id: Date.now().toString(),
      topic: selectedTopic, style: version.style, content: version.content,
      account_name: acc.name, created_at: new Date().toISOString()
    }
    if (user) {
      try {
        const { error } = await supabase.from('contents').insert({
          user_id: user.id, topic: selectedTopic, style: version.style, content: version.content, account_name: acc.name
        })
        if (!error) { showToast('✅ 文案已保存'); loadSavedContents(); return }
      } catch {}
    }
    try {
      const local = localStorage.getItem('contentos_saved')
      const existing: SavedContent[] = local ? JSON.parse(local) : []
      const updated = [newItem, ...existing].slice(0, 50)
      localStorage.setItem('contentos_saved', JSON.stringify(updated))
      setSavedContents(updated)
      showToast('✅ 文案已保存（本地）')
    } catch { showToast('保存失败') }
  }

  async function generateTopics() {
    setTopicsLoading(true); setAiTopics([])
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positioning: acc.positioning, industry: acc.industry, accountName: acc.name }),
      })
      const data = await res.json()
      if (data.success) setAiTopics(data.topics)
    } catch {}
    finally { setTopicsLoading(false) }
  }

  async function generateInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views: '12.3万', likes: '8900', comments: '342', collects: '1200' }),
      })
      const data = await res.json()
      if (data.success) { setInsights(data.insights); setShowInsights(true) }
    } catch {}
    finally { setInsightsLoading(false) }
  }

  async function generatePositioning() {
    setPosLoading(true)
    try {
      const res = await fetch('/api/generate-positioning', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posForm),
      })
      const data = await res.json()
      if (data.success) {
        setPosResult(data.result); setPosStep(2)
        if (user) {
          try { await supabase.from('positionings').insert({ user_id: user.id, ...posForm, result: data.result }) } catch {}
        }
      }
    } catch {}
    finally { setPosLoading(false) }
  }

  async function copyText(text: string, idx: number) {
    try { await navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000) } catch {}
  }

  function useTopic(title: string) {
    setSelectedTopic(title); setTab('content'); setContentStep(2); setCopyVersions([])
    showToast(`已选：${title.slice(0, 15)}...`)
  }

  // ===== 博主追踪 =====
  async function scrapeCreator() {
    if (!creatorUrl.trim()) { showToast('请输入博主主页链接'); return }
    setCreatorLoading(true); setCreatorData(null)
    try {
      const res = await fetch('/api/scrape-creator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: creatorUrl, count: creatorCount, sortBy: creatorSort }),
      })
      const data = await res.json()
      if (data.success) {
        setCreatorData(data)
        setCreatorView('detail')
        // 保存到追踪列表
        const newCreator = { ...data.creator, url: creatorUrl, videos: data.videos, summary: data.summary, addedAt: new Date().toISOString() }
        const updated = [newCreator, ...trackedCreators.filter((c: any) => c.url !== creatorUrl)].slice(0, 10)
        setTrackedCreators(updated)
        try { localStorage.setItem('contentos_tracked_creators', JSON.stringify(updated)) } catch {}
        showToast(`✅ 已抓取 ${data.videos?.length || 0} 条视频`)
      } else showToast(data.error || '抓取失败')
    } catch { showToast('网络错误，请重试') }
    finally { setCreatorLoading(false) }
  }

  // ===== 内容情报雷达 =====
  async function fetchRadar() {
    setRadarLoading(true)
    try {
      const res = await fetch('/api/daily-radar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: acc.industry, positioning: acc.positioning }),
      })
      const data = await res.json()
      if (data.success !== false) setRadarData(data)
      else showToast(data.error || '获取失败')
    } catch { showToast('网络错误，请重试') }
    finally { setRadarLoading(false) }
  }

  // ===== 文案风格模板 =====
  async function analyzeStyle() {
    if (!styleInput.trim() && !styleUrl.trim()) { showToast('请输入文案样本或博主链接'); return }
    setStyleLoading(true)
    try {
      const res = await fetch('/api/analyze-style', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ samples: styleInput, creatorUrl: styleUrl, templateName: styleName || '自定义风格' }),
      })
      const data = await res.json()
      if (data.success) {
        const newTemplate: StyleTemplate = { ...data.template, id: Date.now().toString() }
        const updated = [newTemplate, ...styleTemplates]
        setStyleTemplates(updated)
        try { localStorage.setItem('contentos_style_templates', JSON.stringify(updated)) } catch {}
        setStyleMode('list')
        setStyleInput(''); setStyleUrl(''); setStyleName('')
        showToast('✅ 风格模板已保存')
      } else showToast(data.error || '分析失败')
    } catch { showToast('网络错误，请重试') }
    finally { setStyleLoading(false) }
  }

  function deleteTemplate(id: string) {
    const updated = styleTemplates.filter(t => t.id !== id)
    setStyleTemplates(updated)
    try { localStorage.setItem('contentos_style_templates', JSON.stringify(updated)) } catch {}
    showToast('已删除')
  }

  function applyTemplate(template: StyleTemplate) {
    setCopyStyle(template.name)
    setTab('content'); setContentStep(2)
    showToast(`已应用风格：${template.name}`)
  }

  if (!user) return (
    <div style={{ width: 390, height: 844, borderRadius: 50, overflow: 'hidden', background: 'linear-gradient(160deg,#0a0a14,#1a1a2e,#16213e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', boxShadow: '0 0 0 10px #111,0 40px 100px rgba(0,0,0,.7)' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(0,122,255,.4)' }}>✦</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 6 }}>ContentOS</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)' }}>AI 内容增长工作台</div>
      </div>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 3, marginBottom: 20, gap: 3 }}>
          {['login','register'].map(m => (
            <div key={m} onClick={() => { setAuthMode(m as any); setAuthError('') }} style={{ flex: 1, padding: '8px', borderRadius: 9, fontSize: 14, fontWeight: 600, color: authMode === m ? '#fff' : 'rgba(255,255,255,.4)', background: authMode === m ? 'rgba(0,122,255,.8)' : 'transparent', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}>
              {m === 'login' ? '登录' : '注册'}
            </div>
          ))}
        </div>
        <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 12, background: 'rgba(255,255,255,.07)', fontSize: 15, color: '#fff', marginBottom: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="邮箱地址" type="email" />
        <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} style={{ width: '100%', padding: '14px 16px', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 12, background: 'rgba(255,255,255,.07)', fontSize: 15, color: '#fff', marginBottom: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="密码（至少6位）" type="password" />
        {authError && <div style={{ color: '#FF6B6B', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{authError}</div>}
        <button onClick={handleAuth} disabled={authLoading} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', marginBottom: 16 }}>
          {authLoading ? '处理中...' : authMode === 'login' ? '登录' : '注册'}
        </button>
        <div onClick={() => { setUser({ id: 'guest', email: 'guest@contentos.ai' }); showToast('已进入体验模式') }} style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          跳过登录，先体验
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ width: 390, height: 844, borderRadius: 50, overflow: 'hidden', background: TV['--bg'], display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 10px #111,0 40px 100px rgba(0,0,0,.7)', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'dashboard' && <Dashboard tv={TV} acc={acc} accounts={accounts} account={account} setAccount={setAccount} setTab={setTab} showToast={showToast} insights={insights} insightsLoading={insightsLoading} showInsights={showInsights} generateInsights={generateInsights} user={user} onLogout={handleLogout} />}
        {tab === 'materials' && <Materials tv={TV} acc={acc} matTab={matTab} setMatTab={setMatTab} hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading} generateTopics={generateTopics} useTopic={useTopic} showToast={showToast} savedContents={savedContents}
          creatorUrl={creatorUrl} setCreatorUrl={setCreatorUrl} creatorCount={creatorCount} setCreatorCount={setCreatorCount} creatorSort={creatorSort} setCreatorSort={setCreatorSort} creatorLoading={creatorLoading} creatorData={creatorData} trackedCreators={trackedCreators} creatorView={creatorView} setCreatorView={setCreatorView} scrapeCreator={scrapeCreator} setCreatorData={setCreatorData}
          radarData={radarData} radarLoading={radarLoading} radarTab={radarTab} setRadarTab={setRadarTab} fetchRadar={fetchRadar}
          styleTemplates={styleTemplates} styleMode={styleMode} setStyleMode={setStyleMode} styleInput={styleInput} setStyleInput={setStyleInput} styleUrl={styleUrl} setStyleUrl={setStyleUrl} styleName={styleName} setStyleName={setStyleName} styleLoading={styleLoading} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} analyzeStyle={analyzeStyle} deleteTemplate={deleteTemplate} applyTemplate={applyTemplate}
        />}
        {tab === 'content' && <Content tv={TV} acc={acc} step={contentStep} setStep={setContentStep} topic={selectedTopic} setTopic={setSelectedTopic} style={copyStyle} setStyle={setCopyStyle} userInput={userInput} setUserInput={setUserInput} versions={copyVersions} loading={copyLoading} error={copyError} copiedIdx={copiedIdx} expandedIdx={expandedIdx} setExpandedIdx={setExpandedIdx} tokens={copyTokens} generate={generateCopy} copy={copyText} save={saveCopy} showToast={showToast} quickTopics={QUICK_TOPICS} setTab={setTab} styleTemplates={styleTemplates} />}
        {tab === 'positioning' && <Positioning tv={TV} step={posStep} setStep={setPosStep} form={posForm} setForm={setPosForm} result={posResult} loading={posLoading} generate={generatePositioning} showToast={showToast} useTopic={useTopic} />}
        {tab === 'operations' && <Operations tv={TV} acc={acc} showToast={showToast} />}
      </div>

      {/* 底部导航 */}
      <div style={{ height: 90, background: TV['--tab-bg'], backdropFilter: 'blur(28px)', borderTop: `.5px solid ${TV['--b']}`, display: 'flex', alignItems: 'flex-start', paddingTop: 8, paddingBottom: 20, flexShrink: 0, zIndex: 60 }}>
        {[{id:'dashboard',icon:'🏠',label:'工作台'},{id:'materials',icon:'📦',label:'素材中心'},{id:'content',icon:'✍️',label:'内容中心'},{id:'positioning',icon:'🎯',label:'账号定位'},{id:'operations',icon:'📊',label:'运营中心'}].map(t => (
          <div key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 2px', cursor: 'pointer' }}>
            <span style={{ fontSize: 21, transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', display: 'block', transition: 'transform .2s' }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? TV['--accent'] : TV['--t3'] }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 16, height: 3, borderRadius: 2, background: TV['--accent'] }} />}
          </div>
        ))}
      </div>

      {toast && <div style={{ position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', background: 'rgba(28,28,30,.92)', backdropFilter: 'blur(20px)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}
    </div>
  )
}

// ===== 工作台 =====
function Dashboard({ tv, acc, accounts, account, setAccount, setTab, showToast, insights, insightsLoading, showInsights, generateInsights, user, onLogout }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'] }}>ContentOS</div>
            <div style={{ fontSize: 12, color: tv['--t3'] }}>AI 内容增长工作台</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: tv['--t3'], maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email?.split('@')[0]}</div>
            <button onClick={onLogout} style={{ padding: '5px 10px', background: tv['--inp'], border: 'none', borderRadius: 8, fontSize: 11, color: tv['--t3'], cursor: 'pointer' }}>退出</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {accounts.map((a: any, i: number) => (
            <div key={i} onClick={() => setAccount(i)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 20, background: account === i ? 'linear-gradient(135deg,#007AFF,#30D5C8)' : tv['--card'], border: account === i ? 'none' : `.5px solid ${tv['--b']}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>{a.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: account === i ? '#fff' : tv['--t1'] }}>{a.name}</span>
            </div>
          ))}
          <div onClick={() => showToast('多账号管理即将上线')} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 20, background: tv['--inp'], cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 16 }}>＋</span>
            <span style={{ fontSize: 13, color: tv['--t3'] }}>添加</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {/* 账号数据卡片 */}
        <div style={{ background: acc.color, borderRadius: 20, padding: 16, marginBottom: 16, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{acc.emoji} {acc.name}</div>
              <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>{acc.positioning}</div>
            </div>
            <button onClick={generateInsights} style={{ padding: '6px 12px', background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 10, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {insightsLoading ? '分析中...' : '✨ AI 诊断'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[['粉丝','1.2万'],['点赞','8.9万'],['完播率','34%'],['涨粉/周','＋234']].map(([l,v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{v}</div>
                <div style={{ fontSize: 10, opacity: .7 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* AI 诊断结果 */}
        {showInsights && insights.length > 0 && (
          <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>✨ AI 运营诊断</div>
            {insights.map((ins: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{ins.title}</div>
                  <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{ins.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* 快捷入口 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '📡', label: '内容情报雷达', sub: '今日热点+爆款形式', tab: 'materials', matTab: 'radar', color: '#FF6B6B' },
            { icon: '🎯', label: '博主追踪', sub: '爬取竞品内容', tab: 'materials', matTab: 'creator', color: '#007AFF' },
            { icon: '✍️', label: '生成文案', sub: '一键AI创作', tab: 'content', color: '#34C759' },
            { icon: '🎨', label: '风格模板', sub: '分析+复用风格', tab: 'materials', matTab: 'style', color: '#AF52DE' },
          ].map((item: any) => (
            <div key={item.label} onClick={() => { setTab(item.tab) }} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, cursor: 'pointer' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'] }}>{item.label}</div>
              <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>
        {/* 今日任务 */}
        <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📋 今日任务</div>
          {[
            { done: true, text: '查看今日热点情报' },
            { done: false, text: '生成本周选题（0/3）' },
            { done: false, text: '创作口播文案' },
            { done: false, text: '发布今日视频' },
          ].map((task, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: task.done ? tv['--green'] : tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {task.done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: task.done ? tv['--t3'] : tv['--t1'], textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== 素材中心（含博主追踪/情报雷达/风格模板）=====
function Materials({ tv, acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, useTopic, showToast, savedContents,
  creatorUrl, setCreatorUrl, creatorCount, setCreatorCount, creatorSort, setCreatorSort, creatorLoading, creatorData, trackedCreators, creatorView, setCreatorView, scrapeCreator, setCreatorData,
  radarData, radarLoading, radarTab, setRadarTab, fetchRadar,
  styleTemplates, styleMode, setStyleMode, styleInput, setStyleInput, styleUrl, setStyleUrl, styleName, setStyleName, styleLoading, selectedTemplate, setSelectedTemplate, analyzeStyle, deleteTemplate, applyTemplate
}: any) {
  const tabs = [
    { id: 'hotspot', label: '🔥 热点' },
    { id: 'topics', label: '📌 选题' },
    { id: 'radar', label: '📡 雷达' },
    { id: 'creator', label: '👤 博主' },
    { id: 'style', label: '🎨 风格' },
    { id: 'saved', label: '💾 已存' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'], marginBottom: 8 }}>素材中心</div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(t => (
            <div key={t.id} onClick={() => setMatTab(t.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, background: matTab === t.id ? tv['--accent'] : tv['--inp'], cursor: 'pointer' }}>
              <span style={{ fontSize: 12, fontWeight: matTab === t.id ? 700 : 500, color: matTab === t.id ? '#fff' : tv['--t2'] }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

        {/* 热点 */}
        {matTab === 'hotspot' && hotspots.map((h: any) => (
          <div key={h.rank} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: h.rank <= 3 ? tv['--orange'] : tv['--t4'], width: 20, textAlign: 'center', flexShrink: 0 }}>{h.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{h.title}</div>
              <div style={{ fontSize: 10, color: tv['--t3'] }}>🔥 {h.heat}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ background: `${h.relColor}20`, color: h.relColor, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{h.rel}</span>
              <button onClick={() => { setMatTab('topics'); showToast(`已选：${h.title}`) }} style={{ padding: '3px 9px', background: tv['--accent'], border: 'none', borderRadius: 999, fontSize: 10, color: '#fff', cursor: 'pointer' }}>借势</button>
            </div>
          </div>
        ))}

        {/* 选题库 */}
        {matTab === 'topics' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: tv['--t2'] }}>AI 为 {acc.name} 推荐</div>
              <button onClick={generateTopics} style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 20, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {topicsLoading ? '生成中...' : '✨ AI 生成选题'}
              </button>
            </div>
            {(aiTopics.length === 0 ? QUICK_TOPICS.map((t: string) => ({ title: t, tags: [], reason: '' })) : aiTopics).map((t: any, i: number) => (
              <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tv['--t1'], flex: 1, lineHeight: 1.4 }}>{t.title}</div>
                  <button onClick={() => useTopic(t.title)} style={{ padding: '5px 11px', background: tv['--accent'], border: 'none', borderRadius: 20, fontSize: 11, color: '#fff', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}>用这个</button>
                </div>
                {t.tags?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{t.tags.map((tag: string) => <span key={tag} style={{ background: `${tv['--accent']}15`, color: tv['--accent'], padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>{tag}</span>)}</div>}
                {t.reason && <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 5 }}>{t.reason}</div>}
              </div>
            ))}
          </div>
        )}

        {/* 内容情报雷达 */}
        {matTab === 'radar' && (
          <div>
            {!radarData ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 6 }}>内容情报雷达</div>
                <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 20, lineHeight: 1.6 }}>每日热点 · 爆款形式 · 关键词热度<br/>AI 为你的账号定制今日内容情报</div>
                <button onClick={fetchRadar} disabled={radarLoading} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#FF6B6B,#FF8E53)', border: 'none', borderRadius: 24, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                  {radarLoading ? '🔄 扫描中...' : '🚀 立即扫描'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: tv['--t3'] }}>📅 {radarData.date} · {acc.industry}</div>
                  <button onClick={fetchRadar} disabled={radarLoading} style={{ padding: '5px 12px', background: tv['--inp'], border: 'none', borderRadius: 20, fontSize: 11, color: tv['--t2'], cursor: 'pointer' }}>
                    {radarLoading ? '刷新中...' : '🔄 刷新'}
                  </button>
                </div>
                {/* 雷达子 Tab */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[['hotspot','🔥 热点'],['format','💡 形式'],['keyword','🏷️ 关键词'],['action','⚡ 今日行动']].map(([id, label]) => (
                    <div key={id} onClick={() => setRadarTab(id)} style={{ padding: '5px 10px', borderRadius: 20, background: radarTab === id ? tv['--accent'] : tv['--inp'], cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, fontWeight: radarTab === id ? 700 : 500, color: radarTab === id ? '#fff' : tv['--t2'] }}>{label}</span>
                    </div>
                  ))}
                </div>
                {/* 热点 */}
                {radarTab === 'hotspot' && radarData.mediaHotspots?.map((h: any, i: number) => (
                  <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? tv['--orange'] : tv['--t4'] }}>#{i+1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], flex: 1 }}>{h.title}</span>
                      <span style={{ fontSize: 10, background: `${tv['--orange']}20`, color: tv['--orange'], padding: '2px 8px', borderRadius: 999 }}>{h.urgency}</span>
                    </div>
                    <div style={{ fontSize: 11, color: tv['--t3'], marginBottom: 6 }}>🔥 {h.heat}</div>
                    <div style={{ fontSize: 11, color: tv['--accent'], background: `${tv['--accent']}10`, padding: '6px 10px', borderRadius: 8 }}>💡 {h.angle}</div>
                  </div>
                ))}
                {/* 爆款形式 */}
                {radarTab === 'format' && radarData.viralFormats?.map((f: any, i: number) => (
                  <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'] }}>{f.format}</span>
                      <span style={{ fontSize: 10, background: f.difficulty === '简单' ? `${tv['--green']}20` : `${tv['--orange']}20`, color: f.difficulty === '简单' ? tv['--green'] : tv['--orange'], padding: '2px 8px', borderRadius: 999 }}>{f.difficulty}</span>
                    </div>
                    <div style={{ fontSize: 12, color: tv['--t2'], marginBottom: 4 }}>示例：{f.example}</div>
                    <div style={{ fontSize: 11, color: tv['--t3'] }}>🔥 {f.reason}</div>
                  </div>
                ))}
                {/* 关键词 */}
                {radarTab === 'keyword' && (
                  <div>
                    {radarData.keywords?.map((k: any, i: number) => (
                      <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'] }}>#{k.word}</span>
                            <span style={{ fontSize: 11, color: k.trend === '上升' ? tv['--green'] : k.trend === '下降' ? tv['--red'] : tv['--t3'] }}>{k.trend === '上升' ? '↑' : k.trend === '下降' ? '↓' : '→'} {k.trend}</span>
                          </div>
                          <div style={{ fontSize: 11, color: tv['--t3'] }}>{k.suggestion}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: tv['--accent'] }}>{k.heat}</div>
                          <div style={{ fontSize: 9, color: tv['--t4'] }}>热度</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 今日行动 */}
                {radarTab === 'action' && radarData.todayAction && (
                  <div>
                    <div style={{ background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 16, padding: 16, marginBottom: 10, color: '#fff' }}>
                      <div style={{ fontSize: 11, opacity: .8, marginBottom: 4 }}>⚡ 今日首选</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{radarData.todayAction.priority1?.title}</div>
                      <div style={{ fontSize: 11, opacity: .85, marginBottom: 8 }}>{radarData.todayAction.priority1?.reason}</div>
                      <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                        💬 建议开头：{radarData.todayAction.priority1?.hook}
                      </div>
                    </div>
                    <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 4 }}>备选选题</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: tv['--t1'], marginBottom: 4 }}>{radarData.todayAction.priority2?.title}</div>
                      <div style={{ fontSize: 11, color: tv['--t3'] }}>{radarData.todayAction.priority2?.reason}</div>
                    </div>
                    <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14, display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⏰</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>最佳发布时间</div>
                        <div style={{ fontSize: 12, color: tv['--accent'], fontWeight: 700 }}>{radarData.todayAction.bestPostTime}</div>
                        <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 4 }}>{radarData.todayAction.tip}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 博主追踪 */}
        {matTab === 'creator' && (
          <div>
            {creatorView === 'list' ? (
              <div>
                {/* 输入区 */}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>🔍 抓取博主内容</div>
                  <input value={creatorUrl} onChange={(e: any) => setCreatorUrl(e.target.value)} placeholder="粘贴抖音/小红书博主主页链接" style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${tv['--b']}`, borderRadius: 10, fontSize: 13, color: tv['--t1'], background: tv['--inp'], marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: tv['--t3'], marginBottom: 4 }}>抓取数量</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[20, 50].map(n => (
                          <div key={n} onClick={() => setCreatorCount(n)} style={{ flex: 1, padding: '6px', textAlign: 'center', borderRadius: 8, background: creatorCount === n ? tv['--accent'] : tv['--inp'], cursor: 'pointer' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: creatorCount === n ? '#fff' : tv['--t2'] }}>前{n}条</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: tv['--t3'], marginBottom: 4 }}>排序方式</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[['likes','点赞'],['comments','评论'],['collects','收藏']].map(([v, l]) => (
                          <div key={v} onClick={() => setCreatorSort(v)} style={{ flex: 1, padding: '6px 2px', textAlign: 'center', borderRadius: 8, background: creatorSort === v ? tv['--accent'] : tv['--inp'], cursor: 'pointer' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: creatorSort === v ? '#fff' : tv['--t2'] }}>{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={scrapeCreator} disabled={creatorLoading} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 12, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {creatorLoading ? '🔄 抓取中...' : '🚀 开始抓取'}
                  </button>
                </div>
                {/* 已追踪列表 */}
                {trackedCreators.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>📋 已追踪博主</div>
                    {trackedCreators.map((c: any, i: number) => (
                      <div key={i} onClick={() => { setCreatorData({ creator: c, videos: c.videos, summary: c.summary }); setCreatorView('detail') }} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'] }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: tv['--t3'] }}>{c.platform} · {c.followers} · {c.industry}</div>
                        </div>
                        <div style={{ fontSize: 11, color: tv['--accent'] }}>查看 ›</div>
                      </div>
                    ))}
                  </div>
                )}
                {trackedCreators.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: tv['--t4'] }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                    <div style={{ fontSize: 13 }}>还没有追踪的博主</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>输入博主主页链接开始追踪</div>
                  </div>
                )}
              </div>
            ) : (
              /* 博主详情 */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setCreatorView('list')} style={{ padding: '6px 12px', background: tv['--inp'], border: 'none', borderRadius: 20, fontSize: 12, color: tv['--t2'], cursor: 'pointer' }}>← 返回</button>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'] }}>{creatorData?.creator?.name}</div>
                </div>
                {/* 博主信息卡 */}
                <div style={{ background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 16, padding: 14, marginBottom: 12, color: '#fff' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{creatorData?.creator?.name}</div>
                  <div style={{ fontSize: 11, opacity: .85, marginBottom: 10 }}>{creatorData?.creator?.positioning}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[['粉丝', creatorData?.creator?.followers], ['总点赞', creatorData?.creator?.totalLikes], ['平均点赞', creatorData?.creator?.avgLikes]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>{v}</div>
                        <div style={{ fontSize: 10, opacity: .7 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 爆款规律 */}
                {creatorData?.summary?.topPatterns && (
                  <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>🔥 爆款规律</div>
                    {creatorData.summary.topPatterns.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ color: tv['--orange'], fontWeight: 700, fontSize: 12 }}>{i+1}.</span>
                        <span style={{ fontSize: 12, color: tv['--t2'] }}>{p}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, padding: '8px 10px', background: `${tv['--accent']}10`, borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: tv['--accent'] }}>💡 {creatorData.summary.recommendation}</div>
                    </div>
                  </div>
                )}
                {/* 视频列表 */}
                <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>📹 视频列表（{creatorData?.videos?.length || 0}条）</div>
                {creatorData?.videos?.map((v: CreatorVideo, i: number) => (
                  <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: i < 3 ? tv['--orange'] : tv['--t4'], flexShrink: 0, width: 20 }}>#{v.rank}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], lineHeight: 1.4 }}>{v.title}</div>
                        <div style={{ fontSize: 10, color: tv['--t3'], marginTop: 2 }}>{v.publishDate} · {v.duration} · {v.type}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                      {[['❤️', v.likes], ['💬', v.comments], ['⭐', v.collects], ['↗️', v.shares]].map(([icon, val]) => (
                        <div key={icon as string} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 11 }}>{icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: tv['--t2'] }}>{typeof val === 'number' ? (val >= 10000 ? (val/10000).toFixed(1)+'万' : val) : val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: tv['--t3'], background: tv['--inp'], borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: tv['--accent'], marginBottom: 3 }}>🎯 钩子：{v.hook}</div>
                      <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.script}</div>
                    </div>
                    <button onClick={() => { navigator.clipboard?.writeText(v.script); }} style={{ marginTop: 8, padding: '5px 12px', background: tv['--inp'], border: 'none', borderRadius: 20, fontSize: 11, color: tv['--t2'], cursor: 'pointer' }}>📋 复制文案</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 文案风格模板 */}
        {matTab === 'style' && (
          <div>
            {styleMode === 'list' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: tv['--t2'] }}>已保存 {styleTemplates.length} 个风格模板</div>
                  <button onClick={() => setStyleMode('create')} style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#AF52DE,#007AFF)', border: 'none', borderRadius: 20, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>＋ 新建分析</button>
                </div>
                {styleTemplates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 6 }}>文案风格模板</div>
                    <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 20, lineHeight: 1.6 }}>粘贴博主文案或主页链接<br/>AI 分析风格，一键复用</div>
                    <button onClick={() => setStyleMode('create')} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#AF52DE,#007AFF)', border: 'none', borderRadius: 24, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>🎨 开始分析</button>
                  </div>
                ) : styleTemplates.map((t: StyleTemplate) => (
                  <div key={t.id} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'] }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{t.summary}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tv['--green'] }}>{t.score}分</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {t.traits?.slice(0, 3).map((trait: string) => (
                        <span key={trait} style={{ background: `${tv['--purple']}15`, color: tv['--purple'], padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>{trait}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => applyTemplate(t)} style={{ flex: 1, padding: '7px', background: tv['--accent'], border: 'none', borderRadius: 10, fontSize: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>✍️ 用此风格写文案</button>
                      <button onClick={() => { setSelectedTemplate(t); setStyleMode('detail') }} style={{ padding: '7px 12px', background: tv['--inp'], border: 'none', borderRadius: 10, fontSize: 12, color: tv['--t2'], cursor: 'pointer' }}>详情</button>
                      <button onClick={() => deleteTemplate(t.id)} style={{ padding: '7px 12px', background: tv['--inp'], border: 'none', borderRadius: 10, fontSize: 12, color: tv['--red'], cursor: 'pointer' }}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {styleMode === 'create' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setStyleMode('list')} style={{ padding: '6px 12px', background: tv['--inp'], border: 'none', borderRadius: 20, fontSize: 12, color: tv['--t2'], cursor: 'pointer' }}>← 返回</button>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'] }}>新建风格分析</div>
                </div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14 }}>
                  <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>模板名称</div>
                  <input value={styleName} onChange={(e: any) => setStyleName(e.target.value)} placeholder="如：犀利干货流、温情故事流..." style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${tv['--b']}`, borderRadius: 10, fontSize: 13, color: tv['--t1'], background: tv['--inp'], marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>方式一：粘贴博主主页链接</div>
                  <input value={styleUrl} onChange={(e: any) => setStyleUrl(e.target.value)} placeholder="https://www.douyin.com/user/..." style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${tv['--b']}`, borderRadius: 10, fontSize: 13, color: tv['--t1'], background: tv['--inp'], marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>方式二：粘贴文案样本（3-5条效果更好）</div>
                  <textarea value={styleInput} onChange={(e: any) => setStyleInput(e.target.value)} placeholder="粘贴你想模仿的文案，每条之间用空行分隔..." rows={6} style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${tv['--b']}`, borderRadius: 10, fontSize: 13, color: tv['--t1'], background: tv['--inp'], resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }} />
                  <button onClick={analyzeStyle} disabled={styleLoading} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#AF52DE,#007AFF)', border: 'none', borderRadius: 12, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                    {styleLoading ? '🔄 AI 分析中...' : '✨ AI 分析风格'}
                  </button>
                </div>
              </div>
            )}
            {styleMode === 'detail' && selectedTemplate && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setStyleMode('list')} style={{ padding: '6px 12px', background: tv['--inp'], border: 'none', borderRadius: 20, fontSize: 12, color: tv['--t2'], cursor: 'pointer' }}>← 返回</button>
                  <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'] }}>{selectedTemplate.name}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg,#AF52DE,#007AFF)', borderRadius: 16, padding: 14, marginBottom: 12, color: '#fff' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{selectedTemplate.name}</div>
                  <div style={{ fontSize: 12, opacity: .85, marginBottom: 10 }}>{selectedTemplate.summary}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selectedTemplate.traits?.map((t: string) => (
                      <span key={t} style={{ background: 'rgba(255,255,255,.2)', padding: '3px 10px', borderRadius: 999, fontSize: 11 }}>{t}</span>
                    ))}
                  </div>
                </div>
                {[
                  { title: '📐 文案结构', content: [
                    `开头：${selectedTemplate.structure?.hook}`,
                    `正文：${selectedTemplate.structure?.body}`,
                    `结尾：${selectedTemplate.structure?.cta}`,
                  ]},
                  { title: '🗣️ 语言风格', content: [
                    `语气：${selectedTemplate.vocabulary?.tone}`,
                    `常用词：${selectedTemplate.vocabulary?.highFreq?.join('、')}`,
                    `避免：${selectedTemplate.vocabulary?.avoid?.join('、')}`,
                  ]},
                  { title: '💡 钩子模板', content: selectedTemplate.examples?.hookTemplates || [] },
                  { title: '📢 结尾模板', content: selectedTemplate.examples?.ctaTemplates || [] },
                ].map(section => (
                  <div key={section.title} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>{section.title}</div>
                    {section.content.map((item: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: tv['--t2'], marginBottom: 4, lineHeight: 1.5 }}>• {item}</div>
                    ))}
                  </div>
                ))}
                <button onClick={() => applyTemplate(selectedTemplate)} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#AF52DE,#007AFF)', border: 'none', borderRadius: 12, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>✍️ 用此风格写文案</button>
              </div>
            )}
          </div>
        )}

        {/* 已保存 */}
        {matTab === 'saved' && (
          <div>
            <div style={{ fontSize: 13, color: tv['--t3'], marginBottom: 12 }}>已保存 {savedContents.length} 条文案</div>
            {savedContents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: tv['--t4'] }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 13 }}>还没有保存的文案</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>在内容中心生成文案后点击保存</div>
              </div>
            ) : savedContents.map((c: SavedContent, i: number) => (
              <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: tv['--accent'], fontWeight: 600, marginBottom: 4 }}>{c.style}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], marginBottom: 6 }}>{c.topic}</div>
                <div style={{ fontSize: 12, color: tv['--t2'], lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.content}</div>
                <div style={{ fontSize: 10, color: tv['--t4'], marginTop: 6 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('zh-CN') : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 内容中心 =====
function Content({ tv, acc, step, setStep, topic, setTopic, style, setStyle, userInput, setUserInput, versions, loading, error, copiedIdx, expandedIdx, setExpandedIdx, tokens, generate, copy, save, showToast, quickTopics, setTab, styleTemplates }: any) {
  const steps = ['选题', '风格', '生成']
  const styles = ['犀利观点', '朋友聊天', '口播带货', '专业顾问']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'], marginBottom: 10 }}>内容中心</div>
        <div style={{ display: 'flex', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div onClick={() => i < step && setStep(i+1)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: i < step ? 'pointer' : 'default' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: step > i ? tv['--accent'] : step === i+1 ? tv['--accent'] : tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: step >= i+1 ? '#fff' : tv['--t4'] }}>{i+1}</span>
                </div>
                <span style={{ fontSize: 10, color: step >= i+1 ? tv['--accent'] : tv['--t4'], marginTop: 3, fontWeight: step === i+1 ? 700 : 400 }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: step > i+1 ? tv['--accent'] : tv['--b'], margin: '0 4px', marginBottom: 14 }} />}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: tv['--t2'], marginBottom: 10 }}>选择或输入选题</div>
            <input value={topic} onChange={(e: any) => setTopic(e.target.value)} placeholder="输入选题..." style={{ width: '100%', padding: '12px 14px', border: `.5px solid ${tv['--b']}`, borderRadius: 12, fontSize: 14, color: tv['--t1'], background: tv['--card'], marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 8 }}>快速选题</div>
            {quickTopics.map((t: string) => (
              <div key={t} onClick={() => setTopic(t)} style={{ background: tv['--card'], border: `.5px solid ${topic === t ? tv['--accent'] : tv['--b']}`, borderRadius: 12, padding: '11px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: tv['--t1'], flex: 1 }}>{t}</span>
                {topic === t && <span style={{ color: tv['--accent'], fontSize: 14 }}>✓</span>}
              </div>
            ))}
            <div onClick={() => setTab('materials')} style={{ textAlign: 'center', padding: '10px', color: tv['--accent'], fontSize: 13, cursor: 'pointer' }}>📌 去选题库选更多 ›</div>
            <button onClick={() => setStep(2)} disabled={!topic.trim()} style={{ width: '100%', padding: '13px', background: topic.trim() ? tv['--accent'] : tv['--inp'], border: 'none', borderRadius: 12, fontSize: 15, color: topic.trim() ? '#fff' : tv['--t4'], cursor: topic.trim() ? 'pointer' : 'default', fontWeight: 700, marginTop: 8 }}>
              下一步：选择风格 →
            </button>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: tv['--t3'] }}>当前选题</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], marginTop: 2 }}>{topic}</div>
            </div>
            <div style={{ fontSize: 13, color: tv['--t2'], marginBottom: 8 }}>选择文案风格</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 12 }}>
              {styles.map(s => (
                <div key={s} onClick={() => setStyle(s)} style={{ background: tv['--card'], border: `1.5px solid ${style === s ? tv['--accent'] : tv['--b']}`, borderRadius: 12, padding: '12px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: style === s ? tv['--accent'] : tv['--t1'] }}>{s}</div>
                </div>
              ))}
            </div>
            {/* 风格模板 */}
            {styleTemplates?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>🎨 我的风格模板</div>
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                  {styleTemplates.map((t: StyleTemplate) => (
                    <div key={t.id} onClick={() => setStyle(t.name)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, background: style === t.name ? tv['--purple'] : tv['--inp'], cursor: 'pointer', border: `1px solid ${style === t.name ? tv['--purple'] : 'transparent'}` }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: style === t.name ? '#fff' : tv['--t2'] }}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>补充说明（可选）</div>
            <textarea value={userInput} onChange={(e: any) => setUserInput(e.target.value)} placeholder="如：重点强调性价比，结尾引导私信..." rows={3} style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${tv['--b']}`, borderRadius: 10, fontSize: 13, color: tv['--t1'], background: tv['--card'], resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 }} />
            <button onClick={() => { setStep(3); generate() }} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 12, fontSize: 15, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
              ✨ AI 生成文案
            </button>
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: tv['--t3'] }}>{topic}</div>
                <div style={{ fontSize: 12, color: tv['--accent'], fontWeight: 600 }}>{style}</div>
              </div>
              <button onClick={() => { setStep(2) }} style={{ padding: '5px 10px', background: tv['--inp'], border: 'none', borderRadius: 8, fontSize: 11, color: tv['--t2'], cursor: 'pointer' }}>重新设置</button>
            </div>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                <div style={{ fontSize: 14, color: tv['--t2'] }}>AI 正在创作中...</div>
                <div style={{ fontSize: 12, color: tv['--t3'], marginTop: 6 }}>通常需要 5-10 秒</div>
              </div>
            )}
            {error && <div style={{ background: '#FFF2F2', border: '1px solid #FFD0D0', borderRadius: 12, padding: 14, color: tv['--red'], fontSize: 13, marginBottom: 12 }}>{error}</div>}
            {versions.map((v: CopyVersion, i: number) => (
              <div key={i} style={{ background: tv['--card'], border: `1.5px solid ${expandedIdx === i ? tv['--accent'] : tv['--b']}`, borderRadius: 14, marginBottom: 10, overflow: 'hidden' }}>
                <div onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: tv['--accent'], background: `${tv['--accent']}15`, padding: '2px 8px', borderRadius: 999 }}>{v.style}</span>
                    <div style={{ fontSize: 12, color: tv['--t3'], marginTop: 4 }}>🎯 {v.hook}</div>
                  </div>
                  <span style={{ color: tv['--t3'], fontSize: 14 }}>{expandedIdx === i ? '▲' : '▼'}</span>
                </div>
                {expandedIdx === i && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ fontSize: 13, color: tv['--t1'], lineHeight: 1.7, background: tv['--inp'], borderRadius: 10, padding: '12px', marginBottom: 10 }}>{v.content}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => copy(v.content, i)} style={{ flex: 1, padding: '9px', background: copiedIdx === i ? tv['--green'] : tv['--inp'], border: 'none', borderRadius: 10, fontSize: 13, color: copiedIdx === i ? '#fff' : tv['--t2'], cursor: 'pointer', fontWeight: 600 }}>
                        {copiedIdx === i ? '✓ 已复制' : '📋 复制'}
                      </button>
                      <button onClick={() => save(v)} style={{ flex: 1, padding: '9px', background: tv['--accent'], border: 'none', borderRadius: 10, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>💾 保存</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {versions.length > 0 && tokens && (
              <div style={{ textAlign: 'center', fontSize: 11, color: tv['--t4'], marginTop: 8 }}>消耗 {tokens} tokens · <span onClick={generate} style={{ color: tv['--accent'], cursor: 'pointer' }}>重新生成</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 账号定位 =====
function Positioning({ tv, step, setStep, form, setForm, result, loading, generate, showToast, useTopic }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'] }}>账号定位</div>
        <div style={{ fontSize: 12, color: tv['--t3'] }}>AI 为你生成专属定位方案</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {step === 0 && (
          <div>
            {[
              { key: 'industry', label: '行业/品类', placeholder: '如：餐饮、美业、教育...' },
              { key: 'product', label: '产品/服务', placeholder: '如：面馆、美容院、英语培训...' },
              { key: 'targetCustomer', label: '目标客户', placeholder: '如：周边上班族、宝妈、学生...' },
              { key: 'city', label: '城市（可选）', placeholder: '如：上海、北京...' },
              { key: 'advantage', label: '你的优势（可选）', placeholder: '如：10年经验、价格实惠...' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t2'], marginBottom: 6 }}>{field.label}</div>
                <input value={form[field.key]} onChange={(e: any) => setForm({ ...form, [field.key]: e.target.value })} placeholder={field.placeholder} style={{ width: '100%', padding: '12px 14px', border: `.5px solid ${tv['--b']}`, borderRadius: 12, fontSize: 14, color: tv['--t1'], background: tv['--card'], boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
            ))}
            <button onClick={() => { if (!form.industry || !form.product || !form.targetCustomer) { showToast('请填写行业、产品和目标客户'); return } setStep(1); generate() }} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 12, fontSize: 15, color: '#fff', cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>
              🎯 AI 生成定位方案
            </button>
          </div>
        )}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>AI 正在分析...</div>
            <div style={{ fontSize: 13, color: tv['--t3'] }}>为你生成专属账号定位方案</div>
          </div>
        )}
        {step === 2 && result && (
          <div>
            <div style={{ background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 20, padding: 16, marginBottom: 16, color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}>账号定位</div>
              <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.4 }}>{result.positioning}</div>
            </div>
            <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📌 内容方向</div>
              {result.directions?.map((d: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: tv['--accent'], fontWeight: 700 }}>{i+1}.</span>
                  <span style={{ fontSize: 13, color: tv['--t2'] }}>{d}</span>
                </div>
              ))}
            </div>
            <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>💡 推荐账号名</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {result.names?.map((n: string) => (
                  <span key={n} style={{ background: `${tv['--accent']}15`, color: tv['--accent'], padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{n}</span>
                ))}
              </div>
            </div>
            {result.plan?.length > 0 && (
              <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📅 30天内容规划</div>
                {result.plan.map((week: any) => (
                  <div key={week.week} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tv['--accent'], marginBottom: 6 }}>第{week.week}周：{week.theme}</div>
                    {week.topics?.map((t: string, i: number) => (
                      <div key={i} onClick={() => useTopic(t)} style={{ fontSize: 12, color: tv['--t2'], padding: '6px 10px', background: tv['--inp'], borderRadius: 8, marginBottom: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{t}</span>
                        <span style={{ color: tv['--accent'], fontSize: 11 }}>用 ›</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStep(0)} style={{ width: '100%', padding: '12px', background: tv['--inp'], border: 'none', borderRadius: 12, fontSize: 14, color: tv['--t2'], cursor: 'pointer', fontWeight: 600 }}>重新生成</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== 运营中心 =====
function Operations({ tv, acc, showToast }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'] }}>运营中心</div>
        <div style={{ fontSize: 12, color: tv['--t3'] }}>{acc.name}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>发布排期</div>
          {[{time:'今天 18:30',title:'端午节限定套餐来了！',status:'待发布',color:tv['--orange']},{time:'明天 12:00',title:'开面馆3年踩过的坑',status:'草稿',color:tv['--t4']},{time:'后天 19:00',title:'顾客感动故事',status:'计划中',color:tv['--t4']}].map((item,i) => (
            <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{item.title}</div>
                <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{item.time}</div>
              </div>
              <span style={{ background: `${item.color}20`, color: item.color, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{item.status}</span>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>本月目标</div>
          <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 16 }}>
            {[['发布视频','12/20条','60%'],['涨粉目标','1.2k/2k','60%'],['私信线索','24/50条','48%']].map(([l,v,p]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: tv['--t2'] }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{v}</span>
                </div>
                <div style={{ height: 6, background: tv['--inp'], borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: p, background: 'linear-gradient(90deg,#007AFF,#30D5C8)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📊 本周数据</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[['新增粉丝','＋234','↑18%',tv['--green']],['视频播放','12.3万','↑24%',tv['--accent']],['互动总量','1,892','↑11%',tv['--orange']],['主页访问','3,421','↑32%',tv['--purple']]].map(([l,v,c,color]) => (
              <div key={l} style={{ background: tv['--inp'], borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: color as string }}>{v}</div>
                <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{l}</div>
                <div style={{ fontSize: 11, color: tv['--green'], marginTop: 2 }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
