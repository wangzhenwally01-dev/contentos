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
  const [matTab, setMatTab] = useState<'hotspot' | 'topics' | 'saved'>('hotspot')
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [savedContents, setSavedContents] = useState<SavedContent[]>([])
  const [posStep, setPosStep] = useState(0)
  const [posForm, setPosForm] = useState({ industry: '', product: '', targetCustomer: '', city: '', advantage: '' })
  const [posResult, setPosResult] = useState<any>(null)
  const [posLoading, setPosLoading] = useState(false)

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

  async function loadSavedContents() {
    const { data } = await supabase.from('contents').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setSavedContents(data)
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
        else showToast('注册成功！请查收验证邮件')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        if (error) setAuthError('邮箱或密码错误')
      }
    } catch { setAuthError('网络错误，请重试') }
    finally { setAuthLoading(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null); showToast('已退出登录')
  }

  async function generateCopy() {
    if (!selectedTopic.trim()) { setCopyError('请输入选题标题'); return }
    setCopyError(''); setCopyLoading(true); setCopyVersions([]); setCopyTokens(null)
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
    if (!user) { showToast('请先登录后保存'); return }
    const { error } = await supabase.from('contents').insert({
      user_id: user.id, topic: selectedTopic, style: version.style, content: version.content, account_name: acc.name
    })
    if (!error) { showToast('✅ 文案已保存'); loadSavedContents() }
    else showToast('保存失败')
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
    } catch { showToast('生成失败') }
    finally { setTopicsLoading(false) }
  }

  async function generateInsights() {
    setInsightsLoading(true); setShowInsights(true)
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views: '12.3万', likes: '2341', comments: '186', collects: '892' }),
      })
      const data = await res.json()
      if (data.success) setInsights(data.insights)
    } catch { showToast('生成失败') }
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
      if (data.success !== false) {
        setPosResult(data); setPosStep(2)
        if (user) {
          await supabase.from('positionings').insert({ user_id: user.id, ...posForm, result: data })
        }
      }
    } catch { showToast('生成失败') }
    finally { setPosLoading(false) }
  }

  async function copyText(text: string, idx: number) {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000)
  }

  function useTopic(title: string) {
    setSelectedTopic(title); setTab('content'); setContentStep(1); showToast('✅ 选题已选择')
  }

  // ===== 登录页 =====
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
        <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} style={{ width: '100%', padding: '14px 16px', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 12, background: 'rgba(255,255,255,.07)', fontSize: 15, color: '#fff', marginBottom: 12, fontFamily: 'inherit' }} placeholder="邮箱地址" type="email" />
        <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} style={{ width: '100%', padding: '14px 16px', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 12, background: 'rgba(255,255,255,.07)', fontSize: 15, color: '#fff', marginBottom: 8, fontFamily: 'inherit' }} type="password" placeholder="密码（6位以上）" />
        {authError && <div style={{ fontSize: 12, color: '#FF6B6B', marginBottom: 12, textAlign: 'center' }}>{authError}</div>}
        <button onClick={handleAuth} disabled={authLoading} style={{ width: '100%', padding: '14px', background: authLoading ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#007AFF,#30D5C8)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: authLoading ? 'not-allowed' : 'pointer', marginBottom: 12 }}>
          {authLoading ? '处理中...' : authMode === 'login' ? '登录' : '注册账号'}
        </button>
        <div onClick={() => { setAuthEmail('demo@contentos.ai'); setAuthPassword('demo123456') }} style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.3)', cursor: 'pointer' }}>
          体验账号：demo@contentos.ai / demo123456
        </div>
      </div>
      {toast && <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(28,28,30,.92)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{toast}</div>}
    </div>
  )

  // ===== 主应用 =====
  return (
    <div style={{ width: 390, height: 844, borderRadius: 50, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 0 0 10px #111,0 40px 100px rgba(0,0,0,.7)', background: TV['--bg'], flexShrink: 0 }}>
      {/* 刘海 */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 126, height: 34, background: '#000', borderRadius: 20, zIndex: 70 }} />
      {/* 状态栏 */}
      <div style={{ height: 50, padding: '16px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 60 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: TV['--t1'] }}>{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2,'0')}</div>
        <div style={{ display: 'flex', gap: 5, fontSize: 12, color: TV['--t1'] }}><span>●●●</span><span>WiFi</span><span>🔋</span></div>
      </div>

      {/* 内容区 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'dashboard' && <Dashboard tv={TV} acc={acc} accounts={accounts} account={account} setAccount={setAccount} setTab={setTab} showToast={showToast} insights={insights} insightsLoading={insightsLoading} showInsights={showInsights} generateInsights={generateInsights} user={user} onLogout={handleLogout} />}
        {tab === 'materials' && <Materials tv={TV} acc={acc} matTab={matTab} setMatTab={setMatTab} hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading} generateTopics={generateTopics} useTopic={useTopic} showToast={showToast} savedContents={savedContents} />}
        {tab === 'content' && <Content tv={TV} acc={acc} step={contentStep} setStep={setContentStep} topic={selectedTopic} setTopic={setSelectedTopic} style={copyStyle} setStyle={setCopyStyle} userInput={userInput} setUserInput={setUserInput} versions={copyVersions} loading={copyLoading} error={copyError} copiedIdx={copiedIdx} expandedIdx={expandedIdx} setExpandedIdx={setExpandedIdx} tokens={copyTokens} generate={generateCopy} copy={copyText} save={saveCopy} showToast={showToast} quickTopics={QUICK_TOPICS} setTab={setTab} />}
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
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: tv['--t1'] }}>工作台</div><div style={{ fontSize: 12, color: tv['--t3'] }}>{user?.email?.split('@')[0]} · 今天是个好日子 🌟</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div onClick={() => showToast('暂无新通知')} style={{ width: 34, height: 34, borderRadius: '50%', background: tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>🔔</div>
          <div onClick={onLogout} style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer' }} title="退出登录">退</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>
        {/* 账号切换 */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>我的账号</div>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
            {accounts.map((a: Account, i: number) => (
              <div key={i} onClick={() => setAccount(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ padding: 2.5, borderRadius: '50%', border: `2.5px solid ${i === account ? tv['--accent'] : 'transparent'}` }}>
                  <div style={{ width: i === account ? 58 : 50, height: i === account ? 58 : 50, borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === account ? 26 : 22, opacity: i === account ? 1 : 0.6 }}>{a.emoji}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: i === account ? 700 : 500, color: i === account ? tv['--accent'] : tv['--t3'], maxWidth: 58, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              </div>
            ))}
            <div onClick={() => setTab('positioning')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', border: `1.5px dashed ${tv['--b']}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: tv['--t4'], marginTop: 5 }}>+</div>
              <div style={{ fontSize: 10, color: tv['--t4'] }}>新建</div>
            </div>
          </div>
        </div>
        {/* 账号 Banner */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ background: acc.color, borderRadius: 20, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{acc.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>{acc.positioning}</div>
              </div>
              <button onClick={() => setTab('positioning')} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>定位方案 →</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['完播率','68%','↑12%'],['私信线索','24','↑8条'],['待发布','3','条视频']].map(([l,v,d]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,.15)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 运营建议 */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>今日建议</div>
          <div style={{ background: 'linear-gradient(135deg,rgba(0,122,255,.07),rgba(48,213,200,.07))', border: '.5px solid rgba(0,122,255,.14)', borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 4 }}>🎯 今日发布"端午套餐"视频</div>
            <div style={{ fontSize: 12, color: tv['--t2'], lineHeight: 1.5 }}>端午相关内容热度↑340%，建议今晚 18:30 发布，预计完播率提升 25%</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setTab('content')} style={{ padding: '7px 14px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>去创作</button>
              <button onClick={() => showToast('已忽略')} style={{ padding: '7px 14px', background: tv['--inp'], color: tv['--t1'], border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>忽略</button>
            </div>
          </div>
        </div>
        {/* 快速操作 */}
        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>快速操作</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[{icon:'🎯',label:'账号定位',bg:'rgba(0,122,255,.1)',tab:'positioning'},{icon:'📦',label:'素材中心',bg:'rgba(48,213,200,.1)',tab:'materials'},{icon:'✍️',label:'内容创作',bg:'rgba(175,82,222,.1)',tab:'content'},{icon:'📅',label:'运营中心',bg:'rgba(52,199,89,.1)',tab:'operations'},{icon:'🔥',label:'热点追踪',bg:'rgba(255,149,0,.1)',tab:'materials'},{icon:'📊',label:'数据分析',bg:'rgba(255,59,48,.1)',tab:null}].map(q => (
              <div key={q.label} onClick={() => q.tab ? setTab(q.tab) : showToast(`${q.label}即将上线`)} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{q.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: tv['--t2'] }}>{q.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* 数据回流 */}
        <div style={{ padding: '0 16px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'] }}>数据回流</div>
            <button onClick={generateInsights} style={{ padding: '5px 11px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{insightsLoading ? '分析中...' : '✨ AI 分析'}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[['曝光','12.3万','↑28%'],['点赞','2341','↑340'],['评论','186','↑42'],['收藏','892','↑120']].map(([l,v,d]) => (
              <div key={l} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, padding: '12px 8px' }}>
                <div style={{ fontSize: 10, color: tv['--t3'], marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: tv['--t1'] }}>{v}</div>
                <div style={{ fontSize: 10, color: tv['--green'], marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
          {showInsights && (
            <div style={{ background: 'linear-gradient(135deg,rgba(0,122,255,.07),rgba(48,213,200,.07))', border: '.5px solid rgba(0,122,255,.14)', borderRadius: 16, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>AI 优化建议</div>
              {insightsLoading ? <div style={{ fontSize: 12, color: tv['--accent'] }}>AI 正在分析数据...</div>
                : insights.map((ins: Insight, i: number) => <div key={i} style={{ fontSize: 12, color: tv['--t2'], lineHeight: 1.6, marginBottom: 6 }}>{ins.icon} <strong>{ins.title}：</strong>{ins.detail}</div>)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== 素材中心 =====
function Materials({ tv, acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, useTopic, showToast, savedContents }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: tv['--t1'] }}>素材中心</div><div style={{ fontSize: 12, color: tv['--t3'] }}>{acc.name} · {new Date().toLocaleDateString('zh-CN')}</div></div>
        <button onClick={() => showToast('追踪博主即将上线')} style={{ padding: '5px 11px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ 追踪博主</button>
      </div>
      <div style={{ padding: '0 16px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', background: tv['--inp'], borderRadius: 12, padding: 2, gap: 2 }}>
          {[['hotspot','🔥 热点'],['topics','📌 选题库'],['saved','💾 已保存']].map(([id, label]) => (
            <div key={id} onClick={() => setMatTab(id)} style={{ flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 12, fontWeight: matTab === id ? 700 : 500, color: matTab === id ? tv['--t1'] : tv['--t3'], cursor: 'pointer', textAlign: 'center', background: matTab === id ? tv['--card'] : 'transparent', transition: 'all .2s' }}>{label}</div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {matTab === 'hotspot' && hotspots.map((h: any) => (
          <div key={h.rank} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: h.rank <= 3 ? tv['--orange'] : tv['--t4'], width: 20 }}>{h.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'] }}>{h.title}</div>
              <div style={{ fontSize: 10, color: tv['--t3'] }}>🔥 {h.heat}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span style={{ background: `${h.relColor}20`, color: h.relColor, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{h.rel}</span>
              <button onClick={() => { setMatTab('topics'); showToast(`已选：${h.title}`) }} style={{ padding: '5px 11px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>选</button>
            </div>
          </div>
        ))}
        {matTab === 'topics' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: tv['--t2'] }}>AI 为 {acc.name} 推荐</div>
              <button onClick={generateTopics} style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {topicsLoading ? '生成中...' : '✨ AI 生成选题'}
              </button>
            </div>
            {(aiTopics.length === 0 ? QUICK_TOPICS.map((t: string) => ({ title: t, tags: [], reason: '' })) : aiTopics).map((t: any, i: number) => (
              <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: tv['--t1'], flex: 1, lineHeight: 1.4 }}>{t.title}</div>
                  <button onClick={() => useTopic(t.title)} style={{ padding: '5px 11px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 8 }}>使用</button>
                </div>
                {t.tags?.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{t.tags.map((tag: string) => <span key={tag} style={{ background: 'rgba(0,122,255,.1)', color: tv['--accent'], padding: '3px 9px', borderRadius: 999, fontSize: 11 }}>{tag}</span>)}</div>}
                {t.reason && <div style={{ fontSize: 11, color: tv['--t3'], marginTop: 5 }}>{t.reason}</div>}
              </div>
            ))}
          </div>
        )}
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
              <div key={i} style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: tv['--accent'], fontWeight: 600, marginBottom: 4 }}>{c.style}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], marginBottom: 6 }}>{c.topic}</div>
                <div style={{ fontSize: 12, color: tv['--t3'], lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{c.content}</div>
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
function Content({ tv, acc, step, setStep, topic, setTopic, style, setStyle, userInput, setUserInput, versions, loading, error, copiedIdx, expandedIdx, setExpandedIdx, tokens, generate, copy, save, showToast, quickTopics, setTab }: any) {
  const sc = (s: string) => {
    if (s?.startsWith('犀利')) return { bg: 'rgba(255,149,0,.06)', border: 'rgba(255,149,0,.25)', text: '#c47000', badge: 'rgba(255,149,0,.12)' }
    if (s?.startsWith('朋友')) return { bg: 'rgba(0,122,255,.06)', border: 'rgba(0,122,255,.2)', text: tv['--accent'], badge: 'rgba(0,122,255,.1)' }
    if (s?.startsWith('口播')) return { bg: 'rgba(175,82,222,.06)', border: 'rgba(175,82,222,.2)', text: tv['--purple'], badge: 'rgba(175,82,222,.1)' }
    return { bg: 'rgba(0,122,255,.06)', border: 'rgba(0,122,255,.2)', text: tv['--accent'], badge: 'rgba(0,122,255,.1)' }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: tv['--bg'] }}>
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div><div style={{ fontSize: 26, fontWeight: 800, color: tv['--t1'] }}>内容中心</div><div style={{ fontSize: 12, color: tv['--t3'] }}>{acc.name}</div></div>
        <div onClick={() => showToast('AI 设置')} style={{ width: 28, height: 28, borderRadius: '50%', background: tv['--inp'], display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}>⚙</div>
      </div>
      {/* 步骤条 */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', background: tv['--card2'], borderBottom: `.5px solid ${tv['--b']}`, flexShrink: 0 }}>
        {[['选题',0],['文案',1],['视频',2]].map(([label, s], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 'auto' : 'none' }}>
            <div onClick={() => setStep(s)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: step > (s as number) ? tv['--green'] : step === s ? tv['--accent'] : tv['--inp'], color: step >= (s as number) ? '#fff' : tv['--t3'] }}>
                {step > (s as number) ? '✓' : (s as number)+1}
              </div>
              <div style={{ fontSize: 9, color: step === s ? tv['--accent'] : step > (s as number) ? tv['--green'] : tv['--t3'], fontWeight: step === s ? 700 : 500 }}>{label}</div>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1.5, background: step > i ? tv['--green'] : tv['--b'], margin: '0 4px', marginBottom: 14 }} />}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {step === 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: tv['--t3'], marginBottom: 8 }}>选题标题</div>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="输入或选择选题..." style={{ width: '100%', padding: '12px 16px', background: tv['--inp'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, fontSize: 15, color: tv['--t1'], marginBottom: 10, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {quickTopics.map((t: string) => <button key={t} onClick={() => setTopic(t)} style={{ padding: '6px 12px', background: 'rgba(0,122,255,.08)', color: tv['--accent'], border: 'none', borderRadius: 999, fontSize: 12, cursor: 'pointer' }}>{t}</button>)}
            </div>
            <button onClick={() => setStep(1)} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>确认选题，去生成文案 →</button>
          </div>
        )}
        {step === 1 && (
          <div>
            <div style={{ padding: '10px 14px', background: 'rgba(0,122,255,.06)', border: '.5px solid rgba(0,122,255,.12)', borderRadius: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: tv['--accent'], fontWeight: 600, marginBottom: 2 }}>当前选题</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: tv['--t1'], flex: 1 }}>{topic}</div>
                <button onClick={() => setStep(0)} style={{ fontSize: 11, color: tv['--accent'], background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>换选题</button>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: tv['--t3'], marginBottom: 8 }}>文案风格</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
              {['犀利观点','朋友聊天','口播带货','专业顾问'].map(s => (
                <button key={s} onClick={() => setStyle(s)} style={{ padding: '7px 15px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: `.5px solid ${style === s ? tv['--accent'] : tv['--b']}`, background: style === s ? tv['--accent'] : tv['--card'], color: style === s ? '#fff' : tv['--t2'], flexShrink: 0 }}>{s}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: tv['--t3'], marginBottom: 8 }}>我的观点 <span style={{ fontWeight: 400 }}>（可选）</span></div>
            <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="输入你的真实经历、独特观点..." rows={3} style={{ width: '100%', padding: '12px 16px', background: tv['--inp'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, fontSize: 13, color: tv['--t1'], marginBottom: 14, fontFamily: 'inherit', lineHeight: 1.5 }} />
            {error && <div style={{ fontSize: 13, color: tv['--red'], background: 'rgba(255,59,48,.08)', padding: '10px 14px', borderRadius: 12, marginBottom: 12 }}>{error}</div>}
            <button onClick={generate} disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? tv['--inp'] : 'linear-gradient(135deg,#007AFF,#30D5C8)', color: loading ? tv['--t3'] : '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16 }}>
              {loading ? '⏳ AI 生成中...' : '✨ 生成 3 版文案'}
            </button>
            {tokens && <div style={{ fontSize: 11, color: tv['--t3'], textAlign: 'center', marginBottom: 12 }}>消耗 {tokens} tokens ≈ ¥{((tokens/1000000)*2).toFixed(4)}</div>}
            {versions.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: tv['--t1'] }}>文案候选</div>
                  <button onClick={generate} disabled={loading} style={{ fontSize: 13, color: tv['--accent'], background: 'none', border: 'none', cursor: 'pointer' }}>🔄 重新生成</button>
                </div>
                {versions.map((v: CopyVersion, idx: number) => {
                  const c = sc(v.style)
                  const isExp = expandedIdx === idx
                  return (
                    <div key={idx} style={{ background: c.bg, border: `.5px solid ${c.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
                      <div onClick={() => setExpandedIdx(isExp ? null : idx)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: c.badge, color: c.text, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{v.style}</span>
                          <span style={{ fontSize: 11, color: tv['--t3'] }}>版本 {String.fromCharCode(65+idx)}</span>
                        </div>
                        <span style={{ color: tv['--t4'] }}>{isExp ? '▲' : '▼'}</span>
                      </div>
                      {!isExp && <div style={{ marginTop: 8, fontSize: 12, color: tv['--t3'], overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.content}</div>}
                      {isExp && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.06)' }}>
                          {v.hook && <div style={{ fontSize: 11, color: c.text, fontWeight: 600, marginBottom: 6 }}>🎣 钩子：{v.hook}</div>}
                          <div style={{ fontSize: 13, color: tv['--t2'], lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{v.content}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button onClick={() => copy(v.content, idx)} style={{ flex: 1, padding: '9px', background: 'rgba(255,255,255,.6)', color: tv['--t2'], border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{copiedIdx === idx ? '✅ 已复制' : '📋 复制'}</button>
                            <button onClick={() => save(v)} style={{ flex: 1, padding: '9px', background: tv['--green'], color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💾 保存</button>
                            <button onClick={() => { setStep(2); showToast('进入视频合成') }} style={{ flex: 1, padding: '9px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🎬 视频</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {step === 2 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎬</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>视频合成</div>
            <div style={{ fontSize: 13, color: tv['--t3'], marginBottom: 24, lineHeight: 1.6 }}>选择声音克隆 + 背景素材<br/>AI 自动合成口播视频</div>
            <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'left' }}>
              {[['声音克隆','老李本人声音 ✓'],['背景素材','面馆实拍素材库'],['字幕样式','白色描边 · 居中'],['视频比例','9:16 竖屏']].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `.5px solid ${tv['--b']}` }}>
                  <span style={{ fontSize: 13, color: tv['--t3'] }}>{l}</span>
                  <span style={{ fontSize: 13, color: tv['--t1'], fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => showToast('视频合成功能即将上线')} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>开始合成视频</button>
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
        <div style={{ fontSize: 26, fontWeight: 800, color: tv['--t1'] }}>账号定位</div>
        <div style={{ fontSize: 12, color: tv['--t3'] }}>AI 帮你找到最适合的内容方向</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {step === 0 && (
          <div>
            <div style={{ background: 'linear-gradient(135deg,rgba(0,122,255,.07),rgba(48,213,200,.07))', border: '.5px solid rgba(0,122,255,.14)', borderRadius: 16, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 6 }}>🎯 什么是账号定位？</div>
              <div style={{ fontSize: 12, color: tv['--t2'], lineHeight: 1.6 }}>账号定位决定了你的内容方向、目标人群和差异化优势。好的定位能让你的视频更精准触达目标用户，提升完播率和转化率。</div>
            </div>
            {[
              { label: '行业/领域 *', key: 'industry', placeholder: '如：餐饮、美业、教育、健身...' },
              { label: '产品/服务 *', key: 'product', placeholder: '如：面馆、美容院、英语培训...' },
              { label: '目标客户 *', key: 'targetCustomer', placeholder: '如：周边上班族、宝妈、学生家长...' },
              { label: '所在城市', key: 'city', placeholder: '如：上海、成都（可不填）' },
              { label: '你的优势', key: 'advantage', placeholder: '如：10年经验、价格实惠、服务好...' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: tv['--t3'], marginBottom: 6 }}>{f.label}</div>
                <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ width: '100%', padding: '12px 16px', background: tv['--inp'], border: `.5px solid ${tv['--b']}`, borderRadius: 12, fontSize: 14, color: tv['--t1'], fontFamily: 'inherit' }} />
              </div>
            ))}
            <button onClick={() => { if (!form.industry || !form.product || !form.targetCustomer) { showToast('请填写必填项'); return } setStep(1); generate() }} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#007AFF,#30D5C8)', color: '#fff', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              ✨ AI 生成定位方案
            </button>
          </div>
        )}
        {step === 1 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: tv['--t1'], marginBottom: 8 }}>AI 正在分析...</div>
            <div style={{ fontSize: 13, color: tv['--t3'], lineHeight: 1.6 }}>正在为你生成专属账号定位方案<br/>通常需要 10-20 秒</div>
            {!loading && result && <button onClick={() => setStep(2)} style={{ marginTop: 20, padding: '12px 28px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>查看结果</button>}
          </div>
        )}
        {step === 2 && result && (
          <div>
            <div style={{ background: 'linear-gradient(135deg,#007AFF,#30D5C8)', borderRadius: 20, padding: '20px', marginBottom: 16, color: '#fff' }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>账号定位</div>
              <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{result.positioning}</div>
            </div>
            {result.directions && (
              <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '16px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📌 内容方向</div>
                {result.directions.map((d: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: tv['--accent'], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                    <div style={{ fontSize: 13, color: tv['--t2'] }}>{d}</div>
                  </div>
                ))}
              </div>
            )}
            {result.names && (
              <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '16px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>💡 建议账号名</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {result.names.map((n: string, i: number) => (
                    <span key={i} style={{ background: 'rgba(0,122,255,.1)', color: tv['--accent'], padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{n}</span>
                  ))}
                </div>
              </div>
            )}
            {result.plan && result.plan.length > 0 && (
              <div style={{ background: tv['--card'], border: `.5px solid ${tv['--b']}`, borderRadius: 16, padding: '16px', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: tv['--t1'], marginBottom: 10 }}>📅 前30天内容规划</div>
                {result.plan.slice(0,4).map((w: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tv['--accent'], marginBottom: 4 }}>第{w.week}周：{w.theme}</div>
                    {w.topics?.map((t: string, j: number) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `.5px solid ${tv['--b']}` }}>
                        <div style={{ fontSize: 12, color: tv['--t2'] }}>· {t}</div>
                        <button onClick={() => useTopic(t)} style={{ fontSize: 11, color: tv['--accent'], background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}>用</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setStep(0) }} style={{ flex: 1, padding: '12px', background: tv['--inp'], color: tv['--t2'], border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>重新生成</button>
              <button onClick={() => showToast('✅ 定位方案已保存')} style={{ flex: 1, padding: '12px', background: tv['--accent'], color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>保存方案</button>
            </div>
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
        <div style={{ fontSize: 26, fontWeight: 800, color: tv['--t1'] }}>运营中心</div>
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
                <div style={{ height: 4, background: tv['--inp'], borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: p, background: tv['--accent'], borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => showToast('更多运营功能即将上线')} style={{ width: '100%', padding: '12px', background: tv['--inp'], color: tv['--t2'], border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>查看完整运营报告</button>
      </div>
    </div>
  )
}
