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
interface ScheduleItem { time: string; title: string; status: string; platform: string }

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
  const [tab, setTab] = useState<'dashboard' | 'materials' | 'content' | 'video' | 'operations'>('dashboard')
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
      // 多账号管理
      const [showAccountManager, setShowAccountManager] = useState(false)
      const [editingIdx, setEditingIdx] = useState<number | null>(null)
      const [accountForm, setAccountForm] = useState({ name: '', emoji: '🏪', industry: '', positioning: '', targetAudience: '', color: 'linear-gradient(135deg,#007AFF,#30D5C8)' })
      // 运营中心
      const [schedule, setSchedule] = useState<ScheduleItem[]>([
        { time: '今天 18:30', title: '端午节限定套餐来了！', status: '待发布', platform: '抖音' },
        { time: '明天 12:00', title: '开面馆3年踩过的坑', status: '草稿', platform: '抖音' },
        { time: '后天 19:00', title: '顾客感动故事', status: '计划中', platform: '小红书' },
      ])
      const [opsTab, setOpsTab] = useState<'schedule'|'stats'|'goals'>('schedule')
  // 视频生成
  const [videoStep, setVideoStep] = useState<'input'|'voice'|'avatar'|'preview'>('input')
  const [videoCopy, setVideoCopy] = useState('')
  const [videoVoiceId, setVideoVoiceId] = useState('female-shaonv')
  const [videoSpeed, setVideoSpeed] = useState(1.0)
  const [videoAvatarType, setVideoAvatarType] = useState<'upload'|'preset'>('preset')
  const [videoAvatarPreset, setVideoAvatarPreset] = useState('business-female')
  const [videoBgType, setVideoBgType] = useState<'color'|'image'|'blur'>('color')
  const [videoBgColor, setVideoBgColor] = useState('#1a1a2e')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoAudioB64, setVideoAudioB64] = useState('')
  const [videoResult, setVideoResult] = useState<any>(null)
  const [videoError, setVideoError] = useState('')

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


      // ===== 多账号管理 =====
      function saveAccount() {
        if (!accountForm.name.trim() || !accountForm.industry.trim()) { showToast('请填写账号名称和行业'); return }
        const newAcc: Account = { ...accountForm }
        let updated: Account[]
        if (editingIdx !== null) {
          updated = accounts.map((a, i) => i === editingIdx ? newAcc : a)
          showToast('✅ 账号已更新')
        } else {
          updated = [...accounts, newAcc]; setAccount(updated.length - 1); showToast('✅ 账号已添加')
        }
        setAccounts(updated)
        try { localStorage.setItem('contentos_accounts', JSON.stringify(updated)) } catch {}
        setShowAccountManager(false); setEditingIdx(null)
        setAccountForm({ name: '', emoji: '🏪', industry: '', positioning: '', targetAudience: '', color: 'linear-gradient(135deg,#007AFF,#30D5C8)' })
      }
      function deleteAccount(idx: number) {
        if (accounts.length <= 1) { showToast('至少保留一个账号'); return }
        const updated = accounts.filter((_, i) => i !== idx)
        setAccounts(updated); setAccount(0)
        try { localStorage.setItem('contentos_accounts', JSON.stringify(updated)) } catch {}
        showToast('已删除账号')
      }
      function startEditAccount(idx: number) {
        const a = accounts[idx]; setEditingIdx(idx)
        setAccountForm({ name: a.name, emoji: a.emoji, industry: a.industry, positioning: a.positioning, targetAudience: a.targetAudience, color: a.color })
        setShowAccountManager(true)
      }
      function startAddAccount() {
        setEditingIdx(null)
        setAccountForm({ name: '', emoji: '🏪', industry: '', positioning: '', targetAudience: '', color: 'linear-gradient(135deg,#007AFF,#30D5C8)' })
        setShowAccountManager(true)
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
        {tab === 'dashboard' && <Dashboard tv={TV} acc={acc} accounts={accounts} account={account} setAccount={setAccount} setTab={setTab} showToast={showToast} insights={insights} insightsLoading={insightsLoading} showInsights={showInsights} generateInsights={generateInsights} user={user} onLogout={handleLogout} onAddAccount={startAddAccount} onEditAccount={startEditAccount} onDeleteAccount={deleteAccount} />}
        {tab === 'materials' && <Materials tv={TV} acc={acc} matTab={matTab} setMatTab={setMatTab} hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading} generateTopics={generateTopics} useTopic={useTopic} showToast={showToast} savedContents={savedContents}
          creatorUrl={creatorUrl} setCreatorUrl={setCreatorUrl} creatorCount={creatorCount} setCreatorCount={setCreatorCount} creatorSort={creatorSort} setCreatorSort={setCreatorSort} creatorLoading={creatorLoading} creatorData={creatorData} trackedCreators={trackedCreators} creatorView={creatorView} setCreatorView={setCreatorView} scrapeCreator={scrapeCreator} setCreatorData={setCreatorData}
          radarData={radarData} radarLoading={radarLoading} radarTab={radarTab} setRadarTab={setRadarTab} fetchRadar={fetchRadar}
          styleTemplates={styleTemplates} styleMode={styleMode} setStyleMode={setStyleMode} styleInput={styleInput} setStyleInput={setStyleInput} styleUrl={styleUrl} setStyleUrl={setStyleUrl} styleName={styleName} setStyleName={setStyleName} styleLoading={styleLoading} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} analyzeStyle={analyzeStyle} deleteTemplate={deleteTemplate} applyTemplate={applyTemplate}
        />}
        {tab === 'content' && <Content tv={TV} acc={acc} step={contentStep} setStep={setContentStep} topic={selectedTopic} setTopic={setSelectedTopic} style={copyStyle} setStyle={setCopyStyle} userInput={userInput} setUserInput={setUserInput} versions={copyVersions} loading={copyLoading} error={copyError} copiedIdx={copiedIdx} expandedIdx={expandedIdx} setExpandedIdx={setExpandedIdx} tokens={copyTokens} generate={generateCopy} copy={copyText} save={saveCopy} showToast={showToast} quickTopics={QUICK_TOPICS} setTab={setTab} styleTemplates={styleTemplates} />}
        {tab === 'video' && <VideoStudio tv={TV} acc={acc} step={videoStep} setStep={setVideoStep} copy={videoCopy} setCopy={setVideoCopy} voiceId={videoVoiceId} setVoiceId={setVideoVoiceId} speed={videoSpeed} setSpeed={setVideoSpeed} avatarType={videoAvatarType} setAvatarType={setVideoAvatarType} avatarPreset={videoAvatarPreset} setAvatarPreset={setVideoAvatarPreset} bgType={videoBgType} setBgType={setVideoBgType} bgColor={videoBgColor} setBgColor={setVideoBgColor} loading={videoLoading} setLoading={setVideoLoading} audioB64={videoAudioB64} setAudioB64={setVideoAudioB64} result={videoResult} setResult={setVideoResult} error={videoError} setError={setVideoError} showToast={showToast} savedContents={savedContents} setTab={setTab} />}
        {tab === 'operations' && <Operations tv={TV} acc={acc} showToast={showToast} schedule={schedule} setSchedule={setSchedule} opsTab={opsTab} setOpsTab={setOpsTab} savedContents={savedContents} />}
      </div>

      {/* 底部导航 */}
      <div style={{ height: 90, background: TV['--tab-bg'], backdropFilter: 'blur(28px)', borderTop: `.5px solid ${TV['--b']}`, display: 'flex', alignItems: 'flex-start', paddingTop: 8, paddingBottom: 20, flexShrink: 0, zIndex: 60 }}>
        {[{id:'dashboard',icon:'🏠',label:'工作台'},{id:'materials',icon:'📦',label:'素材中心'},{id:'content',icon:'✍️',label:'内容中心'},{id:'video',icon:'🎬',label:'视频生成'},{id:'operations',icon:'📊',label:'运营中心'}].map(t => (
          <div key={t.id} onClick={() => setTab(t.id as any)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 2px', cursor: 'pointer' }}>
            <span style={{ fontSize: 21, transform: tab === t.id ? 'scale(1.1)' : 'scale(1)', display: 'block', transition: 'transform .2s' }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? TV['--accent'] : TV['--t3'] }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 16, height: 3, borderRadius: 2, background: TV['--accent'] }} />}
          </div>
        ))}
      </div>

      {/* 账号管理弹窗 */}
          {showAccountManager && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', borderRadius: 50, overflow: 'hidden' }}>
              <div style={{ width: '100%', background: TV['--card'], borderRadius: '24px 24px 0 0', padding: '20px 20px 32px', maxHeight: '85%', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: TV['--t1'] }}>{editingIdx !== null ? '编辑账号' : '添加账号'}</div>
                  <button onClick={() => setShowAccountManager(false)} style={{ width: 28, height: 28, borderRadius: '50%', background: TV['--inp'], border: 'none', fontSize: 14, cursor: 'pointer', color: TV['--t3'] }}>✕</button>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: TV['--t3'], marginBottom: 6 }}>账号头像</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['🍜','🍕','💆','💪','📚','🏪','🎨','🎵','🌿','💄','🏋️','🍰','☕','🛍️','🏠','🎯'].map(e => (
                      <div key={e} onClick={() => setAccountForm({...accountForm, emoji: e})} style={{ width: 36, height: 36, borderRadius: 10, background: accountForm.emoji === e ? `${TV['--accent']}20` : TV['--inp'], border: `1.5px solid ${accountForm.emoji === e ? TV['--accent'] : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer' }}>{e}</div>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: TV['--t3'], marginBottom: 6 }}>主题色</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['linear-gradient(135deg,#007AFF,#30D5C8)','linear-gradient(135deg,#FF6B6B,#FF8E53)','linear-gradient(135deg,#4ECDC4,#44A08D)','linear-gradient(135deg,#AF52DE,#007AFF)','linear-gradient(135deg,#34C759,#30D5C8)','linear-gradient(135deg,#FF9500,#FF6B6B)'].map(c => (
                      <div key={c} onClick={() => setAccountForm({...accountForm, color: c})} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `2.5px solid ${accountForm.color === c ? TV['--t1'] : 'transparent'}`, cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
                {[{key:'name',label:'账号名称 *',ph:'如：老李面馆...'},{key:'industry',label:'行业 *',ph:'如：餐饮、美业...'},{key:'positioning',label:'账号定位',ph:'如：本地餐饮·老板IP流...'},{key:'targetAudience',label:'目标受众',ph:'如：周边上班族，25-45岁...'}].map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: TV['--t3'], marginBottom: 4 }}>{f.label}</div>
                    <input value={(accountForm as any)[f.key]} onChange={(e: any) => setAccountForm({...accountForm, [f.key]: e.target.value})} placeholder={f.ph} style={{ width: '100%', padding: '10px 12px', border: `.5px solid ${TV['--b']}`, borderRadius: 10, fontSize: 13, color: TV['--t1'], background: TV['--inp'], boxSizing: 'border-box', fontFamily: 'inherit' }} />
                  </div>
                ))}
                <button onClick={saveAccount} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 12, fontSize: 15, color: '#fff', cursor: 'pointer', fontWeight: 700, marginTop: 8 }}>
                  {editingIdx !== null ? '保存修改' : '添加账号'}
                </button>
              </div>
            </div>
          )}
                {toast && <div style={{ position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', background: 'rgba(28,28,30,.92)', backdropFilter: 'blur(20px)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>}
    </div>
  )
}

// ===== 工作台 =====
function Dashboard({ tv, acc, accounts, account, setAccount, setTab, showToast, insights, insightsLoading, showInsights, generateInsights, user, onLogout, onAddAccount, onEditAccount, onDeleteAccount }: any) {
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

    // ===== 视频生成工作室 =====
    function VideoStudio({ tv, acc, step, setStep, copy, setCopy, voiceId, setVoiceId, speed, setSpeed, avatarType, setAvatarType, avatarPreset, setAvatarPreset, bgType, setBgType, bgColor, setBgColor, loading, setLoading, audioB64, setAudioB64, result, setResult, error, setError, showToast, savedContents, setTab }: any) {
      const VOICES = [
        { id: 'female-shaonv', label: '少女音', desc: '清甜活泼', emoji: '👧' },
        { id: 'female-yujie', label: '御姐音', desc: '成熟知性', emoji: '👩' },
        { id: 'male-qn-qingse', label: '青涩男声', desc: '年轻有活力', emoji: '👦' },
        { id: 'male-qn-jingying', label: '精英男声', desc: '专业沉稳', emoji: '👨' },
        { id: 'presenter_male', label: '播音男声', desc: '标准普通话', emoji: '🎙️' },
        { id: 'audiobook_female_1', label: '有声书女声', desc: '温柔叙事', emoji: '📖' },
      ]
      const AVATARS = [
        { id: 'business-female', label: '职场女性', emoji: '👩‍💼', desc: '专业形象' },
        { id: 'business-male', label: '职场男性', emoji: '👨‍💼', desc: '商务风格' },
        { id: 'casual-female', label: '休闲女生', emoji: '👩', desc: '亲切自然' },
        { id: 'casual-male', label: '休闲男生', emoji: '👨', desc: '轻松随意' },
      ]
      const BG_COLORS = ['#1a1a2e','#16213e','#0f3460','#1b4332','#2d1b69','#3d0000','#1a1a1a','#f8f9fa']
      const STEPS = [
        { id: 'input', label: '文案', icon: '✍️' },
        { id: 'voice', label: '声音', icon: '🎙️' },
        { id: 'avatar', label: '形象', icon: '🧑' },
        { id: 'preview', label: '生成', icon: '🎬' },
      ]

      async function generateTTS() {
        if (!copy.trim()) { showToast('请先输入文案'); return }
        setLoading(true); setError(''); setAudioB64('')
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: copy, voiceId, speed }),
          })
          const data = await res.json()
          if (!res.ok || data.error) {
            if (data.configured === false) {
              setError('⚙️ MiniMax API 未配置\n请在 Vercel 后台添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID 环境变量')
            } else {
              setError(data.error || '生成失败')
            }
            return
          }
          setAudioB64(data.audio)
          showToast('✅ 语音合成成功！')
          setStep('avatar')
        } catch (e: any) {
          setError(e.message)
        } finally {
          setLoading(false)
        }
      }

      const stepIdx = STEPS.findIndex(s => s.id === step)

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
          <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'] }}>🎬 视频生成</div>
                <div style={{ fontSize: 12, color: tv['--t3'] }}>文案 → 语音 → 数字人 → 成片</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#007AFF,#AF52DE)', borderRadius: 10, padding: '4px 10px' }}>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>AI 驱动</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10, marginTop: 8 }}>
              {STEPS.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div onClick={() => { if (i <= stepIdx) setStep(s.id) }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', flex: 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      background: i < stepIdx ? tv['--green'] : i === stepIdx ? tv['--accent'] : tv['--inp'],
                      color: i <= stepIdx ? '#fff' : tv['--t4'], fontWeight: 700, transition: 'all .2s' }}>
                      {i < stepIdx ? '✓' : s.icon}
                    </div>
                    <span style={{ fontSize: 9, color: i === stepIdx ? tv['--accent'] : tv['--t4'], fontWeight: i === stepIdx ? 700 : 400 }}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div style={{ height: 2, flex: 0.3, background: i < stepIdx ? tv['--green'] : tv['--inp'], borderRadius: 1, marginBottom: 14 }} />}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

            {step === 'input' && (
              <div>
                {savedContents.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 6 }}>📌 从已保存文案导入</div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {savedContents.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} onClick={() => { setCopy(c.content); showToast('✅ 已导入文案') }}
                          style={{ flexShrink: 0, background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', maxWidth: 140 }}>
                          <div style={{ fontSize: 11, color: tv['--t1'], fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic || '已保存文案'}</div>
                          <div style={{ fontSize: 10, color: tv['--t3'], marginTop: 2 }}>{c.content?.slice(0, 20)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>📝 口播文案</div>
                  <textarea value={copy} onChange={e => setCopy(e.target.value)}
                    placeholder="输入或粘贴口播文案，AI 将为你合成语音并生成视频..."
                    style={{ width: '100%', minHeight: 140, background: tv['--inp'], border: 'none', borderRadius: 10, padding: 10, fontSize: 13, color: tv['--t1'], resize: 'none', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: tv['--t3'] }}>{copy.length} 字 · 约 {Math.ceil(copy.length / 4)} 秒</span>
                    <button onClick={() => setCopy('')} style={{ fontSize: 11, color: tv['--t3'], background: 'none', border: 'none', cursor: 'pointer' }}>清空</button>
                  </div>
                </div>
                {!copy.trim() && (
                  <div onClick={() => setTab('content')} style={{ background: `linear-gradient(135deg,${tv['--accent']}15,${tv['--accent']}05)`, border: `1px dashed ${tv['--accent']}60`, borderRadius: 14, padding: 14, cursor: 'pointer', textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>✍️</div>
                    <div style={{ fontSize: 13, color: tv['--accent'], fontWeight: 600 }}>去内容中心生成文案</div>
                    <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>生成后保存，可在这里一键导入</div>
                  </div>
                )}
                <button onClick={() => { if (!copy.trim()) { showToast('请先输入文案'); return }; setStep('voice') }}
                  style={{ width: '100%', padding: '14px 0', background: copy.trim() ? tv['--accent'] : tv['--inp'], color: copy.trim() ? '#fff' : tv['--t4'], border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: copy.trim() ? 'pointer' : 'default', transition: 'all .2s' }}>
                  下一步：选择声音 →
                </button>
              </div>
            )}

            {step === 'voice' && (
              <div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>🎙️ 选择音色</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {VOICES.map(v => (
                      <div key={v.id} onClick={() => setVoiceId(v.id)}
                        style={{ background: voiceId === v.id ? `${tv['--accent']}15` : tv['--inp'], border: `1.5px solid ${voiceId === v.id ? tv['--accent'] : 'transparent'}`, borderRadius: 12, padding: '10px 12px', cursor: 'pointer', transition: 'all .15s' }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{v.emoji}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: tv['--t1'] }}>{v.label}</div>
                        <div style={{ fontSize: 10, color: tv['--t3'] }}>{v.desc}</div>
                        {voiceId === v.id && <div style={{ fontSize: 10, color: tv['--accent'], marginTop: 4, fontWeight: 600 }}>✓ 已选择</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'] }}>⚡ 语速</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tv['--accent'] }}>{speed.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: tv['--accent'] }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: tv['--t4'], marginTop: 4 }}>
                    <span>0.5x 慢</span><span>1.0x 正常</span><span>2.0x 快</span>
                  </div>
                </div>
                <div style={{ background: `linear-gradient(135deg,#AF52DE15,#007AFF10)`, border: `1px solid #AF52DE30`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🔮</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'] }}>声音克隆</div>
                      <div style={{ fontSize: 11, color: tv['--t3'] }}>上传3-10秒音频，克隆你的声音</div>
                    </div>
                    <div style={{ marginLeft: 'auto', background: '#AF52DE20', borderRadius: 8, padding: '3px 8px' }}>
                      <span style={{ fontSize: 10, color: '#AF52DE', fontWeight: 600 }}>需配置 API</span>
                    </div>
                  </div>
                  <div style={{ background: tv['--inp'], borderRadius: 10, padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }}>
                    <span style={{ fontSize: 12, color: tv['--t3'] }}>📎 点击上传音频文件（mp3/wav）</span>
                  </div>
                </div>
                {error && (
                  <div style={{ background: '#FF3B3015', border: '1px solid #FF3B3040', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#FF3B30', whiteSpace: 'pre-line' }}>{error}</div>
                    {error.includes('未配置') && (
                      <div style={{ marginTop: 8, fontSize: 11, color: tv['--t3'] }}>
                        📍 获取方式：登录 platform.minimaxi.com → 创建应用 → 获取 API Key 和 Group ID → 在 Vercel 环境变量中添加
                      </div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('input')} style={{ flex: 1, padding: '12px 0', background: tv['--inp'], color: tv['--t2'], border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← 返回</button>
                  <button onClick={generateTTS} disabled={loading}
                    style={{ flex: 2, padding: '12px 0', background: loading ? tv['--inp'] : tv['--accent'], color: loading ? tv['--t4'] : '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', transition: 'all .2s' }}>
                    {loading ? '🎙️ 合成中...' : '🎙️ 合成语音'}
                  </button>
                </div>
                {audioB64 && (
                  <div style={{ marginTop: 10, background: '#34C75915', border: '1px solid #34C75940', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: tv['--green'], fontWeight: 600, marginBottom: 6 }}>✅ 语音已合成</div>
                    <audio controls src={`data:audio/mp3;base64,${audioB64}`} style={{ width: '100%', height: 36 }} />
                    <button onClick={() => setStep('avatar')} style={{ width: '100%', marginTop: 8, padding: '10px 0', background: tv['--green'], color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      下一步：选择形象 →
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'avatar' && (
              <div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>🧑 数字人形象</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {(['preset','upload'] as const).map(t => (
                      <button key={t} onClick={() => setAvatarType(t)}
                        style={{ flex: 1, padding: '8px 0', background: avatarType === t ? tv['--accent'] : tv['--inp'], color: avatarType === t ? '#fff' : tv['--t3'], border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {t === 'preset' ? '🎭 预设形象' : '📷 上传照片'}
                      </button>
                    ))}
                  </div>
                  {avatarType === 'preset' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {AVATARS.map(a => (
                        <div key={a.id} onClick={() => setAvatarPreset(a.id)}
                          style={{ background: avatarPreset === a.id ? `${tv['--accent']}15` : tv['--inp'], border: `1.5px solid ${avatarPreset === a.id ? tv['--accent'] : 'transparent'}`, borderRadius: 12, padding: '12px 10px', cursor: 'pointer', textAlign: 'center' }}>
                          <div style={{ fontSize: 32, marginBottom: 4 }}>{a.emoji}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: tv['--t1'] }}>{a.label}</div>
                          <div style={{ fontSize: 10, color: tv['--t3'] }}>{a.desc}</div>
                          {avatarPreset === a.id && <div style={{ fontSize: 10, color: tv['--accent'], marginTop: 4, fontWeight: 600 }}>✓ 已选</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: tv['--inp'], borderRadius: 12, padding: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                      <div style={{ fontSize: 13, color: tv['--t2'], fontWeight: 600, marginBottom: 4 }}>上传人物照片</div>
                      <div style={{ fontSize: 11, color: tv['--t3'], marginBottom: 12 }}>正面清晰照片效果最佳</div>
                      <div style={{ background: '#AF52DE20', borderRadius: 8, padding: '4px 10px', display: 'inline-block' }}>
                        <span style={{ fontSize: 11, color: '#AF52DE', fontWeight: 600 }}>需配置 LatentSync API</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>🖼️ 背景设置</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {([['color','纯色'],['image','图片'],['blur','虚化']] as const).map(([t, l]) => (
                      <button key={t} onClick={() => setBgType(t)}
                        style={{ flex: 1, padding: '7px 0', background: bgType === t ? tv['--accent'] : tv['--inp'], color: bgType === t ? '#fff' : tv['--t3'], border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  {bgType === 'color' && (
                    <div>
                      <div style={{ fontSize: 11, color: tv['--t3'], marginBottom: 8 }}>选择背景色</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {BG_COLORS.map(c => (
                          <div key={c} onClick={() => setBgColor(c)}
                            style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer', border: bgColor === c ? `3px solid ${tv['--accent']}` : '2px solid transparent', transition: 'border .15s' }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {bgType === 'image' && (
                    <div style={{ background: tv['--inp'], borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: tv['--t3'] }}>📎 上传背景图片</div>
                      <div style={{ fontSize: 10, color: tv['--t4'], marginTop: 4 }}>rembg 自动抠图后合成</div>
                    </div>
                  )}
                  {bgType === 'blur' && (
                    <div style={{ background: tv['--inp'], borderRadius: 10, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: tv['--t3'] }}>原视频背景虚化处理</div>
                      <div style={{ fontSize: 10, color: tv['--t4'], marginTop: 4 }}>FFmpeg 高斯模糊滤镜</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('voice')} style={{ flex: 1, padding: '12px 0', background: tv['--inp'], color: tv['--t2'], border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← 返回</button>
                  <button onClick={() => setStep('preview')}
                    style={{ flex: 2, padding: '12px 0', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    下一步：生成视频 →
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div>
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📋 生成配置</div>
                  {[
                    { label: '文案', value: copy.slice(0, 30) + (copy.length > 30 ? '...' : ''), icon: '📝' },
                    { label: '音色', value: VOICES.find(v => v.id === voiceId)?.label || voiceId, icon: '🎙️' },
                    { label: '语速', value: `${speed.toFixed(1)}x`, icon: '⚡' },
                    { label: '形象', value: avatarType === 'preset' ? (AVATARS.find(a => a.id === avatarPreset)?.label || avatarPreset) : '自定义照片', icon: '🧑' },
                    { label: '背景', value: bgType === 'color' ? '纯色背景' : bgType === 'image' ? '自定义图片' : '虚化背景', icon: '🖼️' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: tv['--t3'], width: 36 }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: tv['--t1'], fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: `linear-gradient(135deg,#007AFF10,#AF52DE10)`, border: `1px solid #007AFF20`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>⚙️ 合成流程</div>
                  {[
                    { step: '1', label: 'MiniMax TTS', desc: '文案 → 语音', status: audioB64 ? 'done' : 'pending' },
                    { step: '2', label: 'LatentSync', desc: '语音 → 对口型视频', status: 'pending' },
                    { step: '3', label: 'rembg', desc: '人物抠图', status: 'pending' },
                    { step: '4', label: 'FFmpeg', desc: '合成最终视频', status: 'pending' },
                  ].map(item => (
                    <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.status === 'done' ? tv['--green'] : tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: item.status === 'done' ? '#fff' : tv['--t4'], fontWeight: 700, flexShrink: 0 }}>
                        {item.status === 'done' ? '✓' : item.step}
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tv['--t1'] }}>{item.label}</span>
                        <span style={{ fontSize: 11, color: tv['--t3'], marginLeft: 6 }}>{item.desc}</span>
                      </div>
                      <span style={{ fontSize: 10, color: item.status === 'done' ? tv['--green'] : '#FF9500', fontWeight: 600 }}>
                        {item.status === 'done' ? '✅ 完成' : '⏳ 待配置'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#FF950015', border: '1px solid #FF950040', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#FF9500', marginBottom: 8 }}>🔧 需要配置的 API</div>
                  {[
                    { name: 'MiniMax TTS', key: 'MINIMAX_API_KEY + MINIMAX_GROUP_ID', where: 'platform.minimaxi.com', status: '⚠️ 未配置' },
                    { name: 'LatentSync', key: '自部署 GPU 服务器', where: 'github.com/bytedance/LatentSync', status: '🔮 后期' },
                    { name: 'rembg', key: '自部署 或 Remove.bg API', where: 'github.com/danielgatis/rembg', status: '🔮 后期' },
                  ].map((item, idx) => (
                    <div key={item.name} style={{ marginBottom: idx < 2 ? 8 : 0, paddingBottom: idx < 2 ? 8 : 0, borderBottom: idx < 2 ? `1px solid #FF950020` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tv['--t1'] }}>{item.name}</span>
                        <span style={{ fontSize: 10, color: '#FF9500' }}>{item.status}</span>
                      </div>
                      <div style={{ fontSize: 10, color: tv['--t3'], marginTop: 2 }}>Key: {item.key}</div>
                      <div style={{ fontSize: 10, color: tv['--accent'], marginTop: 1 }}>📍 {item.where}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('avatar')} style={{ flex: 1, padding: '12px 0', background: tv['--inp'], color: tv['--t2'], border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>← 返回</button>
                  <button onClick={() => showToast('🔧 视频合成 API 配置后即可使用')}
                    style={{ flex: 2, padding: '12px 0', background: 'linear-gradient(135deg,#007AFF,#AF52DE)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    🎬 生成视频
                  </button>
                </div>
                {audioB64 && (
                  <div style={{ marginTop: 12, background: '#34C75910', border: '1px solid #34C75930', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 12, color: tv['--green'], fontWeight: 600, marginBottom: 6 }}>🎙️ 语音预览（已合成）</div>
                    <audio controls src={`data:audio/mp3;base64,${audioB64}`} style={{ width: '100%', height: 36 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    
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
    function Operations({ tv, acc, showToast, schedule, setSchedule, opsTab, setOpsTab, savedContents }: any) {
      const statusColor: Record<string, string> = { '待发布': tv['--orange'], '草稿': tv['--t4'], '计划中': tv['--t4'], '已发布': tv['--green'] }
      const platformIcon: Record<string, string> = { '抖音': '🎵', '小红书': '📕', '视频号': '📹', '快手': '⚡' }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
          <div style={{ padding: '10px 16px 8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: tv['--t1'] }}>运营中心</div>
                <div style={{ fontSize: 12, color: tv['--t3'] }}>{acc.name}</div>
              </div>
            </div>
            <div style={{ display: 'flex', background: tv['--inp'], borderRadius: 12, padding: 2, gap: 2 }}>
              {[['schedule','📅 排期'],['stats','📊 数据'],['goals','🎯 目标']].map(([id, label]) => (
                <div key={id} onClick={() => setOpsTab(id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, background: opsTab === id ? tv['--card'] : 'transparent', textAlign: 'center', cursor: 'pointer', boxShadow: opsTab === id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: opsTab === id ? 700 : 500, color: opsTab === id ? tv['--t1'] : tv['--t3'] }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

            {/* 发布排期 */}
            {opsTab === 'schedule' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: tv['--t2'] }}>近期发布计划</div>
                  <button onClick={() => showToast('添加排期即将上线')} style={{ padding: '5px 12px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', border: 'none', borderRadius: 20, fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>＋ 添加</button>
                </div>
                {/* 本周日历视图 */}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>本周概览</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['一','二','三','四','五','六','日'].map((d, i) => {
                      const hasContent = [0, 2, 4].includes(i)
                      const isToday = i === new Date().getDay() - 1
                      return (
                        <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: isToday ? tv['--accent'] : tv['--t3'], marginBottom: 4, fontWeight: isToday ? 700 : 400 }}>{d}</div>
                          <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: hasContent ? (isToday ? tv['--accent'] : `${tv['--accent']}30`) : tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {hasContent && <span style={{ fontSize: 14 }}>{isToday ? '📍' : '✓'}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* 排期列表 */}
                {schedule.map((item: any, i: number) => (
                  <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[item.status] || tv['--t4'], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 2 }}>{platformIcon[item.platform] || '📱'} {item.platform} · {item.time}</div>
                    </div>
                    <span style={{ background: `${statusColor[item.status] || tv['--t4']}20`, color: statusColor[item.status] || tv['--t4'], padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{item.status}</span>
                  </div>
                ))}
                {/* 已保存文案快速添加 */}
                {savedContents?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: tv['--t3'], marginBottom: 8 }}>💡 从已保存文案快速排期</div>
                    {savedContents.slice(0, 3).map((c: any, i: number) => (
                      <div key={i} onClick={() => { setSchedule([...schedule, { time: '待定', title: c.topic, status: '草稿', platform: '抖音' }]); showToast('已加入排期') }} style={{ background: tv['--inp'], borderRadius: 10, padding: '8px 12px', marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: tv['--t2'], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.topic}</span>
                        <span style={{ fontSize: 11, color: tv['--accent'], flexShrink: 0, marginLeft: 8 }}>＋排期</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 数据统计 */}
            {opsTab === 'stats' && (
              <div>
                {/* 核心数据 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: '新增粉丝', value: '＋234', change: '↑18%', color: tv['--green'], icon: '👥' },
                    { label: '视频播放', value: '12.3万', change: '↑24%', color: tv['--accent'], icon: '▶️' },
                    { label: '互动总量', value: '1,892', change: '↑11%', color: tv['--orange'], icon: '❤️' },
                    { label: '主页访问', value: '3,421', change: '↑32%', color: tv['--purple'], icon: '👁️' },
                  ].map(item => (
                    <div key={item.label} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 18 }}>{item.icon}</span>
                        <span style={{ fontSize: 11, color: tv['--t3'] }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: tv['--green'], marginTop: 2 }}>{item.change} 较上周</div>
                    </div>
                  ))}
                </div>
                {/* 完播率趋势 */}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 12 }}>📈 近7天完播率</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                    {[28, 34, 31, 42, 38, 45, 34].map((v, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', background: i === 6 ? tv['--accent'] : `${tv['--accent']}40`, borderRadius: '4px 4px 0 0', height: `${v * 1.2}px` }} />
                        <span style={{ fontSize: 9, color: tv['--t4'] }}>{['一','二','三','四','五','六','日'][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: tv['--t3'] }}>平均完播率</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: tv['--accent'] }}>36.0%</span>
                  </div>
                </div>
                {/* 内容类型分布 */}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>🎬 内容类型表现</div>
                  {[['干货分享','45%',tv['--accent']],['情感故事','28%',tv['--orange']],['产品展示','18%',tv['--green']],['日常vlog','9%',tv['--purple']]].map(([type, pct, color]) => (
                    <div key={type as string} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: tv['--t2'] }}>{type}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: color as string }}>{pct}</span>
                      </div>
                      <div style={{ height: 5, background: tv['--inp'], borderRadius: 3 }}>
                        <div style={{ height: '100%', width: pct as string, background: color as string, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 目标管理 */}
            {opsTab === 'goals' && (
              <div>
                <div style={{ background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 20, padding: 16, marginBottom: 14, color: '#fff' }}>
                  <div style={{ fontSize: 12, opacity: .8, marginBottom: 4 }}>本月阶段目标</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>突破 2000 粉丝</div>
                  <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 10, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: '#fff', borderRadius: 10 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, opacity: .85 }}>
                    <span>当前：1,200</span><span>目标：2,000</span>
                  </div>
                </div>
                {[
                  { label: '发布视频', current: 12, target: 20, unit: '条', color: tv['--accent'] },
                  { label: '涨粉', current: 1200, target: 2000, unit: '人', color: tv['--green'] },
                  { label: '私信线索', current: 24, target: 50, unit: '条', color: tv['--orange'] },
                  { label: '主页访问', current: 8400, target: 15000, unit: '次', color: tv['--purple'] },
                ].map(goal => {
                  const pct = Math.round(goal.current / goal.target * 100)
                  return (
                    <div key={goal.label} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{goal.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: goal.color }}>{goal.current.toLocaleString()}/{goal.target.toLocaleString()}{goal.unit}</span>
                      </div>
                      <div style={{ height: 6, background: tv['--inp'], borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: goal.color, borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                      <div style={{ fontSize: 11, color: tv['--t3'] }}>完成 {pct}%</div>
                    </div>
                  )
                })}
                {/* AI 优化建议 */}
                <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>💡 AI 运营建议</div>
                  {[
                    { icon: '⏰', tip: '你的粉丝活跃时间在 18:00-20:00，建议把发布时间调整到 18:30' },
                    { icon: '🎯', tip: '干货分享类内容完播率最高，本周可多发 2 条干货' },
                    { icon: '💬', tip: '评论区有 12 条未回复，及时互动可提升账号权重' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: tv['--t2'], lineHeight: 1.5 }}>{item.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    