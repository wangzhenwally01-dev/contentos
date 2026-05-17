'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Tab = 'dashboard' | 'materials' | 'content' | 'video' | 'operations'
type MatTab = 'hotspot' | 'topics' | 'radar' | 'creator' | 'style'
type OpsTab = 'schedule' | 'stats' | 'goals'
type VideoStep = 'input' | 'voice' | 'avatar' | 'preview'

interface Account { id: string; name: string; emoji: string; industry: string; positioning: string; targetAudience: string; color: string }
interface SavedContent { id: string; topic: string; style: string; content: string; createdAt: string }
interface Topic { title: string; category: string; reason: string; hook: string; tags: string[] }

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: '老李面馆', emoji: '🍜', industry: '餐饮', positioning: '本地餐饮·老板IP流', targetAudience: '周边3km上班族', color: 'from-orange-400 to-amber-500' },
  { id: '2', name: '健身工作室', emoji: '💪', industry: '健身', positioning: '专业健身教练', targetAudience: '18-35岁健身爱好者', color: 'from-blue-500 to-cyan-400' },
]
const HOTSPOTS = [
  { title: '端午节限定套餐', heat: 98, tag: '节日热点' },
  { title: '夏日消暑特饮', heat: 92, tag: '季节热点' },
  { title: '老板的一天', heat: 87, tag: '老板IP' },
  { title: '顾客感动故事', heat: 85, tag: '情感共鸣' },
  { title: '开店3年踩过的坑', heat: 94, tag: '干货分享' },
]

function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap">
      {msg}
    </div>
  )
}

export default function ContentOSApp() {
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [toast, setToast] = useState('')
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [accountIdx, setAccountIdx] = useState(0)
  const [contentStep, setContentStep] = useState(1)
  const [selectedTopic, setSelectedTopic] = useState('开面馆 3 年，我踩过的 5 个最贵的坑')
  const [copyStyle, setCopyStyle] = useState('犀利观点')
  const [userInput, setUserInput] = useState('')
  const [copyVersions, setCopyVersions] = useState<any[]>([])
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [savedContents, setSavedContents] = useState<SavedContent[]>([])
  const [matTab, setMatTab] = useState<MatTab>('hotspot')
  const [aiTopics, setAiTopics] = useState<Topic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [creatorUrl, setCreatorUrl] = useState('')
  const [creatorLoading, setCreatorLoading] = useState(false)
  const [creatorData, setCreatorData] = useState<any>(null)
  const [trackedCreators, setTrackedCreators] = useState<any[]>([])
  const [radarData, setRadarData] = useState<any>(null)
  const [radarLoading, setRadarLoading] = useState(false)
  const [styleTemplates, setStyleTemplates] = useState<any[]>([])
  const [styleLoading, setStyleLoading] = useState(false)
  const [styleUrl, setStyleUrl] = useState('')
  const [styleName, setStyleName] = useState('')
  const [opsTab, setOpsTab] = useState<OpsTab>('schedule')
  const [schedule, setSchedule] = useState([
    { time: '今天 18:30', title: '端午节限定套餐来了！', status: '待发布', platform: '抖音' },
    { time: '明天 12:00', title: '开面馆3年踩过的坑', status: '草稿', platform: '抖音' },
    { time: '后天 19:00', title: '顾客感动故事', status: '计划中', platform: '小红书' },
  ])
  const [videoStep, setVideoStep] = useState<VideoStep>('input')
  const [videoCopy, setVideoCopy] = useState('')
  const [videoVoiceId, setVideoVoiceId] = useState('female-shaonv')
  const [videoSpeed, setVideoSpeed] = useState(1.0)
  const [videoAvatarType, setVideoAvatarType] = useState<'preset' | 'upload'>('preset')
  const [videoAvatarPreset, setVideoAvatarPreset] = useState('business-female')
  const [videoBgType, setVideoBgType] = useState<'color' | 'image' | 'blur'>('color')
  const [videoBgColor, setVideoBgColor] = useState('#1a1a2e')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoAudioB64, setVideoAudioB64] = useState('')
  const [videoError, setVideoError] = useState('')

  const acc = accounts[accountIdx] || accounts[0]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) setUser(session.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null) })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try {
      const s = localStorage.getItem('contentos_saved'); if (s) setSavedContents(JSON.parse(s))
      const t = localStorage.getItem('contentos_style_templates'); if (t) setStyleTemplates(JSON.parse(t))
      const c = localStorage.getItem('contentos_creators'); if (c) setTrackedCreators(JSON.parse(c))
    } catch {}
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function handleLogin() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message)
    setAuthLoading(false)
  }
  async function handleRegister() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message); else showToast('注册成功，请查收验证邮件')
    setAuthLoading(false)
  }
  async function handleLogout() { await supabase.auth.signOut(); setUser(null) }

  async function generateCopy() {
    if (!selectedTopic.trim()) { showToast('请先选择选题'); return }
    setCopyLoading(true); setCopyError(''); setCopyVersions([])
    try {
      const res = await fetch('/api/generate-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topicTitle: selectedTopic, style: copyStyle, userInput, accountName: acc.name, industry: acc.industry, positioning: acc.positioning, targetAudience: acc.targetAudience }) })
      const data = await res.json()
      if (data.versions) { setCopyVersions(data.versions); setContentStep(3) } else setCopyError(data.error || '生成失败')
    } catch (e: any) { setCopyError(e.message) } finally { setCopyLoading(false) }
  }

  async function generateTopics() {
    setTopicsLoading(true)
    try {
      const res = await fetch('/api/generate-topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positioning: acc.positioning, industry: acc.industry, accountName: acc.name, count: 6 }) })
      const data = await res.json(); if (data.topics) setAiTopics(data.topics)
    } catch {} finally { setTopicsLoading(false) }
  }

  async function scrapeCreator() {
    if (!creatorUrl.trim()) { showToast('请输入博主链接'); return }
    setCreatorLoading(true)
    try {
      const res = await fetch('/api/scrape-creator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: creatorUrl, count: 20, sort: 'likes' }) })
      const data = await res.json()
      if (data.creator) {
        setCreatorData(data)
        const updated = [{ ...data.creator, videos: data.videos, summary: data.summary, addedAt: new Date().toISOString() }, ...trackedCreators.filter((c: any) => c.url !== creatorUrl)]
        setTrackedCreators(updated); localStorage.setItem('contentos_creators', JSON.stringify(updated))
        showToast(`✅ 已抓取 ${data.videos?.length || 0} 条视频`)
      }
    } catch (e: any) { showToast('抓取失败: ' + e.message) } finally { setCreatorLoading(false) }
  }

  async function fetchRadar() {
    setRadarLoading(true)
    try {
      const res = await fetch('/api/daily-radar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry: acc.industry }) })
      const data = await res.json(); if (data.hotspots) setRadarData(data)
    } catch {} finally { setRadarLoading(false) }
  }

  async function analyzeStyle() {
    if (!styleUrl.trim() && !styleName.trim()) { showToast('请输入博主链接或名称'); return }
    setStyleLoading(true)
    try {
      const res = await fetch('/api/analyze-style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: styleUrl, name: styleName, industry: acc.industry }) })
      const data = await res.json()
      if (data.template) {
        const updated = [data.template, ...styleTemplates]; setStyleTemplates(updated)
        localStorage.setItem('contentos_style_templates', JSON.stringify(updated))
        showToast('✅ 风格模板已保存'); setStyleUrl(''); setStyleName('')
      }
    } catch { showToast('分析失败') } finally { setStyleLoading(false) }
  }

  function saveCopy(content: string, style: string) {
    const item: SavedContent = { id: Date.now().toString(), topic: selectedTopic, style, content, createdAt: new Date().toISOString() }
    const updated = [item, ...savedContents]; setSavedContents(updated)
    localStorage.setItem('contentos_saved', JSON.stringify(updated)); showToast('✅ 已保存到素材库')
  }

  async function copyText(text: string, idx: number) {
    await navigator.clipboard.writeText(text); setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000); showToast('✅ 已复制')
  }

  async function generateTTS() {
    if (!videoCopy.trim()) { showToast('请先输入文案'); return }
    setVideoLoading(true); setVideoError(''); setVideoAudioB64('')
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: videoCopy, voiceId: videoVoiceId, speed: videoSpeed }) })
      const data = await res.json()
      if (data.audio) { setVideoAudioB64(data.audio); showToast('✅ 语音合成成功'); setVideoStep('avatar') }
      else setVideoError(data.configured === false ? '⚙️ MiniMax API 未配置，请在 Vercel 添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID' : (data.error || '合成失败'))
    } catch (e: any) { setVideoError(e.message) } finally { setVideoLoading(false) }
  }

  if (!user) {
    return (
      <div className="w-[390px] h-[844px] rounded-[50px] overflow-hidden bg-white flex flex-col shadow-[0_0_0_10px_#111,0_40px_100px_rgba(0,0,0,.7)] relative">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg">
            <span className="text-3xl">🎬</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">ContentOS</h1>
          <p className="text-sm text-gray-400 mb-8">AI 内容增长工作台</p>
          <div className="w-full space-y-3">
            <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" placeholder="邮箱" className="w-full px-4 py-3 rounded-2xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
            <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} type="password" placeholder="密码" className="w-full px-4 py-3 rounded-2xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all" onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())} />
            {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}
            <button onClick={authMode === 'login' ? handleLogin : handleRegister} disabled={authLoading} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all">
              {authLoading ? '处理中...' : authMode === 'login' ? '登录' : '注册'}
            </button>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full py-2 text-sm text-gray-400">
              {authMode === 'login' ? '没有账号？注册' : '已有账号？登录'}
            </button>
            <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-300">或</span><div className="flex-1 h-px bg-gray-100" /></div>
            <button onClick={() => setUser({ id: 'guest', email: 'guest' })} className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-2xl text-sm active:scale-[0.98] transition-all">
              跳过登录，先体验
            </button>
          </div>
        </div>
      </div>
    )
  }

  const NAV_TABS = [
    { id: 'dashboard', icon: '🏠', label: '工作台' },
    { id: 'materials', icon: '📦', label: '素材中心' },
    { id: 'content', icon: '✍️', label: '内容中心' },
    { id: 'video', icon: '🎬', label: '视频生成' },
    { id: 'operations', icon: '📊', label: '运营中心' },
  ]

  return (
    <div className="w-[390px] h-[844px] rounded-[50px] overflow-hidden bg-[#F2F2F7] flex flex-col shadow-[0_0_0_10px_#111,0_40px_100px_rgba(0,0,0,.7)] relative">
      <Toast msg={toast} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'dashboard' && <Dashboard acc={acc} accounts={accounts} accountIdx={accountIdx} setAccountIdx={setAccountIdx} setTab={setTab} showToast={showToast} user={user} onLogout={handleLogout} savedContents={savedContents} schedule={schedule} />}
        {tab === 'materials' && <Materials acc={acc} matTab={matTab} setMatTab={setMatTab} hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading} generateTopics={generateTopics} useTopic={(t: string) => { setSelectedTopic(t); setTab('content'); setContentStep(2) }} savedContents={savedContents} creatorUrl={creatorUrl} setCreatorUrl={setCreatorUrl} creatorLoading={creatorLoading} creatorData={creatorData} setCreatorData={setCreatorData} trackedCreators={trackedCreators} scrapeCreator={scrapeCreator} showToast={showToast} radarData={radarData} radarLoading={radarLoading} fetchRadar={fetchRadar} styleTemplates={styleTemplates} styleLoading={styleLoading} styleUrl={styleUrl} setStyleUrl={setStyleUrl} styleName={styleName} setStyleName={setStyleName} analyzeStyle={analyzeStyle} applyTemplate={(t: any) => showToast(`✅ 已应用「${t.name}」风格`)} deleteTemplate={(id: string) => { const u = styleTemplates.filter((t: any) => t.id !== id); setStyleTemplates(u); localStorage.setItem('contentos_style_templates', JSON.stringify(u)) }} />}
        {tab === 'content' && <ContentCenter acc={acc} step={contentStep} setStep={setContentStep} topic={selectedTopic} setTopic={setSelectedTopic} style={copyStyle} setStyle={setCopyStyle} userInput={userInput} setUserInput={setUserInput} versions={copyVersions} loading={copyLoading} error={copyError} copiedIdx={copiedIdx} generate={generateCopy} copy={copyText} save={saveCopy} showToast={showToast} setTab={setTab} hotspots={HOTSPOTS} savedContents={savedContents} />}
        {tab === 'video' && <VideoStudio acc={acc} step={videoStep} setStep={setVideoStep} copy={videoCopy} setCopy={setVideoCopy} voiceId={videoVoiceId} setVoiceId={setVideoVoiceId} speed={videoSpeed} setSpeed={setVideoSpeed} avatarType={videoAvatarType} setAvatarType={setVideoAvatarType} avatarPreset={videoAvatarPreset} setAvatarPreset={setVideoAvatarPreset} bgType={videoBgType} setBgType={setVideoBgType} bgColor={videoBgColor} setBgColor={setVideoBgColor} loading={videoLoading} audioB64={videoAudioB64} error={videoError} generateTTS={generateTTS} showToast={showToast} savedContents={savedContents} setTab={setTab} />}
        {tab === 'operations' && <Operations acc={acc} opsTab={opsTab} setOpsTab={setOpsTab} schedule={schedule} setSchedule={setSchedule} savedContents={savedContents} showToast={showToast} />}
      </div>
      <div className="h-[90px] bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-start pt-2 pb-5 flex-shrink-0 z-50">
        {NAV_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)} className="flex-1 flex flex-col items-center gap-0.5 py-1">
            <span className={`text-[22px] transition-transform duration-200 ${tab === t.id ? 'scale-110' : 'scale-100'}`}>{t.icon}</span>
            <span className={`text-[10px] font-medium transition-colors ${tab === t.id ? 'text-blue-500 font-bold' : 'text-gray-400'}`}>{t.label}</span>
            {tab === t.id && <div className="w-4 h-0.5 rounded-full bg-blue-500 mt-0.5" />}
          </button>
        ))}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function Dashboard({ acc, accounts, accountIdx, setAccountIdx, setTab, showToast, user, onLogout, savedContents, schedule }: any) {
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium">AI 内容增长工作台</p>
            <h1 className="text-xl font-black text-gray-900">ContentOS</h1>
          </div>
          <button onClick={onLogout} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-base">
            {user?.id === 'guest' ? '👤' : '👋'}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {accounts.map((a: any, i: number) => (
            <button key={a.id} onClick={() => setAccountIdx(i)} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${i === accountIdx ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'}`}>
              <span>{a.emoji}</span><span>{a.name}</span>
            </button>
          ))}
          <button onClick={() => showToast('多账号管理')} className="flex-shrink-0 w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 text-lg">+</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">
        <div className={`bg-gradient-to-br ${acc.color} rounded-3xl p-5 text-white shadow-lg`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-3xl mb-1">{acc.emoji}</div>
              <div className="font-black text-lg">{acc.name}</div>
              <div className="text-white/70 text-xs mt-0.5">{acc.positioning}</div>
            </div>
            <div className="bg-white/20 rounded-2xl px-3 py-1.5"><span className="text-xs font-bold">{acc.industry}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['粉丝', '1.2万'], ['获赞', '8.6万'], ['作品', '47']].map(([l, v]) => (
              <div key={l} className="bg-white/15 rounded-2xl p-2 text-center">
                <div className="font-black text-base">{v}</div>
                <div className="text-white/60 text-[10px]">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '✍️', label: '生成文案', sub: '一键AI创作', tab: 'content', color: 'from-blue-500 to-cyan-400' },
            { icon: '🎬', label: '生成视频', sub: '文案转视频', tab: 'video', color: 'from-purple-500 to-pink-400' },
            { icon: '📡', label: '内容情报', sub: '今日热点', tab: 'materials', color: 'from-orange-400 to-amber-400' },
            { icon: '🎯', label: '博主追踪', sub: '竞品分析', tab: 'materials', color: 'from-green-400 to-emerald-500' },
          ].map(item => (
            <button key={item.label} onClick={() => setTab(item.tab)} className="bg-white rounded-3xl p-4 shadow-sm text-left active:scale-[0.97] transition-transform">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl mb-2 shadow-sm`}>{item.icon}</div>
              <div className="font-bold text-gray-900 text-sm">{item.label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{item.sub}</div>
            </button>
          ))}
        </div>
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">📅 今日计划</h3>
            <button onClick={() => setTab('operations')} className="text-xs text-blue-500 font-medium">查看全部</button>
          </div>
          {schedule.slice(0, 2).map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-400' : s.status === '已发布' ? 'bg-green-400' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{s.title}</div>
                <div className="text-xs text-gray-400">{s.time} · {s.platform}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
            </div>
          ))}
        </div>
        {savedContents.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">💾 已保存文案</h3>
              <span className="text-xs text-gray-400">{savedContents.length} 条</span>
            </div>
            {savedContents.slice(0, 2).map((c: any) => (
              <div key={c.id} className="py-2 border-b border-gray-50 last:border-0">
                <div className="text-sm font-medium text-gray-800 truncate">{c.topic}</div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════
function Materials({ acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, useTopic, savedContents, creatorUrl, setCreatorUrl, creatorLoading, creatorData, setCreatorData, trackedCreators, scrapeCreator, showToast, radarData, radarLoading, fetchRadar, styleTemplates, styleLoading, styleUrl, setStyleUrl, styleName, setStyleName, analyzeStyle, applyTemplate, deleteTemplate }: any) {
  const TABS = [{ id: 'hotspot', label: '热点' }, { id: 'topics', label: '选题库' }, { id: 'radar', label: '情报雷达' }, { id: 'creator', label: '博主追踪' }, { id: 'style', label: '风格模板' }]
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-4 pb-0 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">素材中心</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setMatTab(t.id)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${matTab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">
        {matTab === 'hotspot' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">今日热点 · 点击使用</p>
            {hotspots.map((h: any, i: number) => (
              <div key={i} onClick={() => useTopic(h.title)} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-black text-sm flex-shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{h.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{h.tag}</div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-xs font-bold text-red-400">{h.heat}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {matTab === 'topics' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">AI 为你生成的选题</p>
              <button onClick={generateTopics} disabled={topicsLoading} className="text-xs text-blue-500 font-semibold disabled:opacity-50">{topicsLoading ? '生成中...' : '🔄 重新生成'}</button>
            </div>
            {aiTopics.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">💡</div>
                <div className="font-bold text-gray-800 mb-1">AI 选题生成</div>
                <div className="text-xs text-gray-400 mb-4">基于你的账号定位，生成高完播率选题</div>
                <button onClick={generateTopics} disabled={topicsLoading} className="px-6 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-2xl disabled:opacity-60">{topicsLoading ? '生成中...' : '✨ 生成选题'}</button>
              </div>
            ) : (
              <div className="space-y-2">
                {aiTopics.map((t: any, i: number) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-gray-900 text-sm flex-1">{t.title}</div>
                      <button onClick={() => useTopic(t.title)} className="flex-shrink-0 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-xl">使用</button>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">💡 {t.reason}</div>
                    <div className="text-xs text-orange-500">🎣 {t.hook}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {t.tags?.map((tag: string) => <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{tag}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {matTab === 'radar' && (
          <div>
            {!radarData ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">📡</div>
                <div className="font-bold text-gray-800 mb-1">内容情报雷达</div>
                <div className="text-xs text-gray-400 mb-4">每日热点 · 爆款形式 · 关键词热度</div>
                <button onClick={fetchRadar} disabled={radarLoading} className="px-6 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-2xl disabled:opacity-60">{radarLoading ? '获取中...' : '📡 获取今日情报'}</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">🔥 今日热点</h3>
                  {radarData.hotspots?.slice(0, 5).map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                      <span className="text-sm text-gray-800 flex-1">{h.title || h}</span>
                    </div>
                  ))}
                </div>
                {radarData.formats && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">🎬 爆款形式</h3>
                    {radarData.formats?.slice(0, 4).map((f: any, i: number) => (
                      <div key={i} className="text-sm text-gray-700 py-1.5 border-b border-gray-50 last:border-0">{f.format || f}</div>
                    ))}
                  </div>
                )}
                <button onClick={fetchRadar} disabled={radarLoading} className="w-full py-2.5 bg-white rounded-2xl text-sm text-blue-500 font-semibold shadow-sm disabled:opacity-50">{radarLoading ? '刷新中...' : '🔄 刷新情报'}</button>
              </div>
            )}
          </div>
        )}
        {matTab === 'creator' && (
          <div>
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <div className="font-bold text-gray-900 text-sm mb-3">🔍 抓取博主内容</div>
              <input value={creatorUrl} onChange={e => setCreatorUrl(e.target.value)} placeholder="粘贴抖音/小红书博主主页链接..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2" />
              <button onClick={scrapeCreator} disabled={creatorLoading} className="w-full py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-60">{creatorLoading ? '抓取中...' : '🚀 开始抓取'}</button>
            </div>
            {creatorData && (
              <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
                <div className="font-bold text-gray-900 text-sm mb-2">📊 {creatorData.creator?.name || '博主'} 的内容分析</div>
                <div className="text-xs text-gray-500 mb-3 leading-relaxed">{creatorData.summary}</div>
                <div className="space-y-2">
                  {creatorData.videos?.slice(0, 5).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{v.title}</div>
                        <div className="text-[10px] text-gray-400">👍 {v.likes} · 💬 {v.comments}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {trackedCreators.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-2">📌 已追踪博主</div>
                {trackedCreators.map((c: any, i: number) => (
                  <div key={i} onClick={() => setCreatorData({ creator: c, videos: c.videos, summary: c.summary })} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">{c.name?.[0] || '?'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{c.name || '博主'}</div>
                      <div className="text-xs text-gray-400">{c.videos?.length || 0} 条视频</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {matTab === 'style' && (
          <div>
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <div className="font-bold text-gray-900 text-sm mb-3">🔮 分析博主风格</div>
              <input value={styleUrl} onChange={e => setStyleUrl(e.target.value)} placeholder="博主主页链接（可选）" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2" />
              <input value={styleName} onChange={e => setStyleName(e.target.value)} placeholder="模板名称（如：犀利观点派）" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2" />
              <button onClick={analyzeStyle} disabled={styleLoading} className="w-full py-2.5 bg-purple-500 text-white text-sm font-bold rounded-xl disabled:opacity-60">{styleLoading ? '分析中...' : '✨ 分析并保存风格'}</button>
            </div>
            {styleTemplates.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-2">🎨</div>
                <div className="text-sm text-gray-400">还没有风格模板，分析博主风格后自动保存</div>
              </div>
            ) : (
              <div className="space-y-2">
                {styleTemplates.map((t: any) => (
                  <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="flex gap-2">
                        <button onClick={() => applyTemplate(t)} className="text-xs text-blue-500 font-semibold">应用</button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400">删除</button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">{t.description || t.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// CONTENT CENTER
// ═══════════════════════════════════════════════════════════
function ContentCenter({ acc, step, setStep, topic, setTopic, style, setStyle, userInput, setUserInput, versions, loading, error, copiedIdx, generate, copy, save, showToast, setTab, hotspots, savedContents }: any) {
  const STYLES = ['犀利观点', '温情故事', '干货教程', '幽默搞笑', '励志正能量', '悬念钩子']
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-1">内容中心</h1>
        <div className="flex gap-1">
          {['选题', '配置', '文案'].map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-green-400 text-white' : step === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-blue-500' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`w-6 h-px ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">✏️ 自定义选题</div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="输入你的选题..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
              <button onClick={() => setStep(2)} disabled={!topic.trim()} className="w-full mt-2 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                使用此选题 →
              </button>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔥 热点选题</div>
              {hotspots.map((h: any, i: number) => (
                <div key={i} onClick={() => { setTopic(h.title); setStep(2) }} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-xl px-1 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-black text-xs flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{h.title}</div>
                    <div className="text-xs text-gray-400">{h.tag}</div>
                  </div>
                  <span className="text-xs text-blue-500 font-semibold">选用</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-1">📌 当前选题</div>
              <div className="text-sm text-blue-600 font-medium bg-blue-50 rounded-xl px-3 py-2">{topic}</div>
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 mt-1.5">← 重新选题</button>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎨 文案风格</div>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)} className={`py-2 rounded-xl text-xs font-semibold transition-all ${style === s ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">💬 补充说明（可选）</div>
              <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="有什么特别要求？比如：突出价格优惠、强调食材新鲜..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
            </div>
            {error && <div className="bg-red-50 rounded-2xl p-3 text-xs text-red-500">{error}</div>}
            <button onClick={generate} disabled={loading} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md">
              {loading ? '✨ AI 生成中...' : '✨ 生成文案'}
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">✅ 生成完成</div>
              <button onClick={() => setStep(2)} className="text-xs text-blue-500 font-semibold">重新生成</button>
            </div>
            {versions.map((v: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">版本 {i + 1} · {v.style}</span>
                  <div className="flex gap-2">
                    <button onClick={() => copy(v.content, i)} className={`text-xs font-semibold ${copiedIdx === i ? 'text-green-500' : 'text-gray-400'}`}>
                      {copiedIdx === i ? '✅ 已复制' : '复制'}
                    </button>
                    <button onClick={() => save(v.content, v.style)} className="text-xs text-blue-500 font-semibold">保存</button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{v.content}</p>
                <button onClick={() => { setTab('video') }} className="w-full mt-3 py-2 bg-purple-50 text-purple-600 text-xs font-bold rounded-xl">
                  🎬 用此文案生成视频
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIDEO STUDIO
// ═══════════════════════════════════════════════════════════
function VideoStudio({ acc, step, setStep, copy: videoCopy, setCopy: setVideoCopy, voiceId, setVoiceId, speed, setSpeed, avatarType, setAvatarType, avatarPreset, setAvatarPreset, bgType, setBgType, bgColor, setBgColor, loading, audioB64, error, generateTTS, showToast, savedContents, setTab }: any) {
  const VOICES = [
    { id: 'female-shaonv', label: '少女音', emoji: '👧' },
    { id: 'female-yujie', label: '御姐音', emoji: '👩' },
    { id: 'male-qingxin', label: '清新男声', emoji: '👦' },
    { id: 'male-chunhou', label: '醇厚男声', emoji: '🧔' },
    { id: 'audiobook-male-1', label: '播音腔', emoji: '🎙️' },
  ]
  const AVATARS = [
    { id: 'business-female', label: '职场女性', emoji: '👩‍💼' },
    { id: 'business-male', label: '职场男性', emoji: '👨‍💼' },
    { id: 'casual-female', label: '休闲女生', emoji: '👩' },
    { id: 'casual-male', label: '休闲男生', emoji: '👨' },
  ]
  const STEPS = ['文案', '声音', '形象', '生成']
  const stepIdx = ['input', 'voice', 'avatar', 'preview'].indexOf(step)

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-1">视频生成</h1>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepIdx > i ? 'bg-green-400 text-white' : stepIdx === i ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {stepIdx > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${stepIdx === i ? 'text-purple-500' : 'text-gray-400'}`}>{s}</span>
              {i < 3 && <div className={`w-4 h-px ${stepIdx > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">
        {step === 'input' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">📝 口播文案</div>
              <textarea value={videoCopy} onChange={e => setVideoCopy(e.target.value)} placeholder="输入视频口播文案，或从内容中心导入..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-32" />
              <div className="text-xs text-gray-400 mt-1">{videoCopy.length} 字 · 预计 {Math.ceil(videoCopy.length / 4)} 秒</div>
            </div>
            {savedContents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-2">💾 从已保存文案导入</div>
                {savedContents.slice(0, 3).map((c: any) => (
                  <div key={c.id} onClick={() => setVideoCopy(c.content)} className="py-2 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-lg px-1">
                    <div className="text-xs font-medium text-gray-700 truncate">{c.topic}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStep('voice')} disabled={!videoCopy.trim()} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md">
              下一步：选择声音 →
            </button>
          </>
        )}
        {step === 'voice' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎙️ 选择声音</div>
              <div className="space-y-2">
                {VOICES.map(v => (
                  <button key={v.id} onClick={() => setVoiceId(v.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${voiceId === v.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}>
                    <span className="text-xl">{v.emoji}</span>
                    <span className={`text-sm font-semibold ${voiceId === v.id ? 'text-purple-600' : 'text-gray-700'}`}>{v.label}</span>
                    {voiceId === v.id && <span className="ml-auto text-purple-500 text-xs font-bold">✓ 已选</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-900 text-sm">⚡ 语速</div>
                <span className="text-sm font-bold text-purple-500">{speed}x</span>
              </div>
              <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full accent-purple-500" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>慢 0.5x</span><span>正常 1.0x</span><span>快 2.0x</span></div>
            </div>
            {error && <div className="bg-red-50 rounded-2xl p-3 text-xs text-red-500">{error}</div>}
            <button onClick={generateTTS} disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md">
              {loading ? '🎙️ 合成中...' : '🎙️ 合成语音 →'}
            </button>
            <button onClick={() => setStep('input')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}
        {step === 'avatar' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎭 选择形象</div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setAvatarType('preset')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${avatarType === 'preset' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>预设形象</button>
                <button onClick={() => setAvatarType('upload')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${avatarType === 'upload' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>上传照片</button>
              </div>
              {avatarType === 'preset' ? (
                <div className="grid grid-cols-2 gap-2">
                  {AVATARS.map(a => (
                    <button key={a.id} onClick={() => setAvatarPreset(a.id)} className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${avatarPreset === a.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}>
                      <span className="text-3xl">{a.emoji}</span>
                      <span className={`text-xs font-semibold ${avatarPreset === a.id ? 'text-purple-600' : 'text-gray-600'}`}>{a.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <div className="text-3xl mb-2">📸</div>
                  <div className="text-sm text-gray-500 font-medium">上传你的照片</div>
                  <div className="text-xs text-gray-400 mt-1">AI 将生成你的数字形象</div>
                  <button onClick={() => showToast('上传功能开发中')} className="mt-3 px-4 py-2 bg-purple-100 text-purple-600 text-xs font-bold rounded-xl">选择照片</button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🖼️ 背景设置</div>
              <div className="flex gap-2 mb-3">
                {[['color', '纯色'], ['blur', '模糊'], ['image', '图片']].map(([t, l]) => (
                  <button key={t} onClick={() => setBgType(t)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${bgType === t ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{l}</button>
                ))}
              </div>
              {bgType === 'color' && (
                <div className="flex items-center gap-3">
                  <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-10 h-10 rounded-xl border-0 cursor-pointer" />
                  <span className="text-sm text-gray-600 font-mono">{bgColor}</span>
                  <div className="flex gap-2 ml-auto">
                    {['#1a1a2e', '#0f3460', '#16213e', '#ffffff', '#f8f9fa'].map(c => (
                      <button key={c} onClick={() => setBgColor(c)} className="w-7 h-7 rounded-lg border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
              {bgType === 'blur' && <div className="text-xs text-gray-400 py-2">将使用模糊背景效果（需上传背景图）</div>}
              {bgType === 'image' && <div className="text-xs text-gray-400 py-2">图片背景功能开发中</div>}
            </div>
            <button onClick={() => setStep('preview')} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md">
              下一步：生成预览 →
            </button>
            <button onClick={() => setStep('voice')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}
        {step === 'preview' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎬 视频预览</div>
              <div className="rounded-2xl overflow-hidden aspect-[9/16] bg-gray-900 flex flex-col items-center justify-center relative" style={{ backgroundColor: bgColor }}>
                <div className="text-6xl mb-4">{AVATARS.find(a => a.id === avatarPreset)?.emoji || '👤'}</div>
                <div className="text-white/80 text-xs text-center px-4 leading-relaxed">{videoCopy.slice(0, 60)}...</div>
                {audioB64 && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/20 rounded-xl p-2 flex items-center gap-2">
                      <span className="text-white text-xs">🎙️ 语音已合成</span>
                      <div className="flex-1 h-1 bg-white/30 rounded-full"><div className="h-full w-1/3 bg-white rounded-full" /></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between"><span>声音</span><span className="font-medium text-gray-700">{VOICES.find(v => v.id === voiceId)?.label}</span></div>
                <div className="flex justify-between"><span>语速</span><span className="font-medium text-gray-700">{speed}x</span></div>
                <div className="flex justify-between"><span>形象</span><span className="font-medium text-gray-700">{avatarType === 'preset' ? AVATARS.find(a => a.id === avatarPreset)?.label : '自定义'}</span></div>
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-amber-700 text-sm mb-1">🚧 视频合成开发中</div>
              <div className="text-xs text-amber-600 leading-relaxed">完整视频合成（LatentSync 对口型 + FFmpeg 合成）正在开发中。当前已完成语音合成，视频合成功能即将上线。</div>
            </div>
            <button onClick={() => showToast('🚀 视频合成任务已提交')} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md opacity-60">
              🎬 生成视频（开发中）
            </button>
            <button onClick={() => setStep('input')} className="w-full py-2 text-sm text-gray-400">← 重新开始</button>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// OPERATIONS
// ═══════════════════════════════════════════════════════════
function Operations({ acc, opsTab, setOpsTab, schedule, setSchedule, savedContents, showToast }: any) {
  const TABS = [{ id: 'schedule', label: '排期' }, { id: 'stats', label: '数据' }, { id: 'goals', label: '目标' }]
  const STATS = [
    { label: '本周发布', value: '3', unit: '条', trend: '+1', up: true },
    { label: '总播放量', value: '2.4万', unit: '', trend: '+18%', up: true },
    { label: '平均完播率', value: '68%', unit: '', trend: '+5%', up: true },
    { label: '新增粉丝', value: '234', unit: '', trend: '-12', up: false },
  ]
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-4 pb-0 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">运营中心</h1>
        <div className="flex gap-2 pb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setOpsTab(t.id)} className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all ${opsTab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">
        {opsTab === 'schedule' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">📅 发布排期</div>
                <button onClick={() => showToast('添加排期')} className="w-7 h-7 rounded-full bg-blue-500 text-white text-lg flex items-center justify-center leading-none">+</button>
              </div>
              {schedule.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-400' : s.status === '已发布' ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{s.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.time} · {s.platform}</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">💡 AI 运营建议</div>
              {[
                '📈 本周发布频率偏低，建议增加到每周5条',
                '⏰ 晚上7-9点是你的粉丝最活跃时段',
                '🎯 干货教程类内容完播率最高，建议多做',
              ].map((tip, i) => (
                <div key={i} className="text-xs text-gray-600 py-2 border-b border-gray-50 last:border-0 leading-relaxed">{tip}</div>
              ))}
            </div>
          </>
        )}
        {opsTab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                  <div className="text-2xl font-black text-gray-900">{s.value}<span className="text-sm font-medium text-gray-400 ml-0.5">{s.unit}</span></div>
                  <div className={`text-xs font-semibold mt-1 ${s.up ? 'text-green-500' : 'text-red-400'}`}>{s.up ? '↑' : '↓'} {s.trend}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📊 近7天发布</div>
              <div className="flex items-end gap-1.5 h-20">
                {[2, 0, 1, 3, 1, 0, 2].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg bg-blue-400 transition-all" style={{ height: `${v * 20}px`, minHeight: v > 0 ? '8px' : '0' }} />
                    <span className="text-[9px] text-gray-400">{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🏆 最佳内容</div>
              {savedContents.slice(0, 3).map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white text-xs font-black">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{c.topic}</div>
                    <div className="text-[10px] text-gray-400">{c.style}</div>
                  </div>
                </div>
              ))}
              {savedContents.length === 0 && <div className="text-xs text-gray-400 text-center py-4">暂无数据，先去生成文案吧</div>}
            </div>
          </>
        )}
        {opsTab === 'goals' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎯 本月目标</div>
              {[
                { label: '粉丝增长', current: 234, target: 500, unit: '人' },
                { label: '视频发布', current: 8, target: 20, unit: '条' },
                { label: '总播放量', current: 24000, target: 50000, unit: '' },
              ].map((g, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{g.label}</span>
                    <span className="text-gray-400">{g.current.toLocaleString()}{g.unit} / {g.target.toLocaleString()}{g.unit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all" style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{Math.round((g.current / g.target) * 100)}% 完成</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📋 阶段计划</div>
              {[
                { phase: '第一阶段', desc: '建立账号基础，每周发布3-5条内容', status: '进行中', color: 'bg-blue-400' },
                { phase: '第二阶段', desc: '打造爆款内容，粉丝突破1万', status: '未开始', color: 'bg-gray-300' },
                { phase: '第三阶段', desc: '商业变现，开通橱窗/接广告', status: '未开始', color: 'bg-gray-300' },
              ].map((p, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">{p.phase}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === '进行中' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
