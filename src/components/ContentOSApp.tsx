'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ───────────────────────────────────────────────
type Tab = 'dashboard' | 'materials' | 'content' | 'video' | 'operations' | 'profile'
type MatTab = 'hotspot' | 'topics' | 'radar' | 'creator' | 'style'
type OpsTab = 'schedule' | 'stats' | 'goals'
type VideoStep = 'input' | 'voice' | 'avatar' | 'preview'
type ContentStep = 1 | 2 | 3

interface Account {
  id: string; name: string; emoji: string; industry: string
  positioning: string; targetAudience: string; color: string
  followers?: string; likes?: string; works?: string
}
interface SavedContent {
  id: string; topic: string; style: string; content: string
  hook?: string; createdAt: string; accountId?: string
}
interface Topic {
  title: string; category: string; reason: string; hook: string; tags: string[]
}
interface ScheduleItem {
  id: string; time: string; title: string; status: '待发布' | '已发布' | '草稿' | '计划中'; platform: string
}

// ─── Constants ───────────────────────────────────────────
const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: '老李面馆', emoji: '🍜', industry: '餐饮', positioning: '本地餐饮·老板IP流', targetAudience: '周边3km上班族', color: 'from-orange-400 to-amber-500', followers: '1.2万', likes: '8.6万', works: '47' },
  { id: '2', name: '健身工作室', emoji: '💪', industry: '健身', positioning: '专业健身教练', targetAudience: '18-35岁健身爱好者', color: 'from-blue-500 to-cyan-400', followers: '3.4万', likes: '21万', works: '89' },
]

const HOTSPOTS = [
  { title: '端午节限定套餐', heat: 98, tag: '节日热点' },
  { title: '夏日消暑特饮', heat: 92, tag: '季节热点' },
  { title: '老板的一天', heat: 87, tag: '老板IP' },
  { title: '顾客感动故事', heat: 85, tag: '情感共鸣' },
  { title: '开店3年踩过的坑', heat: 94, tag: '干货分享' },
]

const COPY_STYLES = ['犀利观点', '温情故事', '干货教程', '幽默搞笑', '励志正能量', '悬念钩子']

// ─── Toast ───────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap animate-fade-in">
      {msg}
    </div>
  )
}

// ─── Loading Spinner ──────────────────────────────────────
function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <div className={`${s} border-2 border-current border-t-transparent rounded-full animate-spin inline-block`} />
  )
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ icon, title, desc, action, onAction }: { icon: string; title: string; desc: string; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="font-bold text-gray-800 mb-1 text-sm">{title}</div>
      <div className="text-xs text-gray-400 mb-4 leading-relaxed">{desc}</div>
      {action && onAction && (
        <button onClick={onAction} className="px-5 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-2xl active:scale-[0.97] transition-transform">
          {action}
        </button>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────
export default function ContentOSApp() {
  // Auth
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Navigation
  const [tab, setTab] = useState<Tab>('dashboard')
  const [toast, setToast] = useState('')

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS)
  const [accountIdx, setAccountIdx] = useState(0)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [newAccName, setNewAccName] = useState('')
  const [newAccIndustry, setNewAccIndustry] = useState('')
  const [newAccEmoji, setNewAccEmoji] = useState('🏪')

  // Content Center
  const [contentStep, setContentStep] = useState<ContentStep>(1)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [copyStyle, setCopyStyle] = useState('犀利观点')
  const [userInput, setUserInput] = useState('')
  const [copyVersions, setCopyVersions] = useState<any[]>([])
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [savedContents, setSavedContents] = useState<SavedContent[]>([])
  const [expandedCopy, setExpandedCopy] = useState<number | null>(null)

  // Materials
  const [matTab, setMatTab] = useState<MatTab>('hotspot')
  const [aiTopics, setAiTopics] = useState<Topic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [savedTopics, setSavedTopics] = useState<string[]>([])
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
  const [styleText, setStyleText] = useState('')

  // Operations
  const [opsTab, setOpsTab] = useState<OpsTab>('schedule')
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { id: '1', time: '今天 18:30', title: '端午节限定套餐来了！', status: '待发布', platform: '抖音' },
    { id: '2', time: '明天 12:00', title: '开面馆3年踩过的坑', status: '草稿', platform: '抖音' },
    { id: '3', time: '后天 19:00', title: '顾客感动故事', status: '计划中', platform: '小红书' },
  ])
  const [insights, setInsights] = useState<any[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [newScheduleTitle, setNewScheduleTitle] = useState('')
  const [newSchedulePlatform, setNewSchedulePlatform] = useState('抖音')

  // Video Studio
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

  // Profile / AI Settings
  const [aiModel, setAiModel] = useState('deepseek-chat')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiApiBase, setAiApiBase] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [aiTemperature, setAiTemperature] = useState(0.85)
  const [credits, setCredits] = useState(1000)
  const [profileTab, setProfileTab] = useState<'ai' | 'accounts' | 'credits' | 'about'>('ai')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<any>(null)

  // Positioning Wizard
  const [showPositioning, setShowPositioning] = useState(false)
  const [posStep, setPosStep] = useState(1)
  const [posIndustry, setPosIndustry] = useState('')
  const [posProduct, setPosProduct] = useState('')
  const [posCustomer, setPosCustomer] = useState('')
  const [posCity, setPosCity] = useState('')
  const [posAdvantage, setPosAdvantage] = useState('')
  const [posLoading, setPosLoading] = useState(false)
  const [posResult, setPosResult] = useState<any>(null)

  const acc = accounts[accountIdx] || accounts[0]

  // ─── Effects ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    try {
      const s = localStorage.getItem('contentos_saved'); if (s) setSavedContents(JSON.parse(s))
      const t = localStorage.getItem('contentos_style_templates'); if (t) setStyleTemplates(JSON.parse(t))
      const c = localStorage.getItem('contentos_creators'); if (c) setTrackedCreators(JSON.parse(c))
      const st = localStorage.getItem('contentos_saved_topics'); if (st) setSavedTopics(JSON.parse(st))
      const ac = localStorage.getItem('contentos_accounts'); if (ac) setAccounts(JSON.parse(ac))
      const ai = localStorage.getItem('contentos_ai_settings')
      if (ai) {
        const s = JSON.parse(ai)
        if (s.model) setAiModel(s.model)
        if (s.apiKey) setAiApiKey(s.apiKey)
        if (s.apiBase) setAiApiBase(s.apiBase)
        if (s.systemPrompt) setAiSystemPrompt(s.systemPrompt)
        if (s.temperature) setAiTemperature(s.temperature)
      }
      const cr = localStorage.getItem('contentos_credits'); if (cr) setCredits(parseInt(cr) || 1000)
    } catch {}
  }, [])

  // ─── Helpers ─────────────────────────────────────────────
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function saveToLocal(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }

  // ─── Auth ─────────────────────────────────────────────────
  async function handleLogin() {
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message)
    setAuthLoading(false)
  }

  async function handleRegister() {
    if (authPassword.length < 6) { setAuthError('密码至少6位'); return }
    setAuthLoading(true); setAuthError('')
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword })
    if (error) setAuthError(error.message)
    else showToast('✅ 注册成功，请查收验证邮件')
    setAuthLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null)
    showToast('已退出登录')
  }

  // ─── Content Generation ───────────────────────────────────
  async function generateCopy() {
    if (!selectedTopic.trim()) { showToast('请先选择选题'); return }
    setCopyLoading(true); setCopyError(''); setCopyVersions([])
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: selectedTopic, style: copyStyle, userInput,
          accountName: acc.name, industry: acc.industry,
          positioning: acc.positioning, targetAudience: acc.targetAudience
        })
      })
      const data = await res.json()
      if (data.versions) {
        setCopyVersions(data.versions)
        setContentStep(3)
        showToast('✅ 文案生成成功')
      } else {
        setCopyError(data.error || '生成失败，请重试')
      }
    } catch (e: any) {
      setCopyError('网络错误：' + e.message)
    } finally {
      setCopyLoading(false)
    }
  }

  async function generateTopics() {
    setTopicsLoading(true)
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positioning: acc.positioning, industry: acc.industry, accountName: acc.name, count: 8 })
      })
      const data = await res.json()
      if (data.topics) setAiTopics(data.topics)
      else showToast('生成失败，请重试')
    } catch {
      showToast('网络错误，请重试')
    } finally {
      setTopicsLoading(false)
    }
  }

  async function fetchRadar() {
    setRadarLoading(true)
    try {
      const res = await fetch('/api/daily-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: acc.industry })
      })
      const data = await res.json()
      if (data.hotspots) setRadarData(data)
      else showToast('获取失败，请重试')
    } catch {
      showToast('网络错误')
    } finally {
      setRadarLoading(false)
    }
  }

  async function scrapeCreator() {
    if (!creatorUrl.trim()) { showToast('请输入博主链接'); return }
    setCreatorLoading(true)
    try {
      const res = await fetch('/api/scrape-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: creatorUrl, count: 20, sort: 'likes' })
      })
      const data = await res.json()
      if (data.creator) {
        setCreatorData(data)
        const updated = [
          { ...data.creator, videos: data.videos, summary: data.summary, url: creatorUrl, addedAt: new Date().toISOString() },
          ...trackedCreators.filter((c: any) => c.url !== creatorUrl)
        ]
        setTrackedCreators(updated)
        saveToLocal('contentos_creators', updated)
        showToast(`✅ 已抓取 ${data.videos?.length || 0} 条视频`)
      } else {
        showToast(data.error || '抓取失败')
      }
    } catch (e: any) {
      showToast('抓取失败: ' + e.message)
    } finally {
      setCreatorLoading(false)
    }
  }

  async function analyzeStyle() {
    if (!styleUrl.trim() && !styleName.trim() && !styleText.trim()) {
      showToast('请输入博主链接、名称或粘贴文案样本')
      return
    }
    setStyleLoading(true)
    try {
      const res = await fetch('/api/analyze-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: styleUrl, name: styleName, sampleText: styleText, industry: acc.industry })
      })
      const data = await res.json()
      if (data.template) {
        const updated = [data.template, ...styleTemplates]
        setStyleTemplates(updated)
        saveToLocal('contentos_style_templates', updated)
        showToast('✅ 风格模板已保存')
        setStyleUrl(''); setStyleName(''); setStyleText('')
      } else {
        showToast(data.error || '分析失败')
      }
    } catch {
      showToast('分析失败，请重试')
    } finally {
      setStyleLoading(false)
    }
  }

  async function fetchInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ views: '12.3万', likes: '2341', comments: '186', collects: '892', industry: acc.industry, accountName: acc.name })
      })
      const data = await res.json()
      if (data.insights) setInsights(data.insights)
    } catch {} finally {
      setInsightsLoading(false)
    }
  }

  async function generatePositioning() {
    if (!posIndustry || !posProduct || !posCustomer) {
      showToast('请填写行业、产品和目标客户')
      return
    }
    setPosLoading(true)
    try {
      const res = await fetch('/api/generate-positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: posIndustry, product: posProduct, targetCustomer: posCustomer, city: posCity, advantage: posAdvantage })
      })
      const data = await res.json()
      if (data.positioning) {
        setPosResult(data)
        setPosStep(3)
      } else {
        showToast(data.error || '生成失败')
      }
    } catch {
      showToast('生成失败，请重试')
    } finally {
      setPosLoading(false)
    }
  }

  async function generateTTS() {
    if (!videoCopy.trim()) { showToast('请先输入文案'); return }
    setVideoLoading(true); setVideoError(''); setVideoAudioB64('')
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: videoCopy, voiceId: videoVoiceId, speed: videoSpeed })
      })
      const data = await res.json()
      if (data.audio) {
        setVideoAudioB64(data.audio)
        showToast('✅ 语音合成成功')
        setVideoStep('avatar')
      } else {
        setVideoError(
          data.configured === false
            ? '⚙️ MiniMax API 未配置，请在 Vercel 添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID'
            : (data.error || '合成失败')
        )
      }
    } catch (e: any) {
      setVideoError(e.message)
    } finally {
      setVideoLoading(false)
    }
  }

  // ─── Content Helpers ──────────────────────────────────────
  function saveCopy(content: string, style: string, hook?: string) {
    const item: SavedContent = {
      id: Date.now().toString(),
      topic: selectedTopic, style, content, hook,
      createdAt: new Date().toISOString(),
      accountId: acc.id
    }
    const updated = [item, ...savedContents]
    setSavedContents(updated)
    saveToLocal('contentos_saved', updated)
    showToast('✅ 已保存到素材库')
  }

  async function copyText(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
      showToast('✅ 已复制')
    } catch {
      showToast('复制失败，请手动复制')
    }
  }

  function saveTopic(title: string) {
    if (savedTopics.includes(title)) {
      const updated = savedTopics.filter(t => t !== title)
      setSavedTopics(updated)
      saveToLocal('contentos_saved_topics', updated)
      showToast('已取消收藏')
    } else {
      const updated = [title, ...savedTopics]
      setSavedTopics(updated)
      saveToLocal('contentos_saved_topics', updated)
      showToast('✅ 已收藏选题')
    }
  }

  function addAccount() {
    if (!newAccName.trim()) { showToast('请输入账号名称'); return }
    const colors = ['from-purple-500 to-pink-400', 'from-green-400 to-emerald-500', 'from-rose-400 to-red-500', 'from-indigo-500 to-blue-400']
    const newAcc: Account = {
      id: Date.now().toString(),
      name: newAccName,
      emoji: newAccEmoji,
      industry: newAccIndustry || '其他',
      positioning: '待完善',
      targetAudience: '待完善',
      color: colors[accounts.length % colors.length],
      followers: '0', likes: '0', works: '0'
    }
    const updated = [...accounts, newAcc]
    setAccounts(updated)
    saveToLocal('contentos_accounts', updated)
    setAccountIdx(updated.length - 1)
    setShowAddAccount(false)
    setNewAccName(''); setNewAccIndustry(''); setNewAccEmoji('🏪')
    showToast('✅ 账号已添加')
  }

  function addScheduleItem() {
    if (!newScheduleTitle.trim()) { showToast('请输入标题'); return }
    const item: ScheduleItem = {
      id: Date.now().toString(),
      time: '待定',
      title: newScheduleTitle,
      status: '计划中',
      platform: newSchedulePlatform
    }
    setSchedule([...schedule, item])
    setShowAddSchedule(false)
    setNewScheduleTitle('')
    showToast('✅ 已添加到排期')
  }

  // ─── Auth Screen ──────────────────────────────────────────
  if (!user) {
    return (
      <div className="w-[390px] h-[844px] rounded-[50px] overflow-hidden bg-white flex flex-col shadow-[0_0_0_10px_#111,0_40px_100px_rgba(0,0,0,.7)] relative">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-6 shadow-xl">
            <span className="text-4xl">🎬</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">ContentOS</h1>
          <p className="text-sm text-gray-400 mb-8">AI 内容增长工作台</p>
          <div className="w-full space-y-3">
            <input
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              type="email"
              placeholder="邮箱"
              className="w-full px-4 py-3.5 rounded-2xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
            <input
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              type="password"
              placeholder="密码（至少6位）"
              className="w-full px-4 py-3.5 rounded-2xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
            />
            {authError && (
              <div className="bg-red-50 rounded-xl px-3 py-2 text-xs text-red-500 flex items-center gap-1.5">
                <span>⚠️</span><span>{authError}</span>
              </div>
            )}
            <button
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              disabled={authLoading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
            >
              {authLoading ? <span className="flex items-center justify-center gap-2"><Spinner />处理中...</span> : authMode === 'login' ? '登录' : '注册'}
            </button>
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
              className="w-full py-2 text-sm text-gray-400"
            >
              {authMode === 'login' ? '没有账号？立即注册' : '已有账号？去登录'}
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-300">或</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <button
              onClick={() => setUser({ id: 'guest', email: 'guest@demo.com' })}
              className="w-full py-3.5 bg-gray-100 text-gray-600 font-semibold rounded-2xl text-sm active:scale-[0.98] transition-all"
            >
              👀 跳过登录，先体验
            </button>
          </div>
          <p className="text-[10px] text-gray-300 mt-6 text-center">登录即代表同意服务条款和隐私政策</p>
        </div>
      </div>
    )
  }

  // ─── Positioning Wizard Modal ─────────────────────────────
  if (showPositioning) {
    return (
      <div className="w-[390px] h-[844px] rounded-[50px] overflow-hidden bg-[#F2F2F7] flex flex-col shadow-[0_0_0_10px_#111,0_40px_100px_rgba(0,0,0,.7)] relative">
        <div className="px-5 pt-12 pb-4 flex-shrink-0 flex items-center gap-3">
          <button onClick={() => { setShowPositioning(false); setPosStep(1); setPosResult(null) }} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500">←</button>
          <div>
            <h1 className="text-lg font-black text-gray-900">账号定位向导</h1>
            <p className="text-xs text-gray-400">AI 帮你找准账号方向</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="px-5 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {['填写信息', '确认', '查看报告'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${posStep > i + 1 ? 'bg-green-400 text-white' : posStep === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {posStep > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${posStep === i + 1 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>{s}</span>
                {i < 2 && <div className={`flex-1 h-px ${posStep > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-6">
          {posStep === 1 && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">行业 *</label>
                <input value={posIndustry} onChange={e => setPosIndustry(e.target.value)} placeholder="如：餐饮、健身、美妆、教育..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">产品/服务 *</label>
                <input value={posProduct} onChange={e => setPosProduct(e.target.value)} placeholder="如：手工面条、私教课、护肤品..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">目标客户 *</label>
                <input value={posCustomer} onChange={e => setPosCustomer(e.target.value)} placeholder="如：周边上班族、宝妈、大学生..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">城市（可选）</label>
                <input value={posCity} onChange={e => setPosCity(e.target.value)} placeholder="如：上海、成都、全国..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">你的优势（可选）</label>
                <textarea value={posAdvantage} onChange={e => setPosAdvantage(e.target.value)} placeholder="如：10年厨师经验、价格比同行低30%、独家配方..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
              </div>
              <button
                onClick={() => { if (!posIndustry || !posProduct || !posCustomer) { showToast('请填写必填项'); return }; setPosStep(2) }}
                className="w-full py-3 bg-blue-500 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all"
              >
                下一步 →
              </button>
            </div>
          )}

          {posStep === 2 && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-3">📋 确认信息</h3>
                {[
                  ['行业', posIndustry], ['产品/服务', posProduct],
                  ['目标客户', posCustomer], ['城市', posCity || '不限'],
                  ['优势', posAdvantage || '未填写']
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400">{k}</span>
                    <span className="text-xs font-medium text-gray-800 max-w-[60%] text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-xs text-blue-600 leading-relaxed">✨ AI 将根据以上信息，为你生成完整的账号定位方案，包括：定位一句话、内容方向、目标人群画像、差异化优势、账号名称建议和4周内容计划。</p>
              </div>
              {posLoading && (
                <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                  <Spinner size="md" />
                  <p className="text-sm text-gray-500 mt-3">AI 正在分析，请稍候...</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setPosStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm">← 返回修改</button>
                <button onClick={generatePositioning} disabled={posLoading} className="flex-2 flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60">
                  {posLoading ? '生成中...' : '✨ 生成定位报告'}
                </button>
              </div>
            </div>
          )}

          {posStep === 3 && posResult && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl p-5 text-white shadow-lg">
                <div className="text-xs font-bold text-white/70 mb-1">账号定位</div>
                <div className="text-lg font-black leading-snug">{posResult.positioning}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-3">🎯 内容方向</h3>
                {posResult.directions?.map((d: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-blue-400 font-bold text-xs mt-0.5">{i + 1}.</span>
                    <span className="text-sm text-gray-700">{d}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-2">👥 目标人群</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{posResult.audience}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 text-sm mb-2">⚡ 差异化优势</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{posResult.advantage}</p>
              </div>
              {posResult.names && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">💡 账号名称建议</h3>
                  <div className="flex flex-wrap gap-2">
                    {posResult.names.map((n: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {posResult.plan && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">📅 4周内容计划</h3>
                  {posResult.plan.map((w: any, i: number) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="text-xs font-bold text-blue-500 mb-1.5">第{w.week}周 · {w.theme}</div>
                      {w.topics?.map((t: string, j: number) => (
                        <div key={j} className="text-xs text-gray-600 py-1 pl-3 border-l-2 border-blue-100 mb-1">{t}</div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  const newAcc: Account = {
                    id: Date.now().toString(),
                    name: posProduct,
                    emoji: '🎯',
                    industry: posIndustry,
                    positioning: posResult.positioning,
                    targetAudience: posResult.audience || posCustomer,
                    color: 'from-blue-500 to-cyan-400',
                    followers: '0', likes: '0', works: '0'
                  }
                  const updated = [...accounts, newAcc]
                  setAccounts(updated)
                  saveToLocal('contentos_accounts', updated)
                  setAccountIdx(updated.length - 1)
                  setShowPositioning(false)
                  setPosStep(1); setPosResult(null)
                  showToast('✅ 定位已保存，账号已创建')
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
              >
                ✅ 保存定位，创建账号
              </button>
              <button onClick={() => { setShowPositioning(false); setPosStep(1); setPosResult(null) }} className="w-full py-2 text-sm text-gray-400">
                稍后再说
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Nav ──────────────────────────────────────────────────
  const NAV_TABS = [
    { id: 'dashboard', icon: '🏠', label: '工作台' },
    { id: 'materials', icon: '📦', label: '素材' },
    { id: 'content', icon: '✍️', label: '内容' },
    { id: 'video', icon: '🎬', label: '视频' },
    { id: 'operations', icon: '📊', label: '运营' },
    { id: 'profile', icon: '👤', label: '我的' },
  ]

  return (
    <div className="w-[390px] h-[844px] rounded-[50px] overflow-hidden bg-[#F2F2F7] flex flex-col shadow-[0_0_0_10px_#111,0_40px_100px_rgba(0,0,0,.7)] relative">
      <Toast msg={toast} />
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'dashboard' && (
          <Dashboard
            acc={acc} accounts={accounts} accountIdx={accountIdx}
            setAccountIdx={setAccountIdx} setTab={setTab} showToast={showToast}
            user={user} onLogout={handleLogout} savedContents={savedContents}
            schedule={schedule} onPositioning={() => setShowPositioning(true)}
            showAddAccount={showAddAccount} setShowAddAccount={setShowAddAccount}
            newAccName={newAccName} setNewAccName={setNewAccName}
            newAccIndustry={newAccIndustry} setNewAccIndustry={setNewAccIndustry}
            newAccEmoji={newAccEmoji} setNewAccEmoji={setNewAccEmoji}
            addAccount={addAccount}
          />
        )}
        {tab === 'materials' && (
          <Materials
            acc={acc} matTab={matTab} setMatTab={setMatTab}
            hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading}
            generateTopics={generateTopics}
            useTopic={(t: string) => { setSelectedTopic(t); setTab('content'); setContentStep(2) }}
            savedContents={savedContents} savedTopics={savedTopics} saveTopic={saveTopic}
            creatorUrl={creatorUrl} setCreatorUrl={setCreatorUrl}
            creatorLoading={creatorLoading} creatorData={creatorData}
            setCreatorData={setCreatorData} trackedCreators={trackedCreators}
            scrapeCreator={scrapeCreator} showToast={showToast}
            radarData={radarData} radarLoading={radarLoading} fetchRadar={fetchRadar}
            styleTemplates={styleTemplates} styleLoading={styleLoading}
            styleUrl={styleUrl} setStyleUrl={setStyleUrl}
            styleName={styleName} setStyleName={setStyleName}
            styleText={styleText} setStyleText={setStyleText}
            analyzeStyle={analyzeStyle}
            applyTemplate={(t: any) => { setCopyStyle(t.name); showToast(`✅ 已应用「${t.name}」风格`) }}
            deleteTemplate={(id: string) => {
              const u = styleTemplates.filter((t: any) => t.id !== id)
              setStyleTemplates(u)
              saveToLocal('contentos_style_templates', u)
              showToast('已删除')
            }}
          />
        )}
        {tab === 'content' && (
          <ContentCenter
            acc={acc} step={contentStep} setStep={setContentStep}
            topic={selectedTopic} setTopic={setSelectedTopic}
            style={copyStyle} setStyle={setCopyStyle}
            userInput={userInput} setUserInput={setUserInput}
            versions={copyVersions} loading={copyLoading} error={copyError}
            copiedIdx={copiedIdx} expandedCopy={expandedCopy} setExpandedCopy={setExpandedCopy}
            generate={generateCopy} copy={copyText} save={saveCopy}
            showToast={showToast} setTab={setTab} hotspots={HOTSPOTS}
            savedContents={savedContents} setVideoCopy={setVideoCopy}
          />
        )}
        {tab === 'video' && (
          <VideoStudio
            acc={acc} step={videoStep} setStep={setVideoStep}
            copy={videoCopy} setCopy={setVideoCopy}
            voiceId={videoVoiceId} setVoiceId={setVideoVoiceId}
            speed={videoSpeed} setSpeed={setVideoSpeed}
            avatarType={videoAvatarType} setAvatarType={setVideoAvatarType}
            avatarPreset={videoAvatarPreset} setAvatarPreset={setVideoAvatarPreset}
            bgType={videoBgType} setBgType={setVideoBgType}
            bgColor={videoBgColor} setBgColor={setVideoBgColor}
            loading={videoLoading} audioB64={videoAudioB64} error={videoError}
            generateTTS={generateTTS} showToast={showToast}
            savedContents={savedContents} setTab={setTab}
          />
        )}
        {tab === 'operations' && (
          <Operations
            acc={acc} opsTab={opsTab} setOpsTab={setOpsTab}
            schedule={schedule} setSchedule={setSchedule}
            savedContents={savedContents} showToast={showToast}
            insights={insights} insightsLoading={insightsLoading}
            fetchInsights={fetchInsights}
            showAddSchedule={showAddSchedule} setShowAddSchedule={setShowAddSchedule}
            newScheduleTitle={newScheduleTitle} setNewScheduleTitle={setNewScheduleTitle}
            newSchedulePlatform={newSchedulePlatform} setNewSchedulePlatform={setNewSchedulePlatform}
            addScheduleItem={addScheduleItem}
          />
        )}
        {tab === 'profile' && (
          <Profile
            user={user} onLogout={handleLogout} showToast={showToast}
            profileTab={profileTab} setProfileTab={setProfileTab}
            aiModel={aiModel} setAiModel={setAiModel}
            aiApiKey={aiApiKey} setAiApiKey={setAiApiKey}
            aiApiBase={aiApiBase} setAiApiBase={setAiApiBase}
            aiSystemPrompt={aiSystemPrompt} setAiSystemPrompt={setAiSystemPrompt}
            aiTemperature={aiTemperature} setAiTemperature={setAiTemperature}
            credits={credits} setCredits={setCredits}
            accounts={accounts} setAccounts={setAccounts}
            accountIdx={accountIdx} setAccountIdx={setAccountIdx}
            savedContents={savedContents} savedTopics={savedTopics}
            showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
            editingAccount={editingAccount} setEditingAccount={setEditingAccount}
            saveToLocal={saveToLocal}
          />
        )}
      </div>
      <div className="h-[90px] bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-start pt-2 pb-5 flex-shrink-0 z-50">
        {NAV_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)} className="flex-1 flex flex-col items-center gap-0.5 py-1 active:scale-95 transition-transform">
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
function Dashboard({ acc, accounts, accountIdx, setAccountIdx, setTab, showToast, user, onLogout, savedContents, schedule, onPositioning, showAddAccount, setShowAddAccount, newAccName, setNewAccName, newAccIndustry, setNewAccIndustry, newAccEmoji, setNewAccEmoji, addAccount }: any) {
  const EMOJIS = ['🏪', '🍜', '💪', '💄', '📚', '🏠', '🚗', '🎵', '🌿', '☕']
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium">AI 内容增长工作台</p>
            <h1 className="text-xl font-black text-gray-900">ContentOS</h1>
          </div>
          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform"
          >
            {user?.id === 'guest' ? '👤' : '👋'}
          </button>
        </div>
        {/* Account Switcher */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {accounts.map((a: any, i: number) => (
            <button
              key={a.id}
              onClick={() => setAccountIdx(i)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95 ${i === accountIdx ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'}`}
            >
              <span>{a.emoji}</span><span>{a.name}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAddAccount(true)}
            className="flex-shrink-0 w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 text-xl active:scale-95 transition-transform"
          >+</button>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-end rounded-[50px] overflow-hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">添加账号</h3>
              <button onClick={() => setShowAddAccount(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">选择图标</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewAccEmoji(e)} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${newAccEmoji === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-100'}`}>{e}</button>
                  ))}
                </div>
              </div>
              <input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="账号名称 *" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              <input value={newAccIndustry} onChange={e => setNewAccIndustry(e.target.value)} placeholder="行业（如：餐饮、健身）" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddAccount(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">取消</button>
                <button onClick={addAccount} className="flex-1 py-2.5 bg-blue-500 text-white font-bold rounded-xl text-sm">添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">
        {/* Account Card */}
        <div className={`bg-gradient-to-br ${acc.color} rounded-3xl p-5 text-white shadow-lg`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-3xl mb-1">{acc.emoji}</div>
              <div className="font-black text-lg">{acc.name}</div>
              <div className="text-white/70 text-xs mt-0.5">{acc.positioning}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="bg-white/20 rounded-2xl px-3 py-1.5">
                <span className="text-xs font-bold">{acc.industry}</span>
              </div>
              <button onClick={onPositioning} className="bg-white/20 rounded-xl px-2.5 py-1 text-[10px] font-bold active:scale-95 transition-transform">
                ✨ 优化定位
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[['粉丝', acc.followers || '0'], ['获赞', acc.likes || '0'], ['作品', acc.works || '0']].map(([l, v]) => (
              <div key={l} className="bg-white/15 rounded-2xl p-2 text-center">
                <div className="font-black text-base">{v}</div>
                <div className="text-white/60 text-[10px]">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '✍️', label: '生成文案', sub: '一键AI创作', tab: 'content', color: 'from-blue-500 to-cyan-400' },
            { icon: '🎬', label: '生成视频', sub: '文案转视频', tab: 'video', color: 'from-purple-500 to-pink-400' },
            { icon: '📡', label: '内容情报', sub: '今日热点', tab: 'materials', color: 'from-orange-400 to-amber-400' },
            { icon: '🎯', label: '博主追踪', sub: '竞品分析', tab: 'materials', color: 'from-green-400 to-emerald-500' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => setTab(item.tab)}
              className="bg-white rounded-3xl p-4 shadow-sm text-left active:scale-[0.97] transition-transform"
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl mb-2 shadow-sm`}>{item.icon}</div>
              <div className="font-bold text-gray-900 text-sm">{item.label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{item.sub}</div>
            </button>
          ))}
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">📅 今日计划</h3>
            <button onClick={() => setTab('operations')} className="text-xs text-blue-500 font-medium">查看全部 →</button>
          </div>
          {schedule.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">暂无计划，去运营中心添加</p>
            </div>
          ) : (
            schedule.slice(0, 3).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-400' : s.status === '已发布' ? 'bg-green-400' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{s.title}</div>
                  <div className="text-xs text-gray-400">{s.time} · {s.platform}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
              </div>
            ))
          )}
        </div>

        {/* Saved Contents */}
        {savedContents.length > 0 && (
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">💾 已保存文案</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{savedContents.length} 条</span>
            </div>
            {savedContents.slice(0, 2).map((c: any) => (
              <div key={c.id} className="py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full font-medium">{c.style}</span>
                  <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                </div>
                <div className="text-sm font-medium text-gray-800 truncate">{c.topic}</div>
                <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{c.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Positioning CTA */}
        {acc.positioning === '待完善' && (
          <button onClick={onPositioning} className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-3xl p-4 text-white text-left shadow-md active:scale-[0.98] transition-transform">
            <div className="font-bold text-sm mb-0.5">✨ 还没有账号定位？</div>
            <div className="text-white/70 text-xs">AI 帮你分析行业，生成专属定位方案 →</div>
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════
function Materials({ acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, useTopic, savedContents, savedTopics, saveTopic, creatorUrl, setCreatorUrl, creatorLoading, creatorData, setCreatorData, trackedCreators, scrapeCreator, showToast, radarData, radarLoading, fetchRadar, styleTemplates, styleLoading, styleUrl, setStyleUrl, styleName, setStyleName, styleText, setStyleText, analyzeStyle, applyTemplate, deleteTemplate }: any) {
  const TABS = [
    { id: 'hotspot', label: '🔥 热点' },
    { id: 'topics', label: '💡 选题库' },
    { id: 'radar', label: '📡 情报' },
    { id: 'creator', label: '🎯 博主' },
    { id: 'style', label: '🎨 风格' },
  ]
  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-12 pb-0 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">素材中心</h1>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setMatTab(t.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${matTab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">
        {/* Hotspot Tab */}
        {matTab === 'hotspot' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3 mt-1">今日热点 · 点击直接使用</p>
            {hotspots.map((h: any, i: number) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => useTopic(h.title)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${i < 3 ? 'bg-gradient-to-br from-red-400 to-orange-400' : 'bg-gradient-to-br from-orange-300 to-amber-300'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{h.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{h.tag}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-xs font-bold text-red-400">{h.heat}</span>
                  </div>
                  <span className="text-[10px] text-blue-500 font-semibold">使用 →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Topics Tab */}
        {matTab === 'topics' && (
          <div>
            <div className="flex items-center justify-between mb-3 mt-1">
              <p className="text-xs text-gray-400">AI 为 {acc.name} 生成的选题</p>
              <button
                onClick={generateTopics}
                disabled={topicsLoading}
                className="flex items-center gap-1 text-xs text-blue-500 font-semibold disabled:opacity-50"
              >
                {topicsLoading ? <><span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />生成中</> : '🔄 重新生成'}
              </button>
            </div>
            {aiTopics.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">💡</div>
                <div className="font-bold text-gray-800 mb-1 text-sm">AI 选题生成</div>
                <div className="text-xs text-gray-400 mb-4 leading-relaxed">基于你的账号定位<br />生成高完播率选题</div>
                <button
                  onClick={generateTopics}
                  disabled={topicsLoading}
                  className="px-6 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-2xl disabled:opacity-60 active:scale-[0.97] transition-transform"
                >
                  {topicsLoading ? '生成中...' : '✨ 生成选题'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {aiTopics.map((t: any, i: number) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-gray-900 text-sm flex-1 leading-snug">{t.title}</div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => saveTopic(t.title)}
                          className={`text-lg leading-none ${savedTopics.includes(t.title) ? 'text-yellow-400' : 'text-gray-200'}`}
                        >★</button>
                        <button
                          onClick={() => useTopic(t.title)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                        >使用</button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-1">💡 {t.reason}</div>
                    <div className="text-xs text-orange-500 mb-2">🎣 {t.hook}</div>
                    <div className="flex gap-1 flex-wrap">
                      {t.tags?.map((tag: string) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {savedTopics.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-2">⭐ 已收藏选题</h3>
                    {savedTopics.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-yellow-400 text-sm">★</span>
                        <span className="text-sm text-gray-700 flex-1">{t}</span>
                        <button onClick={() => useTopic(t)} className="text-xs text-blue-500 font-semibold">使用</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Radar Tab */}
        {matTab === 'radar' && (
          <div className="mt-1">
            {!radarData ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">📡</div>
                <div className="font-bold text-gray-800 mb-1 text-sm">内容情报雷达</div>
                <div className="text-xs text-gray-400 mb-4 leading-relaxed">每日热点 · 爆款形式<br />关键词热度分析</div>
                <button
                  onClick={fetchRadar}
                  disabled={radarLoading}
                  className="px-6 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-2xl disabled:opacity-60 active:scale-[0.97] transition-transform"
                >
                  {radarLoading ? '获取中...' : '📡 获取今日情报'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-sm mb-3">🔥 今日热点</h3>
                  {radarData.hotspots?.slice(0, 6).map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                      <span className={`text-xs font-black w-5 ${i < 3 ? 'text-red-400' : 'text-gray-300'}`}>{i + 1}</span>
                      <span className="text-sm text-gray-800 flex-1">{h.title || h}</span>
                      {h.heat && <span className="text-xs text-red-400 font-bold">{h.heat}</span>}
                    </div>
                  ))}
                </div>
                {radarData.formats && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">🎬 爆款内容形式</h3>
                    {radarData.formats?.slice(0, 4).map((f: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-black text-gray-300 w-5">{i + 1}</span>
                        <span className="text-sm text-gray-700">{f.format || f}</span>
                      </div>
                    ))}
                  </div>
                )}
                {radarData.keywords && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">🔑 热门关键词</h3>
                    <div className="flex flex-wrap gap-2">
                      {radarData.keywords?.slice(0, 10).map((k: any, i: number) => (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${i < 3 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'}`}>{k.word || k}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={fetchRadar}
                  disabled={radarLoading}
                  className="w-full py-2.5 bg-white rounded-2xl text-sm text-orange-500 font-semibold shadow-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {radarLoading ? '刷新中...' : '🔄 刷新情报'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Creator Tab */}
        {matTab === 'creator' && (
          <div className="mt-1 space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔍 抓取博主内容</div>
              <input
                value={creatorUrl}
                onChange={e => setCreatorUrl(e.target.value)}
                placeholder="粘贴抖音/小红书博主主页链接..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2"
              />
              <button
                onClick={scrapeCreator}
                disabled={creatorLoading}
                className="w-full py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform"
              >
                {creatorLoading ? '抓取中...' : '🚀 开始抓取 Top 20'}
              </button>
            </div>
            {creatorData && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-2">📊 {creatorData.creator?.name || '博主'} 的内容分析</div>
                <div className="text-xs text-gray-500 mb-3 leading-relaxed bg-gray-50 rounded-xl p-3">{creatorData.summary}</div>
                <div className="space-y-1">
                  {creatorData.videos?.slice(0, 5).map((v: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{v.title}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">👍 {v.likes} · 💬 {v.comments} · ⭐ {v.collects || 0}</div>
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
                  <div
                    key={i}
                    onClick={() => setCreatorData({ creator: c, videos: c.videos, summary: c.summary })}
                    className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-xl px-1 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {c.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{c.name || '博主'}</div>
                      <div className="text-xs text-gray-400">{c.videos?.length || 0} 条视频 · {new Date(c.addedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} 更新</div>
                    </div>
                    <span className="text-xs text-blue-500">查看 →</span>
                  </div>
                ))}
              </div>
            )}
            {!creatorData && trackedCreators.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">🎯</div>
                <div className="font-bold text-gray-800 mb-1 text-sm">博主追踪</div>
                <div className="text-xs text-gray-400 leading-relaxed">粘贴竞品博主主页链接<br />AI 分析其爆款内容规律</div>
              </div>
            )}
          </div>
        )}

        {/* Style Tab */}
        {matTab === 'style' && (
          <div className="mt-1 space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔮 分析文案风格</div>
              <input
                value={styleUrl}
                onChange={e => setStyleUrl(e.target.value)}
                placeholder="博主主页链接（可选）"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2"
              />
              <input
                value={styleName}
                onChange={e => setStyleName(e.target.value)}
                placeholder="模板名称（如：犀利观点派）"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2"
              />
              <textarea
                value={styleText}
                onChange={e => setStyleText(e.target.value)}
                placeholder="或粘贴文案样本（AI 分析风格特征）..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20 mb-2"
              />
              <button
                onClick={analyzeStyle}
                disabled={styleLoading}
                className="w-full py-2.5 bg-purple-500 text-white text-sm font-bold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform"
              >
                {styleLoading ? '分析中...' : '✨ 分析并保存风格'}
              </button>
            </div>
            {styleTemplates.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-4xl mb-2">🎨</div>
                <div className="text-sm font-bold text-gray-700 mb-1">还没有风格模板</div>
                <div className="text-xs text-gray-400">分析博主风格后自动保存，生成文案时可一键应用</div>
              </div>
            ) : (
              <div className="space-y-2">
                {styleTemplates.map((t: any) => (
                  <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                      <div className="flex gap-2">
                        <button onClick={() => applyTemplate(t)} className="text-xs text-blue-500 font-semibold px-2 py-0.5 bg-blue-50 rounded-lg">应用</button>
                        <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400 px-2 py-0.5 bg-red-50 rounded-lg">删除</button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">{t.description || t.summary}</div>
                    {t.features && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.features?.slice(0, 3).map((f: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full">{f}</span>
                        ))}
                      </div>
                    )}
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
function ContentCenter({ acc, step, setStep, topic, setTopic, style, setStyle, userInput, setUserInput, versions, loading, error, copiedIdx, expandedCopy, setExpandedCopy, generate, copy, save, showToast, setTab, hotspots, savedContents, setVideoCopy }: any) {
  const STYLES = ['犀利观点', '温情故事', '干货教程', '幽默搞笑', '励志正能量', '悬念钩子']

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Header with Steps */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">内容中心</h1>
        <div className="flex items-center gap-1">
          {['选题', '配置', '文案'].map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => { if (i + 1 < step) setStep(i + 1 as any) }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-green-400 text-white' : step === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {step > i + 1 ? '✓' : i + 1}
              </button>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-blue-500' : step > i + 1 ? 'text-green-500' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`w-6 h-px ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">
        {/* Step 1: Topic Selection */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">✏️ 自定义选题</div>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="输入你的选题标题..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20"
              />
              <button
                onClick={() => { if (!topic.trim()) { showToast('请输入选题'); return }; setStep(2) }}
                className="w-full mt-2 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-transform"
              >
                使用此选题 →
              </button>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔥 热点选题（点击使用）</div>
              {hotspots.map((h: any, i: number) => (
                <div
                  key={i}
                  onClick={() => { setTopic(h.title); setStep(2) }}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-xl px-1 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 ${i < 3 ? 'bg-gradient-to-br from-red-400 to-orange-400' : 'bg-gradient-to-br from-orange-300 to-amber-300'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{h.title}</div>
                    <div className="text-xs text-gray-400">{h.tag}</div>
                  </div>
                  <span className="text-xs text-blue-500 font-semibold flex-shrink-0">选用 →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Config */}
        {step === 2 && (
          <div className="space-y-3">
            {/* Current Topic */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-900 text-sm">📌 当前选题</div>
                <button onClick={() => setStep(1)} className="text-xs text-gray-400 active:text-gray-600">← 重选</button>
              </div>
              <div className="text-sm text-blue-600 font-medium bg-blue-50 rounded-xl px-3 py-2.5 leading-snug">{topic}</div>
            </div>

            {/* Style Selection */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎨 文案风格</div>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${style === s ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="text-2xl">{acc.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-700">{acc.name}</div>
                <div className="text-xs text-gray-400 truncate">{acc.positioning}</div>
              </div>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{acc.industry}</span>
            </div>

            {/* Extra Input */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">💬 补充说明（可选）</div>
              <textarea
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder="有什么特别要求？如：突出价格优惠、强调食材新鲜、加入最近的热点事件..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20"
              />
            </div>

            {error && (
              <div className="bg-red-50 rounded-2xl p-3 flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0">⚠️</span>
                <span className="text-xs text-red-500 leading-relaxed">{error}</span>
              </div>
            )}

            <button
              onClick={generate}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  AI 生成中...
                </span>
              ) : '✨ 生成文案（3个版本）'}
            </button>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">✅ 生成完成 · {versions.length} 个版本</div>
              <button onClick={() => setStep(2)} className="text-xs text-blue-500 font-semibold">重新生成</button>
            </div>
            {versions.map((v: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Version Header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">版本 {i + 1}</span>
                    <span className="text-xs text-gray-400">{v.style}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copy(v.content, i)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors ${copiedIdx === i ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                    >
                      {copiedIdx === i ? '✅ 已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => save(v.content, v.style, v.hook)}
                      className="text-xs text-blue-500 font-semibold px-2 py-0.5 bg-blue-50 rounded-lg"
                    >保存</button>
                  </div>
                </div>

                {/* Hook */}
                {v.hook && (
                  <div className="mx-4 mb-2 px-3 py-2 bg-orange-50 rounded-xl">
                    <span className="text-[10px] text-orange-400 font-bold">🎣 钩子：</span>
                    <span className="text-xs text-orange-600">{v.hook}</span>
                  </div>
                )}

                {/* Content */}
                <div className="px-4 pb-3">
                  <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${expandedCopy === i ? '' : 'line-clamp-4'}`}>
                    {v.content}
                  </p>
                  {v.content?.length > 150 && (
                    <button
                      onClick={() => setExpandedCopy(expandedCopy === i ? null : i)}
                      className="text-xs text-blue-400 mt-1"
                    >
                      {expandedCopy === i ? '收起 ↑' : '展开全文 ↓'}
                    </button>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-gray-300">{v.content?.length || 0} 字</span>
                    <button
                      onClick={() => { setVideoCopy(v.content); setTab('video') }}
                      className="text-xs text-purple-500 font-semibold bg-purple-50 px-3 py-1 rounded-xl active:scale-95 transition-transform"
                    >
                      🎬 生成视频
                    </button>
                  </div>
                </div>
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
    { id: 'female-shaonv', label: '少女音', emoji: '👧', desc: '清甜活泼' },
    { id: 'female-yujie', label: '御姐音', emoji: '👩', desc: '成熟知性' },
    { id: 'male-qingxin', label: '清新男声', emoji: '👦', desc: '阳光自然' },
    { id: 'male-chunhou', label: '醇厚男声', emoji: '🧔', desc: '低沉有力' },
    { id: 'audiobook-male-1', label: '播音腔', emoji: '🎙️', desc: '专业标准' },
  ]
  const AVATARS = [
    { id: 'business-female', label: '职场女性', emoji: '👩‍💼' },
    { id: 'business-male', label: '职场男性', emoji: '👨‍💼' },
    { id: 'casual-female', label: '休闲女生', emoji: '👩' },
    { id: 'casual-male', label: '休闲男生', emoji: '👨' },
  ]
  const STEPS = ['文案', '声音', '形象', '预览']
  const stepIdx = ['input', 'voice', 'avatar', 'preview'].indexOf(step)

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">视频生成</h1>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepIdx > i ? 'bg-green-400 text-white' : stepIdx === i ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {stepIdx > i ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${stepIdx === i ? 'text-purple-500' : stepIdx > i ? 'text-green-500' : 'text-gray-400'}`}>{s}</span>
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
              <textarea
                value={videoCopy}
                onChange={e => setVideoCopy(e.target.value)}
                placeholder="输入视频口播文案，或从内容中心导入..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-32"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{videoCopy.length} 字</span>
                <span className="text-xs text-gray-400">预计 {Math.ceil(videoCopy.length / 4)} 秒</span>
              </div>
            </div>
            {savedContents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-2">💾 从已保存文案导入</div>
                {savedContents.slice(0, 3).map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setVideoCopy(c.content)}
                    className="py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-lg px-1 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{c.style}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-700 truncate">{c.topic}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep('voice')}
              disabled={!videoCopy.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
            >
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
                  <button
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] ${voiceId === v.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                  >
                    <span className="text-2xl">{v.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-semibold ${voiceId === v.id ? 'text-purple-600' : 'text-gray-700'}`}>{v.label}</div>
                      <div className="text-xs text-gray-400">{v.desc}</div>
                    </div>
                    {voiceId === v.id && <span className="text-purple-500 text-sm font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">⚡ 语速调节</div>
                <span className="text-sm font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-lg">{speed}x</span>
              </div>
              <input
                type="range" min="0.5" max="2.0" step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>慢 0.5x</span><span>正常 1.0x</span><span>快 2.0x</span>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 rounded-2xl p-3 text-xs text-red-500 leading-relaxed">{error}</div>
            )}
            <button
              onClick={generateTTS}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  合成中...
                </span>
              ) : '🎙️ 合成语音 →'}
            </button>
            <button onClick={() => setStep('input')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}

        {step === 'avatar' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎭 选择数字形象</div>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setAvatarType('preset')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${avatarType === 'preset' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>预设形象</button>
                <button onClick={() => setAvatarType('upload')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${avatarType === 'upload' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>上传照片</button>
              </div>
              {avatarType === 'preset' ? (
                <div className="grid grid-cols-2 gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setAvatarPreset(a.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-95 ${avatarPreset === a.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                    >
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
                      <button key={c} onClick={() => setBgColor(c)} className={`w-7 h-7 rounded-lg border-2 shadow-sm transition-all ${bgColor === c ? 'border-purple-400 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
              {bgType !== 'color' && <div className="text-xs text-gray-400 py-2 text-center">此功能开发中</div>}
            </div>
            <button onClick={() => setStep('preview')} className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md">
              下一步：生成预览 →
            </button>
            <button onClick={() => setStep('voice')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎬 视频预览</div>
              <div className="rounded-2xl overflow-hidden aspect-[9/16] flex flex-col items-center justify-center relative" style={{ backgroundColor: bgColor }}>
                <div className="text-7xl mb-4">{AVATARS.find(a => a.id === avatarPreset)?.emoji || '👤'}</div>
                <div className="text-white/80 text-xs text-center px-6 leading-relaxed max-w-full">
                  {videoCopy.slice(0, 80)}{videoCopy.length > 80 ? '...' : ''}
                </div>
                {audioB64 && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 flex items-center gap-2">
                      <span className="text-white text-xs font-medium">🎙️ 语音已合成</span>
                      <div className="flex-1 h-1 bg-white/30 rounded-full">
                        <div className="h-full w-1/3 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  ['声音', VOICES.find((v: any) => v.id === voiceId)?.label || voiceId],
                  ['语速', `${speed}x`],
                  ['形象', avatarType === 'preset' ? AVATARS.find(a => a.id === avatarPreset)?.label : '自定义'],
                  ['语音状态', audioB64 ? '✅ 已合成' : '⏳ 未合成'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="font-bold text-amber-700 text-sm mb-1">🚧 视频合成开发中</div>
              <div className="text-xs text-amber-600 leading-relaxed">完整视频合成（LatentSync 对口型 + FFmpeg 合成）正在开发中。当前已完成语音合成，视频合成功能即将上线。</div>
            </div>
            <button
              onClick={() => showToast('🚀 视频合成任务已提交，完成后通知你')}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md opacity-70"
            >
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
function Operations({ acc, opsTab, setOpsTab, schedule, setSchedule, savedContents, showToast, insights, insightsLoading, fetchInsights, showAddSchedule, setShowAddSchedule, newScheduleTitle, setNewScheduleTitle, newSchedulePlatform, setNewSchedulePlatform, addScheduleItem }: any) {
  const TABS = [{ id: 'schedule', label: '📅 排期' }, { id: 'stats', label: '📊 数据' }, { id: 'goals', label: '🎯 目标' }]
  const STATS = [
    { label: '本周发布', value: '3', unit: '条', trend: '+1', up: true },
    { label: '总播放量', value: '2.4万', unit: '', trend: '+18%', up: true },
    { label: '平均完播率', value: '68%', unit: '', trend: '+5%', up: true },
    { label: '新增粉丝', value: '234', unit: '', trend: '-12', up: false },
  ]
  const PLATFORMS = ['抖音', '小红书', 'B站', '视频号', '快手']

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Add Schedule Modal */}
      {showAddSchedule && (
        <div className="absolute inset-0 bg-black/40 z-40 flex items-end rounded-[50px] overflow-hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">添加排期</h3>
              <button onClick={() => setShowAddSchedule(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <input
                value={newScheduleTitle}
                onChange={e => setNewScheduleTitle(e.target.value)}
                placeholder="视频标题 *"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
              />
              <div>
                <p className="text-xs text-gray-400 mb-2">发布平台</p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(p => (
                    <button
                      key={p}
                      onClick={() => setNewSchedulePlatform(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${newSchedulePlatform === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddSchedule(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm">取消</button>
                <button onClick={addScheduleItem} className="flex-1 py-2.5 bg-blue-500 text-white font-bold rounded-xl text-sm">添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-12 pb-0 flex-shrink-0">
        <h1 className="text-xl font-black text-gray-900 mb-3">运营中心</h1>
        <div className="flex gap-2 pb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setOpsTab(t.id)}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all ${opsTab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">
        {/* Schedule Tab */}
        {opsTab === 'schedule' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">📅 发布排期</div>
                <button
                  onClick={() => setShowAddSchedule(true)}
                  className="w-7 h-7 rounded-full bg-blue-500 text-white text-xl flex items-center justify-center leading-none active:scale-95 transition-transform"
                >+</button>
              </div>
              {schedule.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-xs text-gray-400">暂无排期，点击 + 添加</p>
                </div>
              ) : (
                schedule.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-400' : s.status === '已发布' ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{s.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.time} · {s.platform}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
                  </div>
                ))
              )}
            </div>

            {/* AI Insights */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">💡 AI 运营建议</div>
                <button
                  onClick={fetchInsights}
                  disabled={insightsLoading}
                  className="text-xs text-blue-500 font-semibold disabled:opacity-50"
                >
                  {insightsLoading ? '分析中...' : '🔄 重新分析'}
                </button>
              </div>
              {insights.length > 0 ? (
                insights.map((ins: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-base flex-shrink-0">{ins.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-gray-800 mb-0.5">{ins.title}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{ins.detail}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-2.5">
                  {[
                    { icon: '📈', title: '提高发布频率', detail: '本周发布频率偏低，建议增加到每周5条，保持账号活跃度' },
                    { icon: '⏰', title: '优化发布时间', detail: '晚上7-9点是粉丝最活跃时段，建议在此时间段发布' },
                    { icon: '🎯', title: '聚焦优势内容', detail: '干货教程类内容完播率最高，建议增加此类内容比例' },
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-base flex-shrink-0">{tip.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-gray-800 mb-0.5">{tip.title}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{tip.detail}</div>
                      </div>
                    </div>
                  ))}
                  <button onClick={fetchInsights} disabled={insightsLoading} className="w-full py-2 bg-blue-50 text-blue-500 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                    {insightsLoading ? '分析中...' : '✨ 获取 AI 个性化建议'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Stats Tab */}
        {opsTab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                  <div className="text-2xl font-black text-gray-900">
                    {s.value}<span className="text-sm font-medium text-gray-400 ml-0.5">{s.unit}</span>
                  </div>
                  <div className={`text-xs font-semibold mt-1 ${s.up ? 'text-green-500' : 'text-red-400'}`}>
                    {s.up ? '↑' : '↓'} {s.trend} 较上周
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📊 近7天发布</div>
              <div className="flex items-end gap-1.5 h-24">
                {[2, 0, 1, 3, 1, 0, 2].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-cyan-400 transition-all"
                      style={{ height: `${v * 24}px`, minHeight: v > 0 ? '8px' : '0' }}
                    />
                    <span className="text-[9px] text-gray-400">{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🏆 最佳内容</div>
              {savedContents.length > 0 ? (
                savedContents.slice(0, 3).map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">{c.topic}</div>
                      <div className="text-[10px] text-gray-400">{c.style} · {new Date(c.createdAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 text-center py-4">暂无数据，先去生成文案吧</div>
              )}
            </div>
          </>
        )}

        {/* Goals Tab */}
        {opsTab === 'goals' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-4">🎯 本月目标</div>
              {[
                { label: '粉丝增长', current: 234, target: 500, unit: '人', color: 'from-blue-400 to-cyan-400' },
                { label: '视频发布', current: 8, target: 20, unit: '条', color: 'from-purple-400 to-pink-400' },
                { label: '总播放量', current: 24000, target: 50000, unit: '', color: 'from-orange-400 to-amber-400' },
              ].map((g, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-semibold text-gray-700">{g.label}</span>
                    <span className="text-gray-400">{g.current.toLocaleString()}{g.unit} / {g.target.toLocaleString()}{g.unit}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${g.color} rounded-full transition-all`}
                      style={{ width: `${Math.min(100, (g.current / g.target) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">{Math.round((g.current / g.target) * 100)}% 完成</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📋 成长阶段</div>
              {[
                { phase: '第一阶段', desc: '建立账号基础，每周发布3-5条内容', status: '进行中', color: 'bg-blue-400' },
                { phase: '第二阶段', desc: '打造爆款内容，粉丝突破1万', status: '未开始', color: 'bg-gray-300' },
                { phase: '第三阶段', desc: '商业变现，开通橱窗/接广告', status: '未开始', color: 'bg-gray-300' },
              ].map((p, i) => (
                <div key={i} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${p.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-gray-800">{p.phase}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === '进行中' ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                    </div>
                    <div className="text-xs text-gray-400">{p.desc}</div>
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


// ═══════════════════════════════════════════════════════════
// PROFILE — 个人中心
// ═══════════════════════════════════════════════════════════
function Profile({
  user, onLogout, showToast,
  profileTab, setProfileTab,
  aiModel, setAiModel,
  aiApiKey, setAiApiKey,
  aiApiBase, setAiApiBase,
  aiSystemPrompt, setAiSystemPrompt,
  aiTemperature, setAiTemperature,
  credits, setCredits,
  accounts, setAccounts,
  accountIdx, setAccountIdx,
  savedContents, savedTopics,
  showDeleteConfirm, setShowDeleteConfirm,
  editingAccount, setEditingAccount,
  saveToLocal,
}: any) {
  const TABS = [
    { id: 'ai', label: '🤖 AI 设置' },
    { id: 'accounts', label: '📱 账号管理' },
    { id: 'credits', label: '💎 积分' },
    { id: 'about', label: 'ℹ️ 关于' },
  ]

  const AI_MODELS = [
    { id: 'deepseek-chat', label: 'DeepSeek Chat', desc: '性价比最高，推荐', badge: '推荐', badgeColor: 'bg-green-100 text-green-600' },
    { id: 'deepseek-reasoner', label: 'DeepSeek R1', desc: '深度推理，适合复杂任务', badge: '强推理', badgeColor: 'bg-blue-100 text-blue-600' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: '速度快，效果稳定', badge: 'OpenAI', badgeColor: 'bg-purple-100 text-purple-600' },
    { id: 'gpt-4o', label: 'GPT-4o', desc: '最强效果，消耗积分多', badge: '高级', badgeColor: 'bg-orange-100 text-orange-600' },
    { id: 'custom', label: '自定义模型', desc: '填写下方 API 地址使用', badge: '自定义', badgeColor: 'bg-gray-100 text-gray-500' },
  ]

  const CREDIT_PACKAGES = [
    { credits: 500, price: '¥9.9', bonus: '', popular: false },
    { credits: 1500, price: '¥19.9', bonus: '+200', popular: true },
    { credits: 5000, price: '¥49.9', bonus: '+1000', popular: false },
  ]

  const ACCOUNT_COLORS = [
    'from-orange-400 to-amber-500',
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-pink-400',
    'from-green-400 to-emerald-500',
    'from-rose-400 to-red-500',
    'from-indigo-500 to-blue-400',
  ]

  function saveAiSettings() {
    saveToLocal('contentos_ai_settings', {
      model: aiModel, apiKey: aiApiKey,
      apiBase: aiApiBase, systemPrompt: aiSystemPrompt,
      temperature: aiTemperature,
    })
    showToast('✅ AI 设置已保存')
  }

  function deleteAccount(id: string) {
    if (accounts.length <= 1) { showToast('至少保留一个账号'); return }
    const updated = accounts.filter((a: any) => a.id !== id)
    setAccounts(updated)
    saveToLocal('contentos_accounts', updated)
    if (accountIdx >= updated.length) setAccountIdx(updated.length - 1)
    setShowDeleteConfirm(null)
    showToast('已删除账号')
  }

  function saveEditingAccount() {
    if (!editingAccount?.name?.trim()) { showToast('账号名称不能为空'); return }
    const updated = accounts.map((a: any) => a.id === editingAccount.id ? editingAccount : a)
    setAccounts(updated)
    saveToLocal('contentos_accounts', updated)
    setEditingAccount(null)
    showToast('✅ 账号信息已更新')
  }

  const isGuest = user?.id === 'guest'

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-[50px] overflow-hidden px-8">
          <div className="bg-white rounded-3xl p-6 w-full shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="font-black text-gray-900 text-base">确认删除账号？</div>
              <div className="text-xs text-gray-400 mt-1">此操作不可撤销，账号数据将被清除</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm">取消</button>
              <button onClick={() => deleteAccount(showDeleteConfirm)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl text-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end rounded-[50px] overflow-hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">编辑账号</h3>
              <button onClick={() => setEditingAccount(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">账号名称</label>
                <input value={editingAccount.name} onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">行业</label>
                <input value={editingAccount.industry} onChange={e => setEditingAccount({ ...editingAccount, industry: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">账号定位</label>
                <input value={editingAccount.positioning} onChange={e => setEditingAccount({ ...editingAccount, positioning: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">目标受众</label>
                <input value={editingAccount.targetAudience} onChange={e => setEditingAccount({ ...editingAccount, targetAudience: e.target.value })} className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">卡片颜色</label>
                <div className="flex gap-2">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setEditingAccount({ ...editingAccount, color: c })} className={`w-8 h-8 rounded-xl bg-gradient-to-br ${c} flex-shrink-0 transition-transform ${editingAccount.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditingAccount(null)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm">取消</button>
                <button onClick={saveEditingAccount} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-2xl text-sm">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        {/* User Card */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl p-4 text-white mb-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black flex-shrink-0">
              {isGuest ? '👤' : (user?.email?.[0]?.toUpperCase() || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-base truncate">{isGuest ? '游客模式' : (user?.email || '未知用户')}</div>
              <div className="text-white/70 text-xs mt-0.5">{isGuest ? '登录后数据云端同步' : '已登录 · 数据云端同步'}</div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="bg-white/20 rounded-xl px-2.5 py-1 text-xs font-bold">💎 {credits}</div>
              {!isGuest && <button onClick={onLogout} className="text-white/60 text-[10px] font-medium">退出登录</button>}
            </div>
          </div>
          {isGuest && (
            <button onClick={onLogout} className="w-full mt-3 py-2 bg-white/20 rounded-xl text-xs font-bold text-white active:scale-[0.98] transition-transform">
              🔑 立即登录 / 注册
            </button>
          )}
        </div>
        {/* Tab Switcher */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setProfileTab(t.id as any)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${profileTab === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">

        {/* ── AI 设置 ── */}
        {profileTab === 'ai' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🤖 AI 模型选择</div>
              <div className="space-y-2">
                {AI_MODELS.map(m => (
                  <button key={m.id} onClick={() => setAiModel(m.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] ${aiModel === m.id ? 'bg-blue-50 border-2 border-blue-400' : 'bg-gray-50 border-2 border-transparent'}`}>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-semibold ${aiModel === m.id ? 'text-blue-700' : 'text-gray-800'}`}>{m.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.badgeColor}`}>{m.badge}</span>
                      {aiModel === m.id && <span className="text-blue-500 font-bold">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔑 API 配置</div>
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">API Key</label>
                  <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="sk-xxxxxxxxxxxxxxxx" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">API Base URL（可选）</label>
                  <input value={aiApiBase} onChange={e => setAiApiBase(e.target.value)} placeholder="https://api.deepseek.com/v1" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none font-mono" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">⚙️ 高级设置</div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">创意度（Temperature）</label>
                    <span className="text-sm font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">{aiTemperature}</span>
                  </div>
                  <input type="range" min="0.1" max="1.5" step="0.05" value={aiTemperature} onChange={e => setAiTemperature(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>保守 0.1</span><span>均衡 0.85</span><span>创意 1.5</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">系统提示词（可选）</label>
                  <textarea value={aiSystemPrompt} onChange={e => setAiSystemPrompt(e.target.value)} placeholder="自定义 AI 角色，如：你是专注于本地餐饮的短视频文案专家..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
                </div>
              </div>
            </div>

            <button onClick={saveAiSettings} className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md">
              💾 保存 AI 设置
            </button>

            <div className="bg-blue-50 rounded-2xl p-4">
              <div className="font-bold text-blue-700 text-xs mb-2">💡 使用提示</div>
              <div className="space-y-1.5 text-xs text-blue-600 leading-relaxed">
                <div>• DeepSeek 性价比最高，适合日常文案生成</div>
                <div>• API Key 仅存储在本地，不会上传服务器</div>
                <div>• 自定义 API Base 可接入任何 OpenAI 兼容接口</div>
                <div>• 创意度越高，文案越有创意但可能不稳定</div>
              </div>
            </div>
          </>
        )}

        {/* ── 账号管理 ── */}
        {profileTab === 'accounts' && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '管理账号', value: accounts.length, unit: '个' },
                { label: '已保存文案', value: savedContents.length, unit: '条' },
                { label: '收藏选题', value: savedTopics.length, unit: '个' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <div className="text-xl font-black text-gray-900">{s.value}<span className="text-xs font-medium text-gray-400 ml-0.5">{s.unit}</span></div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📱 我的账号</div>
              <div className="space-y-3">
                {accounts.map((a: any, i: number) => (
                  <div key={a.id} className={`rounded-2xl overflow-hidden border-2 transition-all ${i === accountIdx ? 'border-blue-400' : 'border-transparent'}`}>
                    <div className={`bg-gradient-to-br ${a.color} p-3 text-white`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{a.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-sm">{a.name}</div>
                          <div className="text-white/70 text-[10px] truncate">{a.positioning}</div>
                        </div>
                        {i === accountIdx && <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0">当前</span>}
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px] text-white/70">
                        <span>行业：{a.industry}</span>
                        <span>受众：{a.targetAudience}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 p-2 bg-gray-50">
                      <button onClick={() => setAccountIdx(i)} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${i === accountIdx ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 shadow-sm'}`}>
                        {i === accountIdx ? '✓ 使用中' : '切换'}
                      </button>
                      <button onClick={() => setEditingAccount({ ...a })} className="flex-1 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-600 shadow-sm">编辑</button>
                      <button onClick={() => setShowDeleteConfirm(a.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-400">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {savedContents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 text-sm">💾 已保存文案</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{savedContents.length} 条</span>
                </div>
                {savedContents.slice(0, 3).map((c: any) => (
                  <div key={c.id} className="py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full font-medium">{c.style}</span>
                      <span className="text-[10px] text-gray-300">{new Date(c.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="text-xs font-medium text-gray-700 truncate">{c.topic}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{c.content}</div>
                  </div>
                ))}
                {savedContents.length > 3 && <div className="text-xs text-gray-400 text-center pt-2">还有 {savedContents.length - 3} 条...</div>}
              </div>
            )}
          </>
        )}

        {/* ── 积分 ── */}
        {profileTab === 'credits' && (
          <>
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 text-white shadow-lg">
              <div className="text-white/70 text-xs font-medium mb-1">当前积分余额</div>
              <div className="text-4xl font-black mb-1">{credits.toLocaleString()}</div>
              <div className="text-white/70 text-xs">每次 AI 生成消耗约 10-50 积分</div>
              <div className="mt-3 flex gap-2">
                {[{ label: '文案生成', cost: '~20' }, { label: '选题生成', cost: '~15' }, { label: '情报雷达', cost: '~30' }].map(item => (
                  <div key={item.label} className="flex-1 bg-white/20 rounded-xl p-2 text-center">
                    <div className="text-xs font-bold">{item.cost}</div>
                    <div className="text-[10px] text-white/70">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">💎 充值套餐</div>
              <div className="space-y-2">
                {CREDIT_PACKAGES.map((pkg, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${pkg.popular ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 text-base">{pkg.credits.toLocaleString()} 积分</span>
                        {pkg.bonus && <span className="text-xs text-orange-500 font-bold bg-orange-100 px-1.5 py-0.5 rounded-full">{pkg.bonus}</span>}
                        {pkg.popular && <span className="text-[10px] bg-orange-400 text-white px-1.5 py-0.5 rounded-full font-bold">最划算</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">约可生成 {Math.floor(pkg.credits / 20)} 次文案</div>
                    </div>
                    <button onClick={() => showToast('支付功能开发中，敬请期待')} className={`px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform ${pkg.popular ? 'bg-orange-400 text-white shadow-md' : 'bg-gray-200 text-gray-700'}`}>
                      {pkg.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📋 消耗记录</div>
              {[
                { action: '文案生成', cost: -20, time: '今天 08:32', desc: '犀利观点 · 3个版本' },
                { action: '选题生成', cost: -15, time: '昨天 19:45', desc: '餐饮行业 · 8个选题' },
                { action: '情报雷达', cost: -30, time: '昨天 10:12', desc: '今日热点获取' },
                { action: '充值', cost: 1000, time: '3天前', desc: '基础套餐' },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${r.cost > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {r.cost > 0 ? '💰' : '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800">{r.action}</div>
                    <div className="text-[10px] text-gray-400">{r.desc} · {r.time}</div>
                  </div>
                  <span className={`text-sm font-black flex-shrink-0 ${r.cost > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                    {r.cost > 0 ? '+' : ''}{r.cost}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 rounded-2xl p-4">
              <div className="text-xs text-amber-700 font-bold mb-2">🎁 免费获取积分</div>
              <div className="space-y-2 text-xs text-amber-600">
                <div className="flex items-center justify-between">
                  <span>每日签到</span>
                  <button onClick={() => { setCredits((c: number) => c + 10); showToast('✅ 签到成功 +10 积分') }} className="text-xs font-bold text-amber-700 bg-amber-200 px-2.5 py-1 rounded-lg active:scale-95 transition-transform">+10 签到</button>
                </div>
                <div className="flex items-center justify-between">
                  <span>邀请好友注册</span>
                  <span className="text-xs font-bold text-amber-700">+200/人</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>完善账号定位</span>
                  <span className="text-xs font-bold text-amber-700">+50</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── 关于 ── */}
        {profileTab === 'about' && (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">🎬</div>
              <div className="font-black text-gray-900 text-lg">ContentOS</div>
              <div className="text-xs text-gray-400 mt-1">AI 内容增长工作台</div>
              <div className="text-xs text-gray-300 mt-0.5">v6.1.0</div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🚀 功能列表</div>
              {[
                { icon: '✍️', label: '文案生成', desc: 'AI 一键生成3版口播文案' },
                { icon: '💡', label: '选题生成', desc: '基于账号定位的高完播率选题' },
                { icon: '📡', label: '内容情报', desc: '每日热点 + 爆款形式分析' },
                { icon: '🎯', label: '博主追踪', desc: '抓取竞品博主爆款内容' },
                { icon: '🎨', label: '风格模板', desc: '分析博主文案风格并复用' },
                { icon: '🎬', label: '视频生成', desc: 'TTS 语音合成（视频合成开发中）' },
                { icon: '📊', label: '运营中心', desc: '排期管理 + AI 运营诊断' },
                { icon: '🎯', label: '账号定位', desc: 'AI 生成完整定位方案' },
                { icon: '👤', label: '个人中心', desc: 'AI设置 + 账号管理 + 积分' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base w-6 text-center flex-shrink-0">{f.icon}</span>
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-800">{f.label}</span>
                    <span className="text-xs text-gray-400 ml-2">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🛠️ 技术栈</div>
              {[
                ['前端框架', 'Next.js 14 + React 18'],
                ['样式', 'Tailwind CSS'],
                ['数据库', 'Supabase (PostgreSQL)'],
                ['AI 模型', 'DeepSeek / OpenAI'],
                ['语音合成', 'MiniMax TTS'],
                ['部署', 'Vercel'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400">{k}</span>
                  <span className="text-xs font-medium text-gray-700">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📅 更新日志</div>
              {[
                { version: 'v6.1', date: '2026-05-18', desc: '个人中心、AI设置、积分系统、账号编辑' },
                { version: 'v6.0', date: '2026-05-18', desc: '账号定位向导、多账号管理、选题收藏' },
                { version: 'v5.0', date: '2026-05-17', desc: 'Tailwind CSS 重构，全新设计系统' },
                { version: 'v4.0', date: '2026-05-16', desc: '视频生成模块、TTS 语音合成' },
              ].map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full flex-shrink-0">{log.version}</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-800">{log.desc}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{log.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={onLogout} className="w-full py-3.5 bg-white rounded-2xl text-sm font-bold text-red-400 shadow-sm active:scale-[0.98] transition-transform">
              {isGuest ? '🔑 去登录 / 注册' : '🚪 退出登录'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
