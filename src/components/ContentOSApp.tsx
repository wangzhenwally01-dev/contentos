'use client'

import React, { useState, useEffect, useRef } from 'react'
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

// ─── Global AI Quick Panel ────────────────────────────────
// 各模块的 AI 配置说明
const MODULE_AI_CONFIG: Record<string, { label: string; icon: string; color: string; promptPlaceholder: string; promptTip: string }> = {
  dashboard: { label: '工作台', icon: '🏠', color: 'from-blue-500 to-cyan-400', promptPlaceholder: '工作台 AI 助手提示词...', promptTip: '影响每日任务建议和快捷操作的 AI 行为' },
  topics: { label: '选题生成', icon: '💡', color: 'from-orange-400 to-amber-400', promptPlaceholder: '如：专注本地餐饮，选题要结合节假日热点，突出性价比...', promptTip: '影响 AI 生成选题的方向、风格和侧重点' },
  copy: { label: '文案生成', icon: '✍️', color: 'from-purple-500 to-pink-400', promptPlaceholder: '如：文案要口语化，多用疑问句开头，结尾加行动号召...', promptTip: '影响 AI 生成文案的语气、结构和风格' },
  video: { label: '视频脚本', icon: '🎬', color: 'from-red-400 to-rose-500', promptPlaceholder: '如：口播要简洁有力，每句不超过15字，节奏感强...', promptTip: '影响 AI 生成视频口播文案的节奏和风格' },
  radar: { label: '情报雷达', icon: '📡', color: 'from-green-400 to-emerald-500', promptPlaceholder: '如：重点关注餐饮行业，过滤娱乐类热点...', promptTip: '影响 AI 分析热点和行业情报的侧重方向' },
  positioning: { label: '账号定位', icon: '🎯', color: 'from-indigo-500 to-blue-400', promptPlaceholder: '如：定位要突出差异化，结合本地特色...', promptTip: '影响 AI 生成账号定位报告的分析角度' },
  materials: { label: '素材分析', icon: '📚', color: 'from-teal-400 to-cyan-500', promptPlaceholder: '如：重点分析爆款原因，提取可复用的内容结构...', promptTip: '影响 AI 分析博主内容和素材的维度' },
  operations: { label: '运营分析', icon: '📊', color: 'from-violet-500 to-purple-400', promptPlaceholder: '如：运营建议要具体可执行，结合账号当前阶段...', promptTip: '影响 AI 生成运营洞察和优化建议的方向' },
}

const AI_MODELS_LIST = [
  { id: 'deepseek-chat', label: 'DeepSeek Chat', short: 'DS Chat', badge: '推荐', badgeColor: 'bg-green-100 text-green-600' },
  { id: 'deepseek-reasoner', label: 'DeepSeek R1', short: 'DS R1', badge: '推理', badgeColor: 'bg-blue-100 text-blue-600' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', short: '4o Mini', badge: 'OpenAI', badgeColor: 'bg-purple-100 text-purple-600' },
  { id: 'gpt-4o', label: 'GPT-4o', short: '4o', badge: '高级', badgeColor: 'bg-orange-100 text-orange-600' },
  { id: 'custom', label: '自定义', short: '自定义', badge: '自定义', badgeColor: 'bg-gray-100 text-gray-500' },
]

function AiQuickPanel({
  tab, show, onClose,
  aiModel, setAiModel,
  aiApiKey, setAiApiKey,
  aiApiBase, setAiApiBase,
  aiTemperature, setAiTemperature,
  modulePrompts, setModulePrompts,
  saveToLocal, showToast,
}: any) {
  const [panelTab, setPanelTab] = React.useState<'model' | 'prompt' | 'api'>('prompt')
  // tab 到模块配置的映射
  const TAB_TO_MODULE: Record<string, string> = {
    dashboard: 'dashboard',
    materials: 'materials',
    content: 'copy',
    video: 'video',
    operations: 'operations',
    profile: 'dashboard',
  }
  const moduleKey = TAB_TO_MODULE[tab] || tab
  const cfg = MODULE_AI_CONFIG[moduleKey] || MODULE_AI_CONFIG['dashboard']
  const currentPrompt = modulePrompts[moduleKey] || ''

  // 快捷模板也用 moduleKey
  const tplKey = moduleKey

  function saveAll() {
    saveToLocal('contentos_ai_settings', { model: aiModel, apiKey: aiApiKey, apiBase: aiApiBase, temperature: aiTemperature })
    saveToLocal('contentos_module_prompts', modulePrompts)
    showToast('✅ AI 设置已保存')
    onClose()
  }

  if (!show) return null

  return (
    <div className="absolute inset-0 z-50 flex flex-col" onClick={onClose}>
      {/* 半透明遮罩 */}
      <div className="flex-1 bg-black/20 backdrop-blur-[2px]" />
      {/* 面板从底部滑入 */}
      <div
        className="bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-bottom"
        style={{ maxHeight: '82%' }}
        onClick={(e: any) => e.stopPropagation()}
      >
        {/* 拖拽条 */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 标题栏 */}
        <div className="px-5 pb-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-lg shadow-sm`}>
              {cfg.icon}
            </div>
            <div>
              <div className="font-black text-gray-900 text-base leading-tight">{cfg.label} · AI 设置</div>
              <div className="text-[10px] text-gray-400 mt-0.5">当前模型：{AI_MODELS_LIST.find(m => m.id === aiModel)?.short || aiModel}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm active:scale-90 transition-transform">✕</button>
        </div>

        {/* 子 Tab */}
        <div className="px-5 mb-3 flex-shrink-0">
          <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
            {([
              { id: 'prompt', label: '提示词' },
              { id: 'model', label: '模型' },
              { id: 'api', label: 'API' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setPanelTab(t.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${panelTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">

          {/* ── 提示词 Tab ── */}
          {panelTab === 'prompt' && (
            <>
              <div className="bg-blue-50 rounded-2xl p-3.5">
                <div className="text-xs font-bold text-blue-700 mb-1">💡 {cfg.label}专属提示词</div>
                <div className="text-[11px] text-blue-500 leading-relaxed">{cfg.promptTip}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">模块提示词</label>
                <textarea
                  value={currentPrompt}
                  onChange={(e: any) => setModulePrompts((prev: any) => ({ ...prev, [moduleKey]: e.target.value }))}
                  placeholder={cfg.promptPlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-28 leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-400">{currentPrompt.length} 字</span>
                  {currentPrompt && (
                    <button
                      onClick={() => setModulePrompts((prev: any) => ({ ...prev, [moduleKey]: '' }))}
                      className="text-[10px] text-red-400 font-medium"
                    >清空</button>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-bold text-gray-500 mb-2 block">全局系统提示词（所有模块共用）</label>
                <div className="text-[10px] text-gray-400 mb-2">在个人中心 → AI 设置中配置</div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-500 flex-1 truncate">{aiApiKey ? '已配置 API Key ✓' : '未配置 API Key'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${AI_MODELS_LIST.find(m => m.id === aiModel)?.badgeColor || 'bg-gray-100 text-gray-500'}`}>
                    {AI_MODELS_LIST.find(m => m.id === aiModel)?.short || aiModel}
                  </span>
                </div>
              </div>
              {/* 快捷模板 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-bold text-gray-500 mb-2.5">⚡ 快捷模板</div>
                <div className="space-y-2">
                  {(tplKey === 'topics' ? [
                    { label: '本地生活', text: '专注本地生活服务，选题结合节假日和本地热点，突出性价比和便民属性' },
                    { label: '知识干货', text: '以干货知识为主，选题要有实用价值，标题用数字和问句吸引点击' },
                    { label: '情感共鸣', text: '选题要触动情感，引发共鸣，适合宝妈、职场人群，多用故事化角度' },
                  ] : tplKey === 'copy' ? [
                    { label: '口播风格', text: '文案要口语化，节奏感强，每句话简短有力，适合直接对着镜头说' },
                    { label: '种草风格', text: '文案要真实自然，像朋友推荐，多用感受描述，结尾引导互动' },
                    { label: '干货风格', text: '文案结构清晰，用数字和列表，开头抛问题，结尾给解决方案' },
                  ] : tplKey === 'video' ? [
                    { label: '15秒短视频', text: '口播文案控制在100字以内，开头3秒必须有钩子，节奏快' },
                    { label: '1分钟视频', text: '口播文案300-400字，有起承转合，结尾有行动号召' },
                    { label: '教程类', text: '步骤清晰，每步一句话，语气亲切，多用"你"来拉近距离' },
                  ] : [
                    { label: '专业分析', text: '分析要专业深入，给出具体数据和可执行建议' },
                    { label: '简洁实用', text: '分析要简洁，重点突出，每条建议都要可立即执行' },
                  ]).map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => setModulePrompts((prev: any) => ({ ...prev, [moduleKey]: tpl.text }))}
                      className="w-full text-left px-3 py-2.5 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
                    >
                      <div className="text-xs font-semibold text-gray-700 mb-0.5">{tpl.label}</div>
                      <div className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{tpl.text}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 模型 Tab ── */}
          {panelTab === 'model' && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-3">🤖 选择 AI 模型</div>
                <div className="space-y-2">
                  {AI_MODELS_LIST.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setAiModel(m.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] ${aiModel === m.id ? 'bg-blue-50 border-2 border-blue-400' : 'bg-gray-50 border-2 border-transparent'}`}
                    >
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-semibold ${aiModel === m.id ? 'text-blue-700' : 'text-gray-800'}`}>{m.label}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.badgeColor}`}>{m.badge}</span>
                        {aiModel === m.id && <span className="text-blue-500 font-bold text-sm">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-gray-500">创意度（Temperature）</label>
                  <span className="text-sm font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg">{aiTemperature}</span>
                </div>
                <input
                  type="range" min="0.1" max="1.5" step="0.05"
                  value={aiTemperature}
                  onChange={(e: any) => setAiTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>保守 0.1</span><span>均衡 0.85</span><span>创意 1.5</span>
                </div>
              </div>
            </>
          )}

          {/* ── API Tab ── */}
          {panelTab === 'api' && (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-3">🔑 API 配置</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1.5 block">API Key</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e: any) => setAiApiKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium mb-1.5 block">API Base URL（可选）</label>
                    <input
                      value={aiApiBase}
                      onChange={(e: any) => setAiApiBase(e.target.value)}
                      placeholder="https://api.deepseek.com/v1"
                      className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-3.5">
                <div className="text-xs font-bold text-amber-700 mb-1.5">🔒 安全说明</div>
                <div className="space-y-1 text-[11px] text-amber-600 leading-relaxed">
                  <div>• API Key 仅存储在本地浏览器，不上传服务器</div>
                  <div>• 支持 DeepSeek、OpenAI 及兼容接口</div>
                  <div>• 自定义 Base URL 可接入中转 API</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 底部保存按钮 */}
        <div className="px-5 pb-6 pt-2 flex-shrink-0 border-t border-gray-100">
          <button
            onClick={saveAll}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-black rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
          >
            💾 保存设置
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  if (!msg) return null
  const isSuccess = msg.startsWith('✅')
  const isWarning = msg.startsWith('⚠️')
  const isError = msg.startsWith('❌')
  return (
    <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-sm whitespace-nowrap animate-bounce-in flex items-center gap-2 ${isSuccess ? 'bg-green-500/95' : isWarning ? 'bg-amber-500/95' : isError ? 'bg-red-500/95' : 'bg-gray-900/90'}`}>
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
  const [copyHistory, setCopyHistory] = useState<any[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Materials
  const [matTab, setMatTab] = useState<MatTab>('hotspot')
  const [aiTopics, setAiTopics] = useState<Topic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [savedTopics, setSavedTopics] = useState<string[]>([])
  // 选题库升级状态
  const [topicFilter, setTopicFilter] = useState<'all' | 'saved' | 'ai'>('all')
  const [topicSearch, setTopicSearch] = useState('')
  const [batchCount, setBatchCount] = useState(8)
  const [topicCategories] = useState(['全部', '干货教程', '热点借势', '情感共鸣', '产品种草', '故事叙事', '问答互动'])
  const [selectedCategory, setSelectedCategory] = useState('全部')
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
  // 视频数据记录（每条视频的发布数据）
  const [videoRecords, setVideoRecords] = useState<any[]>([])
  const [showVideoRecord, setShowVideoRecord] = useState(false)
  const [recordingVideo, setRecordingVideo] = useState<any>(null)
  // 快速录入面板（从视频页跳转过来时使用）
  const [quickRecordData, setQuickRecordData] = useState<any>(null)
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { id: '1', time: '今天 18:30', title: '端午节限定套餐来了！', status: '待发布', platform: '抖音' },
    { id: '2', time: '明天 12:00', title: '开面馆3年踩过的坑', status: '草稿', platform: '抖音' },
    { id: '3', time: '后天 19:00', title: '顾客感动故事', status: '计划中', platform: '小红书' },
  ])
  const [insights, setInsights] = useState<any[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  // 平台数据状态
  const [platformStats, setPlatformStats] = useState<any>({
    fans: [1200, 1350, 1480, 1620, 1750, 1890, 2050],
    plays: [3200, 5800, 4100, 8900, 6200, 11000, 7800],
    likes: [180, 320, 240, 560, 380, 720, 450],
    comments: [45, 88, 62, 145, 98, 210, 120],
    collects: [92, 165, 118, 280, 195, 380, 240],
    totalFans: 2050,
    totalPlays: 47000,
    avgEngagement: 8.4,
    weeklyPosts: 3,
    lastSync: null,
    platform: '抖音',
  })
  const [statsRange, setStatsRange] = useState<'7d' | '30d'>('7d')
  const [showDataBind, setShowDataBind] = useState(false)
  const [dataBindTab, setDataBindTab] = useState<'manual' | 'import'>('manual')
  const [manualFans, setManualFans] = useState('')
  const [manualPlays, setManualPlays] = useState('')
  const [manualLikes, setManualLikes] = useState('')
  const [statsLoading, setStatsLoading] = useState(false)
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
  // 多段口播状态
  const [videoSegments, setVideoSegments] = useState<any[]>([])
  const [segmentMode, setSegmentMode] = useState(false)
  const [activeSegment, setActiveSegment] = useState(0)
  const [segmentAudios, setSegmentAudios] = useState<Record<number, string>>({})
  const [segmentLoading, setSegmentLoading] = useState<Record<number, boolean>>({})
  // 字幕预览状态
  const [subtitlePreview, setSubtitlePreview] = useState(false)
  const [subtitleLines, setSubtitleLines] = useState<string[]>([])
  const [currentSubLine, setCurrentSubLine] = useState(0)

  // Profile / AI Settings
  const [aiModel, setAiModel] = useState('deepseek-chat')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiApiBase, setAiApiBase] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState('')
  const [aiTemperature, setAiTemperature] = useState(0.85)
  // 全局 AI 快捷面板
  const [showAiPanel, setShowAiPanel] = useState(false)
  // 各模块专属提示词
  const [modulePrompts, setModulePrompts] = useState<Record<string, string>>({
    topics: '',
    copy: '',
    video: '',
    radar: '',
    positioning: '',
  })
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
      const mp = localStorage.getItem('contentos_module_prompts'); if (mp) setModulePrompts(JSON.parse(mp))
      const vr = localStorage.getItem('contentos_video_records'); if (vr) setVideoRecords(JSON.parse(vr))
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
          positioning: acc.positioning, targetAudience: acc.targetAudience,
          modulePrompt: modulePrompts['copy'] || '',
          aiModel, aiApiKey, aiApiBase, aiTemperature
        })
      })
      const data = await res.json()
      if (data.versions) {
        setCopyVersions(data.versions)
        setContentStep(3)
        const histItem = { id: Date.now().toString(), topic: selectedTopic, style: copyStyle, versions: data.versions, createdAt: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }), tokens: data.tokens || 0 }
        setCopyHistory((prev: any[]) => [histItem, ...prev].slice(0, 20))
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

  async function generateTopics(count?: number, category?: string) {
    setTopicsLoading(true)
    try {
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positioning: acc.positioning, industry: acc.industry, accountName: acc.name,
          count: count || batchCount,
          category: category && category !== '全部' ? category : undefined,
          modulePrompt: modulePrompts['topics'] || '',
          aiModel, aiApiKey, aiApiBase, aiTemperature
        })
      })
      const data = await res.json()
      if (data.topics) {
        setAiTopics(prev => count ? [...data.topics, ...prev] : data.topics)
        showToast(`✅ 已生成 ${data.topics.length} 个选题`)
      } else showToast('生成失败，请重试')
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
        body: JSON.stringify({
          industry: acc.industry,
          modulePrompt: modulePrompts['radar'] || '',
          aiModel, aiApiKey, aiApiBase
        })
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

  async function scrapeCreator(sort = 'likes', count = 20) {
    if (!creatorUrl.trim()) { showToast('请输入博主链接'); return }
    setCreatorLoading(true)
    try {
      const res = await fetch('/api/scrape-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: creatorUrl, count, sort })
      })
      const data = await res.json()
      if (data.creator) {
        setCreatorData(data)
        const updated = [
          { ...data.creator, videos: data.videos, analysis: data.analysis, summary: data.summary, url: creatorUrl, addedAt: new Date().toISOString() },
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

  // 获取平台数据（AI 生成真实感数据 + 预留真实 API 接口）
  async function fetchPlatformStats() {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/platform-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformStats.platform,
          industry: acc.industry,
          positioning: acc.positioning,
          currentFans: platformStats.totalFans,
        })
      })
      const data = await res.json()
      if (data.stats) {
        setPlatformStats((prev: any) => ({ ...prev, ...data.stats, lastSync: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }))
        showToast('✅ 数据已更新')
      }
    } catch {
      showToast('数据获取失败，请重试')
    } finally {
      setStatsLoading(false)
    }
  }

  // 手动更新数据
  function updateManualStats() {
    const fans = parseInt(manualFans) || platformStats.totalFans
    const plays = parseInt(manualPlays) || platformStats.totalPlays
    const likes = parseInt(manualLikes) || platformStats.likes[platformStats.likes.length - 1]
    // 生成趋势数据（基于当前值反推7天趋势）
    const genTrend = (current: number, variance: number) =>
      Array.from({ length: 7 }, (_, i) => Math.max(0, Math.round(current * (0.7 + i * 0.05) + (Math.random() - 0.5) * variance)))
    setPlatformStats((prev: any) => ({
      ...prev,
      totalFans: fans,
      totalPlays: plays,
      fans: genTrend(fans, fans * 0.05),
      plays: genTrend(plays / 7, plays * 0.1),
      likes: genTrend(likes, likes * 0.3),
      lastSync: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }))
    setManualFans('')
    setManualPlays('')
    setManualLikes('')
    setShowDataBind(false)
    showToast('✅ 数据已更新')
  }

  async function fetchInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          views: '12.3万', likes: '2341', comments: '186', collects: '892',
          industry: acc.industry, accountName: acc.name,
          modulePrompt: modulePrompts['operations'] || '',
          aiModel, aiApiKey, aiApiBase
        })
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
        body: JSON.stringify({
          industry: posIndustry, product: posProduct, targetCustomer: posCustomer,
          city: posCity, advantage: posAdvantage,
          modulePrompt: modulePrompts['positioning'] || '',
          aiModel, aiApiKey, aiApiBase
        })
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

  // 保存视频数据记录
  function saveVideoRecord(record: any) {
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      accountId: acc.id,
      accountName: acc.name,
    }
    const updated = [newRecord, ...videoRecords]
    setVideoRecords(updated)
    saveToLocal('contentos_video_records', updated)
    // 同步更新 platformStats（累加数据）
    setPlatformStats((prev: any) => {
      const addVal = (arr: number[], add: number) => [...arr.slice(1), (arr[arr.length - 1] || 0) + add]
      const p = parseInt(record.plays) || 0
      const l = parseInt(record.likes) || 0
      const c = parseInt(record.comments) || 0
      const col = parseInt(record.collects) || 0
      return {
        ...prev,
        plays: addVal(prev.plays, p),
        likes: addVal(prev.likes, l),
        comments: addVal(prev.comments, c),
        collects: addVal(prev.collects, col),
        totalPlays: prev.totalPlays + p,
        weeklyPosts: prev.weeklyPosts + 1,
        lastSync: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      }
    })
    showToast('✅ 数据已录入，图表已更新')
    setShowVideoRecord(false)
    setRecordingVideo(null)
    setQuickRecordData(null)
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
      {/* 全局 AI 快捷面板 */}
      <AiQuickPanel
        tab={tab}
        show={showAiPanel}
        onClose={() => setShowAiPanel(false)}
        aiModel={aiModel} setAiModel={setAiModel}
        aiApiKey={aiApiKey} setAiApiKey={setAiApiKey}
        aiApiBase={aiApiBase} setAiApiBase={setAiApiBase}
        aiTemperature={aiTemperature} setAiTemperature={setAiTemperature}
        modulePrompts={modulePrompts} setModulePrompts={setModulePrompts}
        saveToLocal={saveToLocal} showToast={showToast}
      />
      <div key={tab} className="flex-1 overflow-hidden flex flex-col page-enter">
        {tab === 'dashboard' && (
          <Dashboard
                acc={acc} accounts={accounts} accountIdx={accountIdx}
                setAccountIdx={setAccountIdx} setTab={setTab} setMatTab={setMatTab} showToast={showToast}
                user={user} onLogout={handleLogout} savedContents={savedContents}
                schedule={schedule} onPositioning={() => setShowPositioning(true)}
                showAddAccount={showAddAccount} setShowAddAccount={setShowAddAccount}
                newAccName={newAccName} setNewAccName={setNewAccName}
                newAccIndustry={newAccIndustry} setNewAccIndustry={setNewAccIndustry}
                newAccEmoji={newAccEmoji} setNewAccEmoji={setNewAccEmoji}
                addAccount={addAccount}
                hotspots={HOTSPOTS}
                radarData={radarData} fetchRadar={fetchRadar} radarLoading={radarLoading}
                savedTopics={savedTopics}
                setShowAiPanel={setShowAiPanel}
              />
            )}
        {tab === 'materials' && (
          <Materials
                acc={acc} matTab={matTab} setMatTab={setMatTab}
                hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading}
                generateTopics={generateTopics}
                topicFilter={topicFilter} setTopicFilter={setTopicFilter}
                topicSearch={topicSearch} setTopicSearch={setTopicSearch}
                batchCount={batchCount} setBatchCount={setBatchCount}
                topicCategories={topicCategories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                useTopic={(t: string) => { setSelectedTopic(t); setTab('content'); setContentStep(2) }}
                savedContents={savedContents} savedTopics={savedTopics} saveTopic={saveTopic}
                creatorUrl={creatorUrl} setCreatorUrl={setCreatorUrl}
                creatorLoading={creatorLoading} creatorData={creatorData}
                setCreatorData={setCreatorData} trackedCreators={trackedCreators}
                setTrackedCreators={setTrackedCreators}
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
                saveToLocal={saveToLocal}
                setTab={setTab}
                setVideoCopy={setVideoCopy}
                setShowAiPanel={setShowAiPanel}
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
            copyHistory={copyHistory} compareMode={compareMode} setCompareMode={setCompareMode}
            showHistory={showHistory} setShowHistory={setShowHistory}
            setShowAiPanel={setShowAiPanel}
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
            setShowAiPanel={setShowAiPanel}
            setQuickRecordData={setQuickRecordData}
            setShowVideoRecord={setShowVideoRecord}
            videoSegments={videoSegments} setVideoSegments={setVideoSegments}
            segmentMode={segmentMode} setSegmentMode={setSegmentMode}
            activeSegment={activeSegment} setActiveSegment={setActiveSegment}
            segmentAudios={segmentAudios} setSegmentAudios={setSegmentAudios}
            segmentLoading={segmentLoading} setSegmentLoading={setSegmentLoading}
            subtitlePreview={subtitlePreview} setSubtitlePreview={setSubtitlePreview}
            subtitleLines={subtitleLines} setSubtitleLines={setSubtitleLines}
            currentSubLine={currentSubLine} setCurrentSubLine={setCurrentSubLine}
          />
        )}
        {tab === 'operations' && (
          <Operations
            acc={acc} opsTab={opsTab} setOpsTab={setOpsTab}
            schedule={schedule} setSchedule={setSchedule}
            savedContents={savedContents} showToast={showToast}
            insights={insights} insightsLoading={insightsLoading}
            fetchInsights={fetchInsights}
            platformStats={platformStats} setPlatformStats={setPlatformStats}
            statsRange={statsRange} setStatsRange={setStatsRange}
            showDataBind={showDataBind} setShowDataBind={setShowDataBind}
            dataBindTab={dataBindTab} setDataBindTab={setDataBindTab}
            manualFans={manualFans} setManualFans={setManualFans}
            manualPlays={manualPlays} setManualPlays={setManualPlays}
            manualLikes={manualLikes} setManualLikes={setManualLikes}
            statsLoading={statsLoading} fetchPlatformStats={fetchPlatformStats}
            updateManualStats={updateManualStats}
            showAddSchedule={showAddSchedule} setShowAddSchedule={setShowAddSchedule}
            newScheduleTitle={newScheduleTitle} setNewScheduleTitle={setNewScheduleTitle}
            newSchedulePlatform={newSchedulePlatform} setNewSchedulePlatform={setNewSchedulePlatform}
            addScheduleItem={addScheduleItem}
            setShowAiPanel={setShowAiPanel}
            videoRecords={videoRecords}
            showVideoRecord={showVideoRecord} setShowVideoRecord={setShowVideoRecord}
            recordingVideo={recordingVideo} setRecordingVideo={setRecordingVideo}
            quickRecordData={quickRecordData} setQuickRecordData={setQuickRecordData}
            saveVideoRecord={saveVideoRecord}
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
          <button key={t.id} onClick={() => setTab(t.id as Tab)} className="flex-1 flex flex-col items-center gap-0.5 py-1 tab-transition">
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
// ═══════════════════════════════════════════════════════════
// DASHBOARD v2 — 工作台首页（每日任务+快捷入口+数据概览）
// ═══════════════════════════════════════════════════════════
function Dashboard({ acc, accounts, accountIdx, setAccountIdx, setTab, setMatTab, showToast, user, onLogout, savedContents, schedule, onPositioning, showAddAccount, setShowAddAccount, newAccName, setNewAccName, newAccIndustry, setNewAccIndustry, newAccEmoji, setNewAccEmoji, addAccount, hotspots, radarData, fetchRadar, radarLoading, savedTopics, setShowAiPanel }: any) {
  const EMOJIS = ['🏪', '🍜', '💪', '💄', '📚', '🏠', '🚗', '🎵', '🌿', '☕']

  // 今日任务清单（基于账号状态动态生成）
  const todayTasks = React.useMemo(() => {
    const tasks = []
    const today = new Date().toDateString()
    const todaySchedule = schedule.filter((s: any) => {
      const d = new Date(s.time || s.date || '')
      return d.toDateString() === today
    })

    if (acc.positioning === '待完善') {
      tasks.push({ id: 'positioning', icon: '🎯', label: '完善账号定位', desc: '生成专属定位方案', priority: 'high', action: 'positioning' })
    }
    if (todaySchedule.length > 0) {
      todaySchedule.forEach((s: any) => {
        tasks.push({ id: s.id, icon: '📤', label: `发布：${s.title}`, desc: `${s.platform} · ${s.time}`, priority: 'high', action: 'operations' })
      })
    }
    if (savedContents.length === 0) {
      tasks.push({ id: 'copy', icon: '✍️', label: '生成今日文案', desc: '选择选题，AI 一键生成', priority: 'medium', action: 'content' })
    } else {
      tasks.push({ id: 'copy2', icon: '✍️', label: '继续创作文案', desc: `已有 ${savedContents.length} 条，继续生产`, priority: 'low', action: 'content' })
    }
    if (!radarData) {
      tasks.push({ id: 'radar', icon: '📡', label: '获取今日情报', desc: '热点 · 爆款形式 · 关键词', priority: 'medium', action: 'radar' })
    }
    tasks.push({ id: 'topic', icon: '💡', label: '生成今日选题', desc: '基于账号定位的高完播率选题', priority: 'low', action: 'topics' })

    return tasks.slice(0, 5)
  }, [acc, schedule, savedContents, radarData])

  const completedCount = todayTasks.filter((t: any) => t.priority === 'low').length
  const totalCount = todayTasks.length

  function handleTaskAction(action: string) {
    if (action === 'positioning') { onPositioning(); return }
    if (action === 'operations') { setTab('operations'); return }
    if (action === 'content') { setTab('content'); return }
    if (action === 'radar') { setTab('materials'); setMatTab('radar'); fetchRadar?.(); return }
    if (action === 'topics') { setTab('materials'); setMatTab('topics'); return }
  }

  // 数据概览（模拟数据，后续接真实数据）
  const stats = [
    { label: '已保存文案', value: savedContents.length, unit: '条', icon: '📝', color: 'from-blue-400 to-cyan-400', trend: '+2' },
    { label: '本周排期', value: schedule.filter((s: any) => {
      const d = new Date(s.time || s.date || '')
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      return d >= weekStart
    }).length, unit: '条', icon: '📅', color: 'from-purple-400 to-pink-400', trend: '' },
    { label: '收藏选题', value: savedTopics?.length || 0, unit: '个', icon: '💡', color: 'from-orange-400 to-amber-400', trend: '' },
    { label: '管理账号', value: accounts.length, unit: '个', icon: '📱', color: 'from-green-400 to-emerald-400', trend: '' },
  ]

  const QUICK_ACTIONS = [
    { icon: '✍️', label: '写文案', desc: 'AI 生成', color: 'from-blue-500 to-cyan-400', tab: 'content' },
    { icon: '📡', label: '看情报', desc: '今日热点', color: 'from-orange-400 to-amber-400', tab: 'materials', matTab: 'radar' },
    { icon: '🎯', label: '追博主', desc: '竞品分析', color: 'from-green-400 to-emerald-500', tab: 'materials', matTab: 'creator' },
    { icon: '🎬', label: '做视频', desc: 'TTS合成', color: 'from-purple-500 to-pink-400', tab: 'video' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end rounded-[50px] overflow-hidden">
          <div className="w-full bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">添加新账号</h3>
              <button onClick={() => setShowAddAccount(false)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            <div className="space-y-3">
              <input value={newAccName} onChange={e => setNewAccName(e.target.value)} placeholder="账号名称（如：美食探店号）" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              <input value={newAccIndustry} onChange={e => setNewAccIndustry(e.target.value)} placeholder="行业（如：餐饮、美妆、教育）" className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
              <div>
                <div className="text-xs text-gray-400 mb-2">选择图标</div>
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setNewAccEmoji(e)} className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${newAccEmoji === e ? 'bg-blue-100 scale-110 ring-2 ring-blue-400' : 'bg-gray-100'}`}>{e}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddAccount(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm">取消</button>
                <button onClick={addAccount} className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-2xl text-sm">添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        {/* 顶部问候 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 font-medium">
              {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <h1 className="text-xl font-black text-gray-900">
              {new Date().getHours() < 12 ? '早上好 ☀️' : new Date().getHours() < 18 ? '下午好 🌤️' : '晚上好 🌙'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* AI 快捷设置按钮 */}
            <button
              onClick={() => setShowAiPanel(true)}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform relative"
            >
              🤖
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </button>
            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-lg active:scale-95 transition-transform"
            >
              {user?.id === 'guest' ? '👤' : (user?.email?.[0]?.toUpperCase() || '👋')}
            </button>
          </div>
        </div>

        {/* 账号切换 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {accounts.map((a: any, i: number) => (
            <button
              key={a.id}
              onClick={() => setAccountIdx(i)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${i === accountIdx ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-600 shadow-sm'}`}
            >
              <span>{a.emoji}</span><span>{a.name}</span>
            </button>
          ))}
          <button
            onClick={() => setShowAddAccount(true)}
            className="flex-shrink-0 w-8 h-8 rounded-2xl bg-white shadow-sm flex items-center justify-center text-gray-400 text-lg active:scale-95 transition-transform"
          >+</button>
        </div>
      </div>

      {/* 滚动内容区 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">

        {/* 数据概览 */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3.5 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{s.icon}</span>
                {s.trend && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">{s.trend} 今日</span>}
              </div>
              <div className="text-2xl font-black">{s.value}<span className="text-sm font-medium ml-0.5 opacity-80">{s.unit}</span></div>
              <div className="text-white/70 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 快捷入口 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="font-bold text-gray-900 text-sm mb-3">⚡ 快捷入口</div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  setTab(a.tab)
                  if (a.matTab) setMatTab(a.matTab)
                }}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center text-xl shadow-sm`}>
                  {a.icon}
                </div>
                <div className="text-[10px] font-bold text-gray-700">{a.label}</div>
                <div className="text-[9px] text-gray-400">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 今日任务清单 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-gray-900 text-sm">📋 今日任务</div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{completedCount}/{totalCount}</span>
            </div>
          </div>
          <div className="space-y-2">
            {todayTasks.map((task: any) => (
              <button
                key={task.id}
                onClick={() => handleTaskAction(task.action)}
                className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${task.priority === 'high' ? 'bg-red-50' : task.priority === 'medium' ? 'bg-orange-50' : 'bg-green-50'}`}>
                  {task.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800">{task.label}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{task.desc}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.priority === 'high' && <span className="text-[9px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded-full font-bold">紧急</span>}
                  {task.priority === 'medium' && <span className="text-[9px] text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded-full font-bold">今日</span>}
                  <span className="text-gray-300 text-xs">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 今日热点预览 */}
        {hotspots && hotspots.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-gray-900 text-sm">🔥 今日热点</div>
              <button
                onClick={() => { setTab('materials'); setMatTab('hotspot') }}
                className="text-xs text-blue-500 font-medium"
              >查看全部 →</button>
            </div>
            <div className="space-y-2">
              {hotspots.slice(0, 3).map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-xs font-black w-5 text-center flex-shrink-0 ${i === 0 ? 'text-red-400' : i === 1 ? 'text-orange-400' : 'text-amber-400'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{h.title}</div>
                  </div>
                  {h.heat && <span className="text-[10px] text-red-400 font-bold flex-shrink-0">{h.heat}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 近期排期 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-gray-900 text-sm">📅 近期排期</div>
            <button onClick={() => setTab('operations')} className="text-xs text-blue-500 font-medium">管理 →</button>
          </div>
          {schedule.length === 0 ? (
            <div className="text-center py-3">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-xs text-gray-400">暂无排期，去运营中心添加</div>
              <button onClick={() => setTab('operations')} className="mt-2 text-xs text-blue-500 font-medium bg-blue-50 px-3 py-1 rounded-full">+ 添加排期</button>
            </div>
          ) : (
            <div className="space-y-2">
              {schedule.slice(0, 3).map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-400' : s.status === '已发布' ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{s.title}</div>
                    <div className="text-[10px] text-gray-400">{s.time} · {s.platform}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 已保存文案预览 */}
        {savedContents.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-gray-900 text-sm">💾 最近文案</div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{savedContents.length} 条</span>
            </div>
            {savedContents.slice(0, 2).map((c: any) => (
              <div key={c.id} className="py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full font-medium">{c.style}</span>
                  <span className="text-[10px] text-gray-300">{new Date(c.createdAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                </div>
                <div className="text-xs font-medium text-gray-800 truncate">{c.topic}</div>
                <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{c.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* 账号定位 CTA */}
        {acc.positioning === '待完善' && (
          <button onClick={onPositioning} className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-4 text-white text-left shadow-md active:scale-[0.98] transition-transform">
            <div className="font-bold text-sm mb-0.5">✨ 还没有账号定位？</div>
            <div className="text-white/70 text-xs">AI 帮你分析行业，生成专属定位方案 →</div>
          </button>
        )}
      </div>
    </div>
  )
}


function Materials({ acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, topicFilter, setTopicFilter, topicSearch, setTopicSearch, batchCount, setBatchCount, topicCategories, selectedCategory, setSelectedCategory, useTopic, savedContents, savedTopics, saveTopic, creatorUrl, setCreatorUrl, creatorLoading, creatorData, setCreatorData, trackedCreators, setTrackedCreators, scrapeCreator, showToast, radarData, radarLoading, fetchRadar, styleTemplates, styleLoading, styleUrl, setStyleUrl, styleName, setStyleName, styleText, setStyleText, analyzeStyle, applyTemplate, deleteTemplate, saveToLocal, setTab, setVideoCopy, setShowAiPanel }: any) {
  const TABS = [
    { id: 'hotspot', label: '🔥 热点' },
    { id: 'topics', label: '💡 选题库' },
    { id: 'radar', label: '📡 情报' },
    { id: 'creator', label: '🎯 博主' },
    { id: 'style', label: '🎨 风格' },
  ]

  // 博主追踪本地状态
  const [creatorSort, setCreatorSort] = React.useState<'likes' | 'comments' | 'collects'>('likes')
  const [creatorCount, setCreatorCount] = React.useState(20)
  const [expandedVideo, setExpandedVideo] = React.useState<number | null>(null)
  const [selectedCreator, setSelectedCreator] = React.useState<any>(null)
  const [radarTab, setRadarTab] = React.useState<'hotspot' | 'format' | 'keyword' | 'insight'>('hotspot')

  const TAG_COLORS: Record<string, string> = {
    '社会': 'bg-red-50 text-red-500',
    '娱乐': 'bg-pink-50 text-pink-500',
    '行业': 'bg-blue-50 text-blue-500',
    '节日': 'bg-orange-50 text-orange-500',
    '科技': 'bg-purple-50 text-purple-500',
    '生活': 'bg-green-50 text-green-500',
  }

  const TREND_ICONS: Record<string, string> = {
    '上升': '↑',
    '稳定': '→',
    '下降': '↓',
  }
  const TREND_COLORS: Record<string, string> = {
    '上升': 'text-red-500',
    '稳定': 'text-gray-400',
    '下降': 'text-blue-400',
  }

  const PLATFORM_ICONS: Record<string, string> = {
    'douyin': '🎵',
    'xiaohongshu': '📕',
    'bilibili': '📺',
    'kuaishou': '⚡',
  }

  function removeTrackedCreator(url: string) {
    const updated = trackedCreators.filter((c: any) => c.url !== url)
    setTrackedCreators(updated)
    saveToLocal('contentos_creators', updated)
    if (selectedCreator?.url === url) {
      setSelectedCreator(null)
      setCreatorData(null)
    }
    showToast('已移除追踪')
  }

  function useScript(script: string, title: string) {
    setVideoCopy(script)
    setTab('content')
    showToast('✅ 文案已导入内容中心')
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-12 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">素材中心</h1>
          <button
            onClick={() => setShowAiPanel(true)}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform relative"
          >
            🤖
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </button>
        </div>
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

        {/* ── 热点 Tab ── */}
        {matTab === 'hotspot' && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3 mt-1">今日热点 · 点击直接使用</p>
            {hotspots.map((h: any, i: number) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => useTopic(h.title)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-amber-400' : 'bg-gray-300'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{h.title}</div>
                  {h.desc && <div className="text-xs text-gray-400 mt-0.5 truncate">{h.desc}</div>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {h.heat && <span className="text-xs text-red-400 font-bold">{h.heat}</span>}
                  <span className="text-gray-300 text-xs">→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 选题库 Tab ── */}
        {matTab === 'topics' && (
          <div className="space-y-3 mt-1">
            {/* 搜索栏 */}
            <div className="bg-white rounded-2xl px-3 py-2.5 shadow-sm flex items-center gap-2">
              <span className="text-gray-400 text-sm">🔍</span>
              <input
                value={topicSearch}
                onChange={(e: any) => setTopicSearch(e.target.value)}
                placeholder="搜索选题..."
                className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-300"
              />
              {topicSearch && (
                <button onClick={() => setTopicSearch('')} className="text-gray-300 text-sm">✕</button>
              )}
            </div>

            {/* 分类筛选 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {topicCategories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-gray-500 shadow-sm'}`}
                >{cat}</button>
              ))}
            </div>

            {/* 操作栏 */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm flex-1">
                {[{id:'all',label:'全部'},{id:'ai',label:'AI生成'},{id:'saved',label:'已收藏'}].map((f: any) => (
                  <button
                    key={f.id}
                    onClick={() => setTopicFilter(f.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${topicFilter === f.id ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
                  >{f.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-white rounded-xl px-2 py-1.5 shadow-sm">
                <span className="text-xs text-gray-400">批量</span>
                <select
                  value={batchCount}
                  onChange={(e: any) => setBatchCount(parseInt(e.target.value))}
                  className="text-xs font-bold text-gray-700 outline-none bg-transparent"
                >
                  {[5,8,12,20].map(n => <option key={n} value={n}>{n}个</option>)}
                </select>
              </div>
            </div>

            {/* 生成按钮组 */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => generateTopics(batchCount, selectedCategory)}
                disabled={topicsLoading}
                className="py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-sm font-bold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md"
              >
                {topicsLoading ? '🤔 生成中...' : '✨ AI 生成选题'}
              </button>
              <button
                onClick={() => generateTopics(batchCount, selectedCategory)}
                disabled={topicsLoading || aiTopics.length === 0}
                className="py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white text-sm font-bold rounded-2xl disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md"
              >
                {topicsLoading ? '...' : '➕ 追加更多'}
              </button>
            </div>

            {topicsLoading && (
              <div className="space-y-3 animate-fade-in">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm" style={{animationDelay: `${i*0.1}s`}}>
                    <div className="skeleton h-4 w-3/4 rounded-lg mb-3" />
                    <div className="skeleton h-3 w-full rounded-lg mb-2" />
                    <div className="skeleton h-3 w-2/3 rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {/* 空状态 */}
            {!topicsLoading && aiTopics.length === 0 && savedTopics.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm animate-fade-in-up">
                <div className="text-5xl mb-3 animate-float">💡</div>
                <div className="font-black text-gray-800 text-base mb-1">选题库空空如也</div>
                <div className="text-xs text-gray-400 leading-relaxed mb-4">
                  点击上方按钮<br />AI 为你生成专属爆款选题
                </div>
                <div className="flex justify-center gap-4 text-xs text-gray-400">
                  <span>🎯 精准定向</span>
                  <span>🔥 热点结合</span>
                  <span>📈 高转化</span>
                </div>
              </div>
            )}

            {/* AI 生成选题列表 */}
            {(() => {
              const allTopics = [
                ...(topicFilter !== 'saved' ? aiTopics : []),
                ...(topicFilter !== 'ai' ? savedTopics.map((t: any) => ({ title: typeof t === 'string' ? t : t.title, isSaved: true })) : [])
              ]
              const filtered = allTopics.filter((t: any) => {
                const title = typeof t === 'string' ? t : (t.title || '')
                const matchSearch = !topicSearch || title.toLowerCase().includes(topicSearch.toLowerCase())
                const matchCat = selectedCategory === '全部' || (t.category === selectedCategory)
                return matchSearch && matchCat
              })
              if (filtered.length === 0 && (aiTopics.length > 0 || savedTopics.length > 0)) {
                return (
                  <div className="text-center py-6">
                    <div className="text-2xl mb-2">🔍</div>
                    <p className="text-xs text-gray-400">没有找到匹配的选题</p>
                  </div>
                )
              }
              return (
                <div className="space-y-2">
                  {filtered.map((t: any, i: number) => {
                    const title = typeof t === 'string' ? t : (t.title || t)
                    const isSaved = savedTopics.some((s: any) => (typeof s === 'string' ? s : s.title) === title)
                    return (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-fade-in-up" style={{animationDelay:`${i*30}ms`}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-800 leading-snug">{title}</div>
                            {t.category && t.category !== '全部' && (
                              <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block">{t.category}</span>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => saveTopic(t)}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition-all ${isSaved ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}
                            >{isSaved ? '⭐' : '☆'}</button>
                            <button
                              onClick={() => useTopic(title)}
                              className="text-xs text-white font-semibold px-2.5 py-0.5 bg-blue-500 rounded-lg active:scale-95 transition-transform"
                            >写文案</button>
                          </div>
                        </div>
                        {t.reason && <div className="text-xs text-gray-400 leading-relaxed mb-1.5">{t.reason}</div>}
                        {t.hook && <div className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">💡 {t.hook}</div>}
                        {/* 快速操作 */}
                        <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-50">
                          <button
                            onClick={() => { useTopic(title); }}
                            className="flex-1 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-bold rounded-xl active:scale-[0.97] transition-transform"
                          >✍️ 一键写文案</button>
                          <button
                            onClick={() => {
                              const videoTitle = title
                              setVideoCopy(videoTitle)
                              setTab('video')
                              showToast('✅ 已跳转视频生成')
                            }}
                            className="flex-1 py-1.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white text-xs font-bold rounded-xl active:scale-[0.97] transition-transform"
                          >🎬 直接做视频</button>
                        </div>
                      </div>
                    )
                  })}
                  {/* 底部统计 */}
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400">共 {filtered.length} 个选题 · AI生成 {aiTopics.length} · 已收藏 {savedTopics.length}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

                {/* ── 情报雷达 Tab ── */}
        {matTab === 'radar' && (
          <div className="mt-1">
            {!radarData ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
                <div className="text-5xl mb-4">📡</div>
                <div className="font-black text-gray-800 text-base mb-1">内容情报雷达</div>
                <div className="text-xs text-gray-400 mb-2 leading-relaxed">
                  每日热点 · 爆款形式 · 关键词热度<br />
                  <span className="text-blue-400 font-medium">基于 {acc.industry} 行业定制分析</span>
                </div>
                <div className="flex justify-center gap-4 mb-5 text-xs text-gray-400">
                  <span>🔥 8个热点</span>
                  <span>🎬 5种形式</span>
                  <span>🏷️ 12个关键词</span>
                </div>
                <button
                  onClick={fetchRadar}
                  disabled={radarLoading}
                  className="px-8 py-3 bg-gradient-to-r from-orange-400 to-amber-400 text-white text-sm font-bold rounded-2xl disabled:opacity-60 active:scale-[0.97] transition-transform shadow-md"
                >
                  {radarLoading ? '📡 获取中...' : '📡 获取今日情报'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 顶部信息栏 */}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    📅 {radarData.updateTime || '今日'} · {acc.industry}行业
                  </div>
                  <button
                    onClick={fetchRadar}
                    disabled={radarLoading}
                    className="text-xs text-orange-500 font-bold bg-orange-50 px-3 py-1 rounded-full active:scale-95 transition-transform"
                  >
                    {radarLoading ? '刷新中...' : '🔄 刷新'}
                  </button>
                </div>

                {/* 子Tab切换 */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {[
                    { id: 'hotspot', label: '🔥 热点' },
                    { id: 'format', label: '🎬 形式' },
                    { id: 'keyword', label: '🏷️ 关键词' },
                    { id: 'insight', label: '💡 洞察' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setRadarTab(t.id as any)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${radarTab === t.id ? 'bg-orange-400 text-white' : 'bg-white text-gray-500 shadow-sm'}`}
                    >{t.label}</button>
                  ))}
                </div>

                {/* 热点列表 */}
                {radarTab === 'hotspot' && (
                  <div className="space-y-2">
                    {radarData.hotspots?.map((h: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 ${i < 3 ? 'bg-red-400' : 'bg-gray-300'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-bold text-gray-900">{h.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TAG_COLORS[h.tag] || 'bg-gray-100 text-gray-500'}`}>{h.tag}</span>
                            </div>
                            {h.desc && <div className="text-xs text-gray-400 mb-1.5">{h.desc}</div>}
                            {/* 热度条 */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${i < 3 ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-blue-300 to-cyan-300'}`}
                                  style={{ width: `${h.heat || 70}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-500 flex-shrink-0">{h.heat}</span>
                            </div>
                          </div>
                        </div>
                        {h.canBorrow && h.borrowTip && (
                          <div className="mt-2 flex items-center gap-1.5 bg-orange-50 rounded-xl px-3 py-1.5">
                            <span className="text-orange-400 text-xs">💡</span>
                            <span className="text-xs text-orange-600 font-medium">{h.borrowTip}</span>
                            <button
                              onClick={() => useTopic(h.title)}
                              className="ml-auto text-[10px] text-white bg-orange-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                            >用</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 爆款形式 */}
                {radarTab === 'format' && (
                  <div className="space-y-2">
                    {radarData.formats?.map((f: any, i: number) => (
                      <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : i === 2 ? 'bg-amber-400' : 'bg-gray-300'}`}>{i + 1}</span>
                            <span className="font-bold text-gray-900 text-sm">{f.format}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${f.difficulty === '简单' ? 'bg-green-50 text-green-500' : f.difficulty === '中等' ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-400'}`}>{f.difficulty}</span>
                            <span className="text-xs font-bold text-orange-500">{f.heat}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-300 rounded-full"
                            style={{ width: `${f.heat || 70}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mb-1">{f.desc}</div>
                        {f.example && (
                          <div className="text-xs text-blue-500 bg-blue-50 px-2.5 py-1.5 rounded-xl">
                            📌 {f.example}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 关键词热度 */}
                {radarTab === 'keyword' && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="font-bold text-gray-900 text-sm mb-3">🏷️ 热门关键词</div>
                    <div className="space-y-2.5">
                      {radarData.keywords?.map((k: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-semibold text-gray-800">{k.word}</span>
                                {k.category && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{k.category}</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs font-bold ${TREND_COLORS[k.trend] || 'text-gray-400'}`}>
                                  {TREND_ICONS[k.trend] || '→'}
                                </span>
                                <span className="text-xs font-bold text-gray-600">{k.heat}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${k.trend === '上升' ? 'bg-gradient-to-r from-red-400 to-orange-300' : k.trend === '下降' ? 'bg-gradient-to-r from-blue-300 to-cyan-200' : 'bg-gradient-to-r from-gray-300 to-gray-200'}`}
                                style={{ width: `${k.heat || 60}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 词云标签 */}
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <div className="text-xs text-gray-400 mb-2">快速复制关键词</div>
                      <div className="flex flex-wrap gap-1.5">
                        {radarData.keywords?.map((k: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => { navigator.clipboard?.writeText(k.word); showToast(`已复制：${k.word}`) }}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium active:scale-95 transition-transform ${i < 3 ? 'bg-red-50 text-red-500' : i < 6 ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}
                          >{k.word}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI 洞察 */}
                {radarTab === 'insight' && (
                  <div className="space-y-3">
                    {/* 核心洞察 */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="font-bold text-gray-900 text-sm mb-3">💡 今日创作洞察</div>
                      {radarData.insights?.map((insight: string, i: number) => (
                        <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                          <div className={`w-6 h-6 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-purple-400' : 'bg-green-400'}`}>{i + 1}</div>
                          <div className="text-xs text-gray-700 leading-relaxed flex-1">{insight}</div>
                        </div>
                      ))}
                    </div>
                    {/* 推荐选题 */}
                    {radarData.bestTopics && (
                      <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="font-bold text-gray-900 text-sm mb-3">🎯 今日推荐选题</div>
                        {radarData.bestTopics.map((t: any, i: number) => (
                          <div key={i} className="py-2.5 border-b border-gray-50 last:border-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-800 flex-1">{t.title}</span>
                              <button
                                onClick={() => useTopic(t.title)}
                                className="text-[10px] text-white bg-blue-500 px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                              >用</button>
                            </div>
                            {t.reason && <div className="text-xs text-gray-400 mb-1">{t.reason}</div>}
                            {t.hook && <div className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">💡 {t.hook}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── 博主追踪 Tab ── */}
        {matTab === 'creator' && (
          <div className="mt-1 space-y-3">
            {/* 搜索框 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔍 追踪新博主</div>
              <input
                value={creatorUrl}
                onChange={e => setCreatorUrl(e.target.value)}
                placeholder="粘贴抖音/小红书博主主页链接..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none mb-2"
              />
              {/* 排序和数量 */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <div className="text-[10px] text-gray-400 mb-1">排序方式</div>
                  <div className="flex gap-1">
                    {[
                      { id: 'likes', label: '👍 点赞' },
                      { id: 'comments', label: '💬 评论' },
                      { id: 'collects', label: '⭐ 收藏' },
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setCreatorSort(s.id as any)}
                        className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold transition-all ${creatorSort === s.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-[10px] text-gray-400 mb-1">抓取数量</div>
                  <div className="flex gap-1">
                    {[20, 50].map(n => (
                      <button
                        key={n}
                        onClick={() => setCreatorCount(n)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${creatorCount === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                      >{n}条</button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => scrapeCreator(creatorSort, creatorCount)}
                disabled={creatorLoading}
                className="w-full py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-bold rounded-xl disabled:opacity-60 active:scale-[0.98] transition-transform shadow-md"
              >
                {creatorLoading ? '🔍 分析中...' : '🎯 开始追踪分析'}
              </button>
            </div>

            {/* 博主追踪加载骨架屏 */}
            {creatorLoading && (
              <div className="space-y-3 animate-fade-in">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="skeleton h-4 w-1/2 rounded-lg mb-3" />
                  <div className="flex gap-3 mb-3">
                    {[1,2,3].map((i: number) => <div key={i} className="skeleton h-12 flex-1 rounded-xl" />)}
                  </div>
                  <div className="skeleton h-3 w-full rounded-lg mb-2" />
                  <div className="skeleton h-3 w-4/5 rounded-lg" />
                </div>
                {[1,2,3].map((i: number) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex gap-3">
                      <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
                      <div className="flex-1">
                        <div className="skeleton h-3 w-3/4 rounded-lg mb-2" />
                        <div className="skeleton h-3 w-1/2 rounded-lg mb-2" />
                        <div className="skeleton h-3 w-2/3 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 已追踪博主列表 */}
            {trackedCreators.length > 0 && !creatorData && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-3">📌 已追踪博主 ({trackedCreators.length})</div>
                <div className="space-y-2">
                  {trackedCreators.map((c: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-xl px-1 transition-colors"
                      onClick={() => { setCreatorData({ creator: c, videos: c.videos, analysis: c.analysis, summary: c.summary }); setSelectedCreator(c) }}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-base font-black flex-shrink-0">
                        {PLATFORM_ICONS[c.platform] || '🎵'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-800">{c.name || '博主'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {c.followers} · {c.videos?.length || 0}条视频 · {new Date(c.addedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}更新
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-blue-500 font-medium">查看</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeTrackedCreator(c.url) }}
                          className="text-gray-300 text-sm w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-400 transition-colors"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 博主详情 */}
            {creatorData && (
              <div className="space-y-3">
                {/* 返回按钮 */}
                <button
                  onClick={() => { setCreatorData(null); setSelectedCreator(null); setExpandedVideo(null) }}
                  className="flex items-center gap-1.5 text-xs text-gray-500 font-medium"
                >
                  ← 返回列表
                </button>

                {/* 博主信息卡 */}
                <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl p-4 text-white shadow-lg">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                      {PLATFORM_ICONS[creatorData.creator?.platform] || '🎵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base">{creatorData.creator?.name}</div>
                      <div className="text-white/70 text-xs mt-0.5">{creatorData.creator?.positioning}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{creatorData.creator?.industry}</span>
                        {creatorData.creator?.tags?.slice(0, 2).map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* 数据统计 */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: '粉丝', value: creatorData.creator?.followers },
                      { label: '总点赞', value: creatorData.creator?.totalLikes },
                      { label: '均点赞', value: creatorData.creator?.avgLikes?.toLocaleString() },
                      { label: '更新', value: creatorData.creator?.updateFreq?.replace('每周', '') || '稳定' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/20 rounded-xl p-2 text-center">
                        <div className="text-xs font-black">{s.value}</div>
                        <div className="text-[10px] text-white/60 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 分析报告 */}
                {creatorData.analysis && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="font-bold text-gray-900 text-sm mb-3">📊 爆款规律分析</div>
                    <div className="space-y-2 mb-3">
                      {creatorData.analysis.topPatterns?.map((p: string, i: number) => (
                        <div key={i} className="flex gap-2 items-start">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : 'bg-blue-400'}`}>{i + 1}</span>
                          <span className="text-xs text-gray-700 leading-relaxed">{p}</span>
                        </div>
                      ))}
                    </div>
                    {/* 内容类型分布 */}
                    {creatorData.analysis.contentRatio && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <div className="text-xs text-gray-500 font-medium mb-2">内容类型分布</div>
                        <div className="space-y-1.5">
                          {Object.entries(creatorData.analysis.contentRatio).map(([type, pct]: [string, any]) => (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-16 flex-shrink-0">{type}</span>
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-gray-500 w-8 text-right">{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 钩子类型 */}
                    {creatorData.analysis.hookTypes && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 font-medium mb-1.5">常用钩子类型</div>
                        <div className="flex flex-wrap gap-1.5">
                          {creatorData.analysis.hookTypes.map((h: string, i: number) => (
                            <span key={i} className="text-xs bg-orange-50 text-orange-500 px-2 py-0.5 rounded-full font-medium">{h}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 核心建议 */}
                    {creatorData.analysis.recommendation && (
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="text-xs text-blue-500 font-medium mb-1">💡 借鉴建议</div>
                        <div className="text-xs text-blue-700 leading-relaxed">{creatorData.analysis.recommendation}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 视频列表 */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-900 text-sm">🎬 视频列表</div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{creatorData.videos?.length || 0} 条</span>
                  </div>
                  <div className="space-y-2">
                    {creatorData.videos?.map((v: any, i: number) => (
                      <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                        {/* 视频头部 */}
                        <div
                          className="flex items-start gap-3 p-3 cursor-pointer active:bg-gray-50 transition-colors"
                          onClick={() => setExpandedVideo(expandedVideo === i ? null : i)}
                        >
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i < 3 ? 'bg-red-400' : 'bg-gray-300'}`}>
                            {v.rank || i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-gray-800 mb-1">{v.title}</div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400">
                              <span>👍 {v.likes?.toLocaleString()}</span>
                              <span>💬 {v.comments?.toLocaleString()}</span>
                              <span>⭐ {v.collects?.toLocaleString()}</span>
                              <span className="ml-auto">{v.duration}</span>
                            </div>
                            {v.hook && (
                              <div className="text-[10px] text-orange-500 mt-1 truncate">💡 {v.hook}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${v.type === '干货分享' ? 'bg-blue-50 text-blue-400' : v.type === '情感共鸣' ? 'bg-pink-50 text-pink-400' : v.type === '产品展示' ? 'bg-green-50 text-green-400' : 'bg-gray-100 text-gray-400'}`}>{v.type}</span>
                            <span className="text-gray-300 text-xs">{expandedVideo === i ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {/* 展开内容 */}
                        {expandedVideo === i && (
                          <div className="px-3 pb-3 border-t border-gray-50">
                            {/* 标签 */}
                            {v.tags && (
                              <div className="flex flex-wrap gap-1 py-2">
                                {v.tags.map((tag: string, ti: number) => (
                                  <span key={ti} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                                <span className="text-[10px] text-gray-400 ml-1">{v.publishDate}</span>
                              </div>
                            )}
                            {/* 完整文案 */}
                            {v.script && (
                              <div className="bg-gray-50 rounded-xl p-3 mb-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] text-gray-400 font-medium">完整口播文案</span>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => { navigator.clipboard?.writeText(v.script); showToast('✅ 文案已复制') }}
                                      className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-lg"
                                    >复制</button>
                                    <button
                                      onClick={() => useScript(v.script, v.title)}
                                      className="text-[10px] text-white font-bold bg-blue-500 px-2 py-0.5 rounded-lg"
                                    >导入</button>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-700 leading-relaxed">{v.script}</div>
                              </div>
                            )}
                            {/* 爆款亮点 */}
                            {v.highlight && (
                              <div className="text-[10px] text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-xl">
                                ⭐ 爆款亮点：{v.highlight}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!creatorData && trackedCreators.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center shadow-sm animate-fade-in-up">
                <div className="text-5xl mb-4 animate-float">🎯</div>
                <div className="font-black text-gray-800 text-base mb-1">博主追踪</div>
                <div className="text-xs text-gray-400 leading-relaxed mb-4">
                  粘贴竞品博主主页链接<br />
                  AI 分析爆款规律 · 提取完整文案
                </div>
                <div className="flex justify-center gap-4 text-xs text-gray-400">
                  <span>📊 数据分析</span>
                  <span>📝 文案提取</span>
                  <span>💡 规律总结</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 风格 Tab ── */}
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


function ContentCenter({ acc, step, setStep, topic, setTopic, style, setStyle, userInput, setUserInput, versions, loading, error, copiedIdx, expandedCopy, setExpandedCopy, generate, copy, save, showToast, setTab, hotspots, savedContents, setVideoCopy, copyHistory, compareMode, setCompareMode, showHistory, setShowHistory, setShowAiPanel }: any) {
  const STYLES = ['犀利观点', '温情故事', '干货教程', '幽默搞笑', '励志正能量', '悬念钩子']
  const STYLE_COLORS: Record<string, string> = {
    '犀利观点': 'from-red-400 to-orange-400',
    '温情故事': 'from-pink-400 to-rose-400',
    '干货教程': 'from-blue-400 to-cyan-400',
    '幽默搞笑': 'from-yellow-400 to-amber-400',
    '励志正能量': 'from-green-400 to-emerald-400',
    '悬念钩子': 'from-purple-400 to-violet-400',
  }

  async function copyAll() {
    const text = versions.map((v: any, i: number) =>
      `【版本${i+1} · ${v.style}】\n钩子：${v.hook}\n\n${v.content}`
    ).join('\n\n' + '─'.repeat(20) + '\n\n')
    try { await navigator.clipboard.writeText(text); showToast('✅ 已复制全部版本') }
    catch { showToast('复制失败，请手动复制') }
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">内容中心</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(!showHistory)} className={`relative flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${showHistory ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
              🕐 历史
              {copyHistory.length > 0 && <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center ${showHistory ? 'bg-white text-blue-500' : 'bg-red-400 text-white'}`}>{copyHistory.length > 9 ? '9+' : copyHistory.length}</span>}
            </button>
            <button
              onClick={() => setShowAiPanel(true)}
              className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform relative"
            >
              🤖
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {['选题', '配置', '文案'].map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <button onClick={() => { if (i + 1 < step) setStep(i + 1 as any) }} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-green-400 text-white' : step === i + 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>{step > i + 1 ? '✓' : i + 1}</button>
              <span className={`text-xs font-medium ${step === i + 1 ? 'text-blue-500' : step > i + 1 ? 'text-green-500' : 'text-gray-400'}`}>{s}</span>
              {i < 2 && <div className={`w-6 h-px ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {showHistory && (
        <div className="absolute inset-0 bg-black/40 z-40 flex flex-col rounded-[50px] overflow-hidden" onClick={() => setShowHistory(false)}>
          <div className="flex-1" />
          <div className="bg-white rounded-t-3xl p-5 pb-8 max-h-[75%] flex flex-col" onClick={(e: any) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="font-black text-gray-900">生成历史</h3><p className="text-xs text-gray-400 mt-0.5">最近 {copyHistory.length} 条记录</p></div>
              <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {copyHistory.length === 0 ? (
                <div className="text-center py-10 animate-fade-in-up">
                  <div className="text-4xl mb-3 animate-float">📝</div>
                  <div className="font-bold text-gray-700 text-sm mb-1">还没有生成记录</div>
                  <div className="text-xs text-gray-400">生成文案后自动保存到这里</div>
                </div>
              ) : copyHistory.map((h: any) => (
                <div key={h.id} className="bg-gray-50 rounded-2xl p-3 cursor-pointer active:bg-gray-100 transition-colors" onClick={() => { setTopic(h.topic); setStyle(h.style); setStep(3); setShowHistory(false); showToast('✅ 已恢复历史记录') }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="text-sm font-semibold text-gray-800 leading-snug flex-1">{h.topic}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium flex-shrink-0 bg-gradient-to-r ${STYLE_COLORS[h.style] || 'from-gray-400 to-gray-500'}`}>{h.style}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">{h.createdAt}</span>
                    <div className="flex items-center gap-2"><span className="text-[10px] text-gray-400">{h.versions?.length || 0} 个版本</span><span className="text-[10px] text-blue-400 font-semibold">恢复 →</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">✏️ 自定义选题</div>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="输入你的选题标题..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
              <button onClick={() => { if (!topic.trim()) { showToast('请输入选题'); return }; setStep(2) }} className="w-full mt-2 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl active:scale-[0.98] transition-transform">使用此选题 →</button>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🔥 热点选题（点击使用）</div>
              {hotspots.map((h: any, i: number) => (
                <div key={i} onClick={() => { setTopic(h.title); setStep(2) }} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 cursor-pointer active:bg-gray-50 rounded-xl px-1 transition-colors">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0 ${i < 3 ? 'bg-gradient-to-br from-red-400 to-orange-400' : 'bg-gradient-to-br from-orange-300 to-amber-300'}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium text-gray-800">{h.title}</div><div className="text-xs text-gray-400">{h.tag}</div></div>
                  <span className="text-xs text-blue-500 font-semibold flex-shrink-0">选用 →</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2"><div className="font-bold text-gray-900 text-sm">📌 当前选题</div><button onClick={() => setStep(1)} className="text-xs text-gray-400 active:text-gray-600">← 重选</button></div>
              <div className="text-sm text-blue-600 font-medium bg-blue-50 rounded-xl px-3 py-2.5 leading-snug">{topic}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎨 文案风格</div>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (<button key={s} onClick={() => setStyle(s)} className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${style === s ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>{s}</button>))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="text-2xl">{acc.emoji}</div>
              <div className="flex-1 min-w-0"><div className="text-xs font-bold text-gray-700">{acc.name}</div><div className="text-xs text-gray-400 truncate">{acc.positioning}</div></div>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{acc.industry}</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-2">💬 补充说明（可选）</div>
              <textarea value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="有什么特别要求？如：突出价格优惠、强调食材新鲜..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20" />
            </div>
            {error && <div className="bg-red-50 rounded-2xl p-3 flex items-start gap-2"><span className="text-red-400 text-sm flex-shrink-0">⚠️</span><p className="text-xs text-red-500">{error}</p></div>}
            <button onClick={generate} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-black rounded-2xl shadow-lg active:scale-[0.98] transition-transform disabled:opacity-60 disabled:scale-100">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>AI 生成中...</span> : '✨ 生成3个版本文案'}
            </button>
          </div>
        )}

        {step === 3 && loading && (
          <div className="space-y-3 animate-fade-in px-0">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="skeleton h-4 w-1/2 rounded-lg mb-3" />
              <div className="flex gap-2 mb-3">
                <div className="skeleton h-6 w-16 rounded-full" />
                <div className="skeleton h-6 w-12 rounded-full" />
              </div>
            </div>
            {[1,2,3].map((i: number) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="skeleton h-4 w-1/3 rounded-lg mb-3" />
                <div className="skeleton h-3 w-full rounded-lg mb-2" />
                <div className="skeleton h-3 w-full rounded-lg mb-2" />
                <div className="skeleton h-3 w-4/5 rounded-lg mb-2" />
                <div className="skeleton h-3 w-3/4 rounded-lg mb-4" />
                <div className="flex gap-2">
                  <div className="skeleton h-7 w-16 rounded-xl" />
                  <div className="skeleton h-7 w-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && !loading && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-800 truncate max-w-[160px]">{topic}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium bg-gradient-to-r ${STYLE_COLORS[style] || 'from-gray-400 to-gray-500'}`}>{style}</span>
                    <span className="text-[10px] text-gray-400">{versions.length} 个版本</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCompareMode(!compareMode)} className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-xl transition-all ${compareMode ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{compareMode ? '📊 对比中' : '📊 对比'}</button>
                  <button onClick={copyAll} className="text-[10px] font-semibold px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-500 active:scale-95">📋 全部</button>
                  <button onClick={() => setStep(2)} className="text-[10px] font-semibold px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-500">🔄 重生成</button>
                </div>
              </div>
            </div>

            {compareMode && versions.length >= 2 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-3">📊 风格对比分析</div>
                <div className="space-y-3">
                  {versions.map((v: any, i: number) => (
                    <div key={i} className="rounded-xl overflow-hidden border border-gray-100">
                      <div className={`px-3 py-2 bg-gradient-to-r ${STYLE_COLORS[v.style] || 'from-gray-400 to-gray-500'} flex items-center justify-between`}>
                        <span className="text-white text-xs font-bold">版本 {i+1} · {v.style}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/80 text-[10px]">{v.content?.length || 0}字</span>
                          <button onClick={() => copy(v.content, i)} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-lg font-semibold">{copiedIdx === i ? '✅' : '复制'}</button>
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-amber-50 border-b border-gray-100"><span className="text-[10px] text-amber-500 font-bold">🎣 钩子：</span><span className="text-xs text-amber-700">{v.hook}</span></div>
                      <div className="px-3 py-2"><p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{v.content}</p></div>
                      <div className="px-3 pb-2 flex gap-2">
                        <button onClick={() => save(v.content, v.style, v.hook)} className="text-[10px] text-blue-500 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg">保存</button>
                        <button onClick={() => { setVideoCopy(v.content); setTab('video') }} className="text-[10px] text-purple-500 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg">🎬 生成视频</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!compareMode && versions.map((v: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className={`px-4 py-3 bg-gradient-to-r ${STYLE_COLORS[v.style] || 'from-gray-400 to-gray-500'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2"><span className="text-white font-black text-sm">版本 {i + 1}</span><span className="text-white/80 text-xs">{v.style}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-[10px]">{v.content?.length || 0} 字</span>
                    <button onClick={() => copy(v.content, i)} className={`text-xs font-bold px-3 py-1 rounded-xl transition-all active:scale-95 ${copiedIdx === i ? 'bg-green-400 text-white' : 'bg-white/20 text-white'}`}>{copiedIdx === i ? '✅ 已复制' : '📋 复制'}</button>
                  </div>
                </div>
                {v.hook && (
                  <div className="mx-4 mt-3 mb-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-400 text-sm flex-shrink-0">🎣</span>
                      <div><span className="text-[10px] text-amber-500 font-bold block mb-0.5">开场钩子</span><span className="text-xs text-amber-700 leading-relaxed">{v.hook}</span></div>
                    </div>
                  </div>
                )}
                <div className="px-4 pb-3 pt-1">
                  <p className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${expandedCopy === i ? '' : 'line-clamp-4'}`}>{v.content}</p>
                  {v.content?.length > 150 && <button onClick={() => setExpandedCopy(expandedCopy === i ? null : i)} className="text-xs text-blue-400 mt-1.5 font-medium">{expandedCopy === i ? '收起 ↑' : '展开全文 ↓'}</button>}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <button onClick={() => save(v.content, v.style, v.hook)} className="text-xs text-blue-500 font-semibold bg-blue-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform">💾 保存</button>
                      <button onClick={() => { setVideoCopy(v.content); setTab('video') }} className="text-xs text-purple-500 font-semibold bg-purple-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform">🎬 生成视频</button>
                    </div>
                    <button onClick={async () => { const t = `【${v.style}】\n\n钩子：${v.hook}\n\n${v.content}`; try { await navigator.clipboard.writeText(t); showToast('✅ 已复制（含钩子）') } catch { showToast('复制失败') } }} className="text-[10px] text-gray-400 font-medium">含钩子复制</button>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="bg-white rounded-2xl p-8 shadow-sm flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin"/>
                <p className="text-sm text-gray-500 font-medium">AI 正在创作中...</p>
                <p className="text-xs text-gray-400">通常需要 5-10 秒</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// VIDEO STUDIO
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// VIDEO STUDIO v2 — 视频生成（TTS 实际可用 + 音频播放）
// ═══════════════════════════════════════════════════════════
function VideoStudio({ acc, step, setStep, copy: videoCopy, setCopy: setVideoCopy, voiceId, setVoiceId, speed, setSpeed, avatarType, setAvatarType, avatarPreset, setAvatarPreset, bgType, setBgType, bgColor, setBgColor, loading, audioB64, error, generateTTS, showToast, savedContents, setTab, setShowAiPanel, setQuickRecordData, setShowVideoRecord, videoSegments, setVideoSegments, segmentMode, setSegmentMode, activeSegment, setActiveSegment, segmentAudios, setSegmentAudios, segmentLoading, setSegmentLoading, subtitlePreview, setSubtitlePreview, subtitleLines, setSubtitleLines, currentSubLine, setCurrentSubLine }: any) {
  const VOICES = [
    { id: 'female-shaonv', label: '少女音', emoji: '👧', desc: '清甜活泼，适合生活类' },
    { id: 'female-yujie', label: '御姐音', emoji: '👩', desc: '成熟知性，适合职场类' },
    { id: 'male-qingxin', label: '清新男声', emoji: '👦', desc: '阳光自然，适合日常类' },
    { id: 'male-chunhou', label: '醇厚男声', emoji: '🧔', desc: '低沉有力，适合干货类' },
    { id: 'audiobook-male-1', label: '播音腔', emoji: '🎙️', desc: '专业标准，适合资讯类' },
  ]
  const AVATARS = [
    { id: 'business-female', label: '职场女性', emoji: '👩‍💼' },
    { id: 'business-male', label: '职场男性', emoji: '👨‍💼' },
    { id: 'casual-female', label: '休闲女生', emoji: '👩' },
    { id: 'casual-male', label: '休闲男生', emoji: '👨' },
  ]
  const BG_COLORS = [
    { color: '#1a1a2e', label: '深夜蓝' },
    { color: '#16213e', label: '星空蓝' },
    { color: '#0f3460', label: '深海蓝' },
    { color: '#533483', label: '神秘紫' },
    { color: '#2d6a4f', label: '森林绿' },
    { color: '#1b1b1b', label: '纯黑' },
  ]
  const STEPS = ['文案', '声音', '形象', '预览']
  const stepIdx = ['input', 'voice', 'avatar', 'preview'].indexOf(step)

  // 音频播放状态
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [audioProgress, setAudioProgress] = React.useState(0)
  const [audioDuration, setAudioDuration] = React.useState(0)
  const [audioCurrentTime, setAudioCurrentTime] = React.useState(0)

  // 字数统计
  const charCount = videoCopy.length
  const estimatedDuration = Math.ceil(charCount / 4) // 约每秒4字

  // 视频风格和字幕
  const [videoRatio, setVideoRatio] = React.useState<'9:16' | '16:9' | '1:1'>('9:16')
  const [subtitleStyle, setSubtitleStyle] = React.useState<'none' | 'bottom' | 'karaoke' | 'highlight'>('bottom')
  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [showOptimized, setShowOptimized] = React.useState(false)
  const [optimizedCopy, setOptimizedCopy] = React.useState('')

  const VIDEO_RATIOS = [
    { id: '9:16', label: '竖屏', icon: '📱', desc: '抖音/快手/小红书' },
    { id: '16:9', label: '横屏', icon: '🖥️', desc: 'B站/YouTube' },
    { id: '1:1', label: '方形', icon: '⬜', desc: '微信视频号' },
  ]
  const SUBTITLE_STYLES = [
    { id: 'none', label: '无字幕', icon: '🚫' },
    { id: 'bottom', label: '底部字幕', icon: '📝' },
    { id: 'karaoke', label: '卡拉OK', icon: '🎤' },
    { id: 'highlight', label: '高亮词', icon: '✨' },
  ]

  async function optimizeCopy() {
    if (!videoCopy.trim()) { showToast('请先输入文案'); return }
    setIsOptimizing(true)
    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: '优化以下口播文案',
          style: '口播优化',
          userInput: `请将以下文案优化为更适合短视频口播的版本，保持原意，让节奏更快、更口语化、开头更有钩子：

${videoCopy}`,
          accountName: acc.name, industry: acc.industry,
          positioning: acc.positioning, targetAudience: acc.targetAudience,
        })
      })
      const data = await res.json()
      if (data.versions?.[0]?.content) {
        setOptimizedCopy(data.versions[0].content)
        setShowOptimized(true)
        showToast('✅ 文案优化完成')
      } else {
        showToast('优化失败，请重试')
      }
    } catch {
      showToast('网络错误')
    } finally {
      setIsOptimizing(false)
    }
  }

  // 初始化音频
  React.useEffect(() => {
    if (audioB64) {
      const audio = new Audio(`data:audio/mp3;base64,${audioB64}`)
      audioRef.current = audio
      audio.onloadedmetadata = () => setAudioDuration(audio.duration)
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime)
        setAudioProgress(audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0)
      }
      audio.onended = () => { setIsPlaying(false); setAudioProgress(0); setAudioCurrentTime(0) }
    }
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [audioB64])

  function togglePlay() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // 多段口播：将文案按句子分割
  function splitToSegments(text: string) {
    const sentences = text.split(/(?<=[。！？.!?])\s*/).filter(s => s.trim())
    const segs = sentences.map((s, i) => ({
      id: i,
      text: s.trim(),
      voice: voiceId || 'female-shaonv',
      speed: speed || 1.0,
      pause: 0.5, // 段间停顿秒数
    }))
    setVideoSegments(segs)
    setSegmentMode(true)
    setActiveSegment(0)
  }

  // 生成字幕行
  function generateSubtitleLines(text: string) {
    const charsPerLine = 14
    const lines: string[] = []
    let i = 0
    while (i < text.length) {
      lines.push(text.slice(i, i + charsPerLine))
      i += charsPerLine
    }
    setSubtitleLines(lines)
    setSubtitlePreview(true)
    setCurrentSubLine(0)
    // 模拟字幕滚动
    let lineIdx = 0
    const interval = setInterval(() => {
      lineIdx++
      if (lineIdx >= lines.length) { clearInterval(interval); return }
      setCurrentSubLine(lineIdx)
    }, 2000)
  }

  // 导出字幕 SRT 文件
  function exportSRT(text: string) {
    const charsPerLine = 14
    const secPerLine = 2
    let srt = ''
    let i = 0, idx = 1
    while (i < text.length) {
      const line = text.slice(i, i + charsPerLine)
      const start = (idx - 1) * secPerLine
      const end = idx * secPerLine
      const fmt = (s: number) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0')
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
        const sec = Math.floor(s % 60).toString().padStart(2, '0')
        return `${h}:${m}:${sec},000`
      }
      srt += `${idx}
${fmt(start)} --> ${fmt(end)}
${line}

`
      i += charsPerLine
      idx++
    }
    const blob = new Blob([srt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `subtitle_${Date.now()}.srt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full bg-[#F2F2F7]">
      <div className="px-5 pt-12 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">视频生成</h1>
          <button
            onClick={() => setShowAiPanel(true)}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform relative"
          >
            🤖
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </button>
        </div>
        {/* 步骤条 */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <button
                onClick={() => {
                  const steps = ['input', 'voice', 'avatar', 'preview']
                  if (i <= stepIdx || (i === 1 && videoCopy.trim()) || (i === 2 && audioB64) || (i === 3 && audioB64)) {
                    setStep(steps[i])
                  }
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepIdx > i ? 'bg-green-400 text-white' : stepIdx === i ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {stepIdx > i ? '✓' : i + 1}
              </button>
              <span className={`text-xs font-medium ${stepIdx === i ? 'text-purple-500' : stepIdx > i ? 'text-green-500' : 'text-gray-400'}`}>{s}</span>
              {i < 3 && <div className={`w-4 h-px ${stepIdx > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4 space-y-3">

        {/* ── Step 1: 文案输入 ── */}
        {step === 'input' && (
          <>
            {/* 从已保存文案选择 */}
            {savedContents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-2">📂 从已保存文案选择</div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-hide">
                  {savedContents.slice(0, 5).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setVideoCopy(c.content)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${videoCopy === c.content ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 border-2 border-transparent'}`}
                    >
                      <div className="font-medium text-gray-800 truncate">{c.topic}</div>
                      <div className="text-gray-400 truncate mt-0.5">{c.content.slice(0, 50)}...</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 文案输入框 */}
            {/* 文案输入卡片 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-900 text-sm">✍️ 口播文案</div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${charCount > 500 ? 'text-red-400' : charCount > 200 ? 'text-orange-400' : 'text-gray-400'}`}>{charCount} 字</span>
                  {charCount > 0 && <span className="text-xs text-gray-400">≈ {estimatedDuration}秒</span>}
                </div>
              </div>
              <textarea
                value={videoCopy}
                onChange={e => setVideoCopy(e.target.value)}
                placeholder="输入或粘贴口播文案（建议 100-300 字，约 30-75 秒）..."
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-32 leading-relaxed"
              />
              {/* 字数建议 */}
              <div className="flex gap-2 mt-2 mb-3">
                {[
                  { label: '30秒', chars: '~120字', ok: charCount >= 80 && charCount <= 160 },
                  { label: '60秒', chars: '~240字', ok: charCount >= 160 && charCount <= 320 },
                  { label: '90秒', chars: '~360字', ok: charCount >= 320 && charCount <= 440 },
                ].map((t, i) => (
                  <div key={i} className={`flex-1 text-center py-1.5 rounded-xl text-[10px] font-medium ${t.ok ? 'bg-purple-50 text-purple-500 border border-purple-200' : 'bg-gray-50 text-gray-400'}`}>
                    <div className="font-bold">{t.label}</div>
                    <div>{t.chars}</div>
                  </div>
                ))}
              </div>
              {/* AI 优化按钮 */}
              <button
                onClick={optimizeCopy}
                disabled={isOptimizing || !videoCopy.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-purple-400 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOptimizing ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI 优化中...</>
                ) : '✨ AI 一键优化文案'}
              </button>
            </div>

            {/* AI 优化结果 */}
            {showOptimized && optimizedCopy && (
              <div className="bg-violet-50 rounded-2xl p-4 border border-violet-200 animate-fade-in-up">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-violet-700">✨ AI 优化版本</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVideoCopy(optimizedCopy); setShowOptimized(false); showToast('✅ 已应用优化版本') }}
                      className="text-[10px] font-bold text-white bg-violet-500 px-2.5 py-1 rounded-lg active:scale-95"
                    >应用</button>
                    <button
                      onClick={() => setShowOptimized(false)}
                      className="text-[10px] font-medium text-violet-400 px-2 py-1 rounded-lg"
                    >忽略</button>
                  </div>
                </div>
                <p className="text-xs text-violet-700 leading-relaxed line-clamp-4">{optimizedCopy}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-violet-400">{optimizedCopy.length} 字</span>
                  <span className="text-[10px] text-violet-400">≈ {Math.ceil(optimizedCopy.length / 4)} 秒</span>
                </div>
              </div>
            )}

            {/* 多段口播 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">🎙️ 多段口播</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{segmentMode ? `${videoSegments.length} 段` : '单段模式'}</span>
                  <button
                    onClick={() => {
                      if (!segmentMode) {
                        if (!videoCopy.trim()) { showToast('请先输入文案'); return }
                        splitToSegments(videoCopy)
                      } else {
                        setSegmentMode(false)
                        setVideoSegments([])
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 ${segmentMode ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-500'}`}
                  >{segmentMode ? '退出分段' : '开启分段'}</button>
                </div>
              </div>

              {!segmentMode ? (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-500 leading-relaxed">
                    💡 开启多段模式后，文案将按句子自动分割，每段可独立设置声音和语速，适合制作有节奏感的口播视频
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {videoSegments.map((seg: any, i: number) => (
                    <div
                      key={seg.id}
                      onClick={() => setActiveSegment(i)}
                      className={`rounded-xl p-3 cursor-pointer transition-all ${activeSegment === i ? 'bg-purple-50 border-2 border-purple-300' : 'bg-gray-50 border-2 border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${activeSegment === i ? 'bg-purple-500 text-white' : 'bg-gray-300 text-white'}`}>{i+1}</span>
                          <span className="text-xs text-gray-400">{seg.text.length} 字 · ≈{Math.ceil(seg.text.length/4)}秒</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {segmentAudios[i] && <span className="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">✅ 已合成</span>}
                          {segmentLoading[i] && <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">合成中...</span>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 leading-relaxed line-clamp-2">{seg.text}</div>
                      {activeSegment === i && (
                        <div className="mt-2 pt-2 border-t border-purple-100 flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">停顿</span>
                          <input
                            type="range" min="0" max="2" step="0.5"
                            value={seg.pause}
                            onChange={(e: any) => {
                              const updated = [...videoSegments]
                              updated[i] = { ...updated[i], pause: parseFloat(e.target.value) }
                              setVideoSegments(updated)
                            }}
                            className="flex-1 h-1 accent-purple-500"
                          />
                          <span className="text-[10px] text-purple-500 font-bold">{seg.pause}s</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-center pt-1">
                    <span className="text-xs text-gray-400">总时长 ≈ {videoSegments.reduce((acc: number, s: any) => acc + Math.ceil(s.text.length/4) + s.pause, 0).toFixed(0)} 秒</span>
                  </div>
                </div>
              )}
            </div>

            {/* 视频比例选择 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📐 视频比例</div>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_RATIOS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setVideoRatio(r.id as any)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all active:scale-[0.97] ${videoRatio === r.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                  >
                    <span className="text-xl">{r.icon}</span>
                    <span className={`text-xs font-bold ${videoRatio === r.id ? 'text-purple-700' : 'text-gray-700'}`}>{r.label}</span>
                    <span className="text-[9px] text-gray-400 text-center leading-tight">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字幕样式 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">💬 字幕样式</div>
              <div className="grid grid-cols-2 gap-2">
                {SUBTITLE_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSubtitleStyle(s.id as any)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all active:scale-[0.97] ${subtitleStyle === s.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                  >
                    <span className="text-lg">{s.icon}</span>
                    <span className={`text-xs font-semibold ${subtitleStyle === s.id ? 'text-purple-700' : 'text-gray-700'}`}>{s.label}</span>
                    {subtitleStyle === s.id && <span className="ml-auto text-purple-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { if (!videoCopy.trim()) { showToast('请先输入文案'); return }; setStep('voice') }}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
            >
              下一步：选择声音 →
            </button>
          </>
        )}

        {/* ── Step 2: 声音选择 ── */}
        {step === 'voice' && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎙️ 选择声音</div>
              <div className="space-y-2">
                {VOICES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVoiceId(v.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${voiceId === v.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                  >
                    <span className="text-2xl flex-shrink-0">{v.emoji}</span>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-bold ${voiceId === v.id ? 'text-purple-700' : 'text-gray-800'}`}>{v.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{v.desc}</div>
                    </div>
                    {voiceId === v.id && <span className="text-purple-500 font-bold flex-shrink-0">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 语速调节 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-gray-900 text-sm">⚡ 语速</div>
                <span className="text-sm font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-lg">{speed}x</span>
              </div>
              <input
                type="range" min="0.5" max="2.0" step="0.1"
                value={speed}
                onChange={e => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>慢 0.5x</span><span>正常 1.0x</span><span>快 2.0x</span>
              </div>
            </div>

            {/* 文案预览 */}
            <div className="bg-gray-50 rounded-2xl p-3">
              <div className="text-xs text-gray-400 mb-1">文案预览（{charCount}字 · 预计{Math.ceil(estimatedDuration / speed)}秒）</div>
              <div className="text-xs text-gray-600 leading-relaxed line-clamp-3">{videoCopy}</div>
            </div>

            {error && (
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
                <div className="text-xs text-red-600 leading-relaxed">{error}</div>
              </div>
            )}

            {/* 多段口播合成提示 */}
            {segmentMode && videoSegments.length > 0 && (
              <div className="bg-purple-50 rounded-2xl p-3 border border-purple-100">
                <div className="text-xs text-purple-700 font-semibold mb-1">🎙️ 多段口播模式</div>
                <div className="text-xs text-purple-600 leading-relaxed mb-2">
                  共 {videoSegments.length} 段，点击下方按钮将合成整段音频（各段间自动添加停顿）
                </div>
                <div className="flex flex-wrap gap-1">
                  {videoSegments.map((seg: any, i: number) => (
                    <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${segmentAudios[i] ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-500'}`}>
                      段{i+1} {segmentAudios[i] ? '✅' : '⏳'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={generateTTS}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {segmentMode ? `合成中 (${videoSegments.length}段)...` : '合成中...'}
                </span>
              ) : segmentMode ? `🎙️ 合成 ${videoSegments.length} 段语音` : '🎙️ 合成语音'}
            </button>
            <button onClick={() => setStep('input')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}

        {/* ── Step 3: 形象选择 ── */}
        {step === 'avatar' && (
          <>
            {/* 语音合成成功提示 + 播放器 */}
            {audioB64 && (
              <div className="bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🎙️</span>
                  <div>
                    <div className="font-bold text-sm">语音合成成功</div>
                    <div className="text-white/70 text-xs">{VOICES.find(v => v.id === voiceId)?.label} · {speed}x · {audioDuration > 0 ? formatTime(audioDuration) : `≈${Math.ceil(estimatedDuration / speed)}秒`}</div>
                  </div>
                </div>
                {/* 播放器 */}
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-purple-500 font-bold text-sm active:scale-95 transition-transform flex-shrink-0"
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>
                    <div className="flex-1">
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer"
                        onClick={e => {
                          if (!audioRef.current) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = (e.clientX - rect.left) / rect.width
                          audioRef.current.currentTime = pct * audioRef.current.duration
                        }}
                      >
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                      </div>
                    </div>
                    <span className="text-white/80 text-xs flex-shrink-0">
                      {formatTime(audioCurrentTime)} / {audioDuration > 0 ? formatTime(audioDuration) : '--:--'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎭 选择形象</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setAvatarType('preset'); setAvatarPreset(a.id) }}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${avatarPreset === a.id && avatarType === 'preset' ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <span className={`text-xs font-semibold ${avatarPreset === a.id && avatarType === 'preset' ? 'text-purple-700' : 'text-gray-700'}`}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 背景颜色 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎨 背景颜色</div>
              <div className="grid grid-cols-3 gap-2">
                {BG_COLORS.map(bg => (
                  <button
                    key={bg.color}
                    onClick={() => setBgColor(bg.color)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${bgColor === bg.color ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
                  >
                    <div className="w-full h-10 rounded-xl" style={{ backgroundColor: bg.color }} />
                    <span className="text-[10px] text-gray-500 font-medium">{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep('preview')}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
            >
              下一步：预览 →
            </button>
            <button onClick={() => setStep('voice')} className="w-full py-2 text-sm text-gray-400">← 返回</button>
          </>
        )}

        {/* ── Step 4: 预览 ── */}
        {step === 'preview' && (
          <>
            {/* 视频预览框 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">🎬 视频预览</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{videoRatio}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{SUBTITLE_STYLES.find(s => s.id === subtitleStyle)?.label}</span>
                </div>
              </div>
              <div
                className={`rounded-2xl overflow-hidden flex flex-col items-center justify-center relative mx-auto ${videoRatio === '9:16' ? 'aspect-[9/16] max-w-[160px]' : videoRatio === '16:9' ? 'aspect-[16/9] w-full' : 'aspect-square max-w-[200px]'}`}
                style={{ backgroundColor: bgColor }}
              >
                {/* 背景装饰 */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-8 left-8 w-20 h-20 rounded-full bg-white/20" />
                  <div className="absolute bottom-16 right-6 w-12 h-12 rounded-full bg-white/20" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/5" />
                </div>
                {/* 顶部信息栏 */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px]">
                      {acc?.emoji || '🏪'}
                    </div>
                    <span className="text-white/70 text-[8px] font-medium">{acc?.name || '我的账号'}</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                </div>
                {/* 形象 */}
                <div className="text-6xl mb-3 relative z-10 animate-float">
                  {AVATARS.find(a => a.id === avatarPreset)?.emoji || '👤'}
                </div>
                {/* 字幕区域 */}
                {subtitleStyle !== 'none' && (
                  <div className={`absolute bottom-8 left-3 right-3 z-10 ${subtitleStyle === 'karaoke' ? 'text-center' : subtitleStyle === 'highlight' ? 'text-center' : 'text-center'}`}>
                    {subtitleStyle === 'karaoke' && (
                      <div className="bg-black/60 rounded-lg px-2 py-1">
                        <span className="text-yellow-300 text-[9px] font-bold">{videoCopy.slice(0, 20)}</span>
                        <span className="text-white/60 text-[9px]">{videoCopy.slice(20, 35)}</span>
                      </div>
                    )}
                    {subtitleStyle === 'bottom' && (
                      <div className="bg-black/60 rounded-lg px-2 py-1">
                        <span className="text-white text-[9px] leading-relaxed">{videoCopy.slice(0, 30)}...</span>
                      </div>
                    )}
                    {subtitleStyle === 'highlight' && (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {videoCopy.slice(0, 20).split('').map((c: string, i: number) => (
                          <span key={i} className={`text-[9px] font-bold ${i < 5 ? 'text-yellow-300' : 'text-white'}`}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* 音频播放器（预览页） */}
                {audioB64 && (
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <button
                          onClick={togglePlay}
                          className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-purple-500 text-xs font-bold active:scale-95 transition-transform flex-shrink-0"
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>
                        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
                          onClick={e => {
                            if (!audioRef.current) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const pct = (e.clientX - rect.left) / rect.width
                            audioRef.current.currentTime = pct * audioRef.current.duration
                          }}
                        >
                          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${audioProgress}%` }} />
                        </div>
                        <span className="text-white/80 text-[10px] flex-shrink-0">{formatTime(audioCurrentTime)}</span>
                      </div>
                      <div className="text-white/70 text-[10px] text-center">
                        🎙️ {VOICES.find(v => v.id === voiceId)?.label} · {speed}x
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 配置摘要 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📋 配置摘要</div>
              <div className="space-y-2">
                {[
                  ['文案字数', `${charCount} 字`],
                  ['声音', VOICES.find(v => v.id === voiceId)?.label || voiceId],
                  ['语速', `${speed}x`],
                  ['形象', AVATARS.find(a => a.id === avatarPreset)?.label || '自定义'],
                  ['视频比例', videoRatio],
                  ['字幕样式', SUBTITLE_STYLES.find(s => s.id === subtitleStyle)?.label || '无'],
                  ['语音状态', audioB64 ? '✅ 已合成' : '⏳ 未合成'],
                  ['预计时长', `≈ ${Math.ceil(estimatedDuration / speed)} 秒`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400">{k}</span>
                    <span className="font-medium text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 下载音频按钮（实际可用） */}
            {audioB64 && (
              <button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = `data:audio/mp3;base64,${audioB64}`
                  link.download = `contentos_audio_${Date.now()}.mp3`
                  link.click()
                  showToast('✅ 音频下载中...')
                }}
                className="w-full py-3.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
              >
                ⬇️ 下载音频 MP3
              </button>
            )}

            {/* 字幕预览 & 导出 */}
            {subtitleStyle !== 'none' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 text-sm">💬 字幕预览</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateSubtitleLines(videoCopy)}
                      className="text-xs text-blue-500 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl active:scale-95 transition-transform"
                    >▶ 预览</button>
                    <button
                      onClick={() => exportSRT(videoCopy)}
                      className="text-xs text-green-600 font-semibold bg-green-50 px-2.5 py-1 rounded-xl active:scale-95 transition-transform"
                    >⬇ 导出SRT</button>
                  </div>
                </div>
                {subtitlePreview && subtitleLines.length > 0 ? (
                  <div
                    className="rounded-2xl overflow-hidden flex items-end justify-center relative mx-auto"
                    style={{ backgroundColor: bgColor, height: '120px', maxWidth: '200px' }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/20 text-3xl">🎬</span>
                    </div>
                    {subtitleStyle === 'bottom' && (
                      <div className="absolute bottom-3 left-2 right-2 text-center">
                        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg font-medium">
                          {subtitleLines[currentSubLine] || ''}
                        </span>
                      </div>
                    )}
                    {subtitleStyle === 'karaoke' && (
                      <div className="absolute bottom-3 left-2 right-2 text-center">
                        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg font-medium">
                          {subtitleLines.slice(Math.max(0, currentSubLine-1), currentSubLine+2).map((l, i) => (
                            <span key={i} className={i === (currentSubLine > 0 ? 1 : 0) ? 'text-yellow-300' : 'text-white/60'}>{l} </span>
                          ))}
                        </span>
                      </div>
                    )}
                    {subtitleStyle === 'highlight' && (
                      <div className="absolute bottom-3 left-2 right-2 text-center">
                        <span className="bg-yellow-400/90 text-gray-900 text-xs px-2 py-1 rounded-lg font-bold">
                          {subtitleLines[currentSubLine] || ''}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 text-[9px] text-white/50">{currentSubLine+1}/{subtitleLines.length}</div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-400">点击「预览」查看字幕效果</div>
                    <div className="text-[10px] text-gray-300 mt-1">当前样式：{subtitleStyle === 'bottom' ? '底部字幕' : subtitleStyle === 'karaoke' ? '卡拉OK' : '高亮词'}</div>
                  </div>
                )}
              </div>
            )}

            {/* 一键导出面板 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📦 一键导出</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '导出文案 TXT', icon: '📄', action: () => {
                    const blob = new Blob([videoCopy], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = `copy_${Date.now()}.txt`; a.click()
                    URL.revokeObjectURL(url)
                    showToast('✅ 文案已导出')
                  }},
                  { label: '导出字幕 SRT', icon: '💬', action: () => exportSRT(videoCopy) },
                  { label: '复制文案', icon: '📋', action: () => {
                    navigator.clipboard.writeText(videoCopy).then(() => showToast('✅ 文案已复制'))
                  }},
                  { label: '下载音频', icon: '🎵', action: () => {
                    if (!audioB64) { showToast('请先合成语音'); return }
                    const link = document.createElement('a')
                    link.href = `data:audio/mp3;base64,${audioB64}`
                    link.download = `audio_${Date.now()}.mp3`
                    link.click()
                    showToast('✅ 音频下载中...')
                  }},
                ].map((item: any) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 active:scale-[0.97] transition-transform hover:bg-gray-100"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* MiniMax 视频生成 */}
            <VideoGeneratePanel videoCopy={videoCopy} showToast={showToast} videoRatio={videoRatio} subtitleStyle={subtitleStyle} />
            {/* 操作按钮组 */}
            <div className="grid grid-cols-2 gap-2">
              {/* 录入发布数据 */}
              <button
                onClick={() => {
                  if (setQuickRecordData) {
                    setQuickRecordData({
                      title: videoCopy.slice(0, 30) + (videoCopy.length > 30 ? '...' : ''),
                      copy: videoCopy,
                      voice: voiceId,
                      platform: acc?.platform || '抖音',
                      publishedAt: new Date().toLocaleDateString('zh-CN'),
                    })
                    setShowVideoRecord(true)
                    setTab('operations')
                    showToast('✅ 跳转到运营中心录入数据')
                  }
                }}
                className="py-3.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                📊 录入数据
              </button>
              {/* 加入排期 */}
              <button
                onClick={() => {
                  setTab('operations')
                  showToast('✅ 已跳转到运营中心，可添加排期')
                }}
                className="py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                📅 加入排期
              </button>
            </div>
            <button onClick={() => setStep('input')} className="w-full py-2 text-sm text-gray-400">← 重新开始</button>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// VIDEO GENERATE PANEL — MiniMax 视频合成面板
// ═══════════════════════════════════════════════════════════
function VideoGeneratePanel({ videoCopy, showToast, videoRatio, subtitleStyle }: any) {
  const [videoPrompt, setVideoPrompt] = React.useState('')
  const [videoTaskId, setVideoTaskId] = React.useState('')
  const [videoStatus, setVideoStatus] = React.useState<'idle' | 'generating' | 'polling' | 'done' | 'error' | 'demo'>('idle')
  const [videoUrl, setVideoUrl] = React.useState('')
  const [videoError, setVideoError] = React.useState('')
  const [pollCount, setPollCount] = React.useState(0)
  const pollRef = React.useRef<any>(null)
  const [selectedStyle, setSelectedStyle] = React.useState('realistic')

  const VIDEO_STYLES = [
    { id: 'realistic', label: '真实感', icon: '🎥', desc: '真人主播风格' },
    { id: 'anime', label: '动漫风', icon: '🎨', desc: '二次元卡通风格' },
    { id: 'cinematic', label: '电影感', icon: '🎬', desc: '大片质感' },
    { id: 'minimal', label: '简约风', icon: '⬜', desc: '纯净背景' },
  ]

  // 根据文案自动生成视频描述
  React.useEffect(() => {
    if (videoCopy) {
      const preview = videoCopy.slice(0, 60).replace(/\n/g, ' ')
      const ratioDesc = videoRatio === '9:16' ? '竖屏' : videoRatio === '16:9' ? '横屏' : '方形'
      setVideoPrompt(`一位专业主播正在讲述：${preview}，${ratioDesc}视频，真实感强，光线明亮，专业摄影棚`)
    }
  }, [videoCopy, videoRatio])

  async function startGenerate() {
    if (!videoPrompt.trim()) { showToast('请输入视频描述'); return }
    setVideoStatus('generating')
    setVideoError('')
    setVideoUrl('')
    setPollCount(0)
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: videoPrompt, duration: 6 })
      })
      const data = await res.json()
      if (data.status === 'demo') {
        setVideoStatus('demo')
        setVideoTaskId(data.taskId)
        showToast('⚠️ 演示模式：MiniMax API 未配置')
        return
      }
      if (data.taskId) {
        setVideoTaskId(data.taskId)
        setVideoStatus('polling')
        startPolling(data.taskId)
        showToast('🎬 视频生成任务已提交，正在生成...')
      } else {
        setVideoStatus('error')
        setVideoError(data.error || '提交失败')
      }
    } catch (e: any) {
      setVideoStatus('error')
      setVideoError(e.message)
    }
  }

  function startPolling(taskId: string) {
    let count = 0
    pollRef.current = setInterval(async () => {
      count++
      setPollCount(count)
      if (count > 60) { // 最多轮询 5 分钟
        clearInterval(pollRef.current)
        setVideoStatus('error')
        setVideoError('生成超时，请重试')
        return
      }
      try {
        const res = await fetch(`/api/video-status?taskId=${taskId}`)
        const data = await res.json()
        if (data.status === 'Success' || data.status === 'success' || data.videoUrl) {
          clearInterval(pollRef.current)
          setVideoStatus('done')
          setVideoUrl(data.videoUrl || '')
          showToast('✅ 视频生成完成！')
        } else if (data.status === 'Fail' || data.status === 'fail') {
          clearInterval(pollRef.current)
          setVideoStatus('error')
          setVideoError('视频生成失败，请重试')
        }
      } catch {}
    }, 5000)
  }

  React.useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  return (
    <div className="space-y-3">
      {/* 视频风格选择 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-900 text-sm">🎬 AI 视频合成</div>
          <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-500 rounded-full font-medium">MiniMax T2V</span>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {VIDEO_STYLES.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all active:scale-[0.97] ${selectedStyle === s.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
            >
              <span className="text-lg">{s.icon}</span>
              <div className="text-left">
                <div className={`text-xs font-bold ${selectedStyle === s.id ? 'text-purple-700' : 'text-gray-700'}`}>{s.label}</div>
                <div className="text-[9px] text-gray-400">{s.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 视频描述输入 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-500">📝 视频描述（Prompt）</div>
          <button
            onClick={() => {
              if (videoCopy) {
                const preview = videoCopy.slice(0, 60).replace(/\n/g, ' ')
                const styleDesc = selectedStyle === 'anime' ? '动漫风格，卡通人物' : selectedStyle === 'cinematic' ? '电影感，大片质感' : selectedStyle === 'minimal' ? '简约背景，纯净风格' : '真实感，专业主播'
                setVideoPrompt(`${styleDesc}，一位主播正在讲述：${preview}，竖屏视频，光线明亮`)
              }
            }}
            className="text-[10px] text-blue-400 font-medium"
          >↺ 重新生成</button>
        </div>
        <textarea
          value={videoPrompt}
          onChange={e => setVideoPrompt(e.target.value)}
          placeholder="描述你想要的视频画面，如：一位女主播在明亮的直播间讲述美食探店经历..."
          className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20 text-gray-700 leading-relaxed"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">{videoPrompt.length} 字</span>
          <span className="text-[10px] text-gray-400">建议 50-150 字</span>
        </div>
      </div>

      {/* 生成状态 */}
      {videoStatus === 'idle' && (
        <button
          onClick={startGenerate}
          className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-md"
        >
          🎬 开始生成视频
        </button>
      )}

      {(videoStatus === 'generating' || videoStatus === 'polling') && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            {/* 进度动画 */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-100"/>
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-purple-300 animate-spin"/>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl animate-pulse">🎬</span>
              </div>
            </div>
            <div className="text-center w-full">
              <p className="text-sm font-bold text-gray-800 mb-1">
                {videoStatus === 'generating' ? '提交任务中...' : `AI 渲染中 · ${pollCount * 5}s`}
              </p>
              <p className="text-xs text-gray-400 mb-3">MiniMax T2V 正在生成，通常需要 1-3 分钟</p>
              {/* 进度条 */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(pollCount * 2, 90)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0s</span>
                <span>预计 60-180s</span>
              </div>
            </div>
            {videoTaskId && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 w-full">
                <div className="text-[10px] text-gray-400 mb-0.5">任务 ID</div>
                <div className="text-[10px] text-gray-500 font-mono truncate">{videoTaskId}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {videoStatus === 'demo' && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-base">⚙️</div>
            <div>
              <div className="font-bold text-amber-700 text-sm">需要配置 API</div>
              <div className="text-[10px] text-amber-500">MiniMax 视频生成 API 未配置</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 space-y-2 mb-3">
            <div className="text-xs font-bold text-gray-700 mb-1">📋 配置步骤</div>
            {[
              { step: '1', text: '登录 platform.minimaxi.com 注册账号' },
              { step: '2', text: '获取 API Key 和 Group ID' },
              { step: '3', text: 'Vercel → Settings → Environment Variables' },
              { step: '4', text: '添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID' },
              { step: '5', text: '重新部署项目即可使用' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                <span className="text-[11px] text-gray-600 leading-relaxed">{s.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setVideoStatus('idle')} className="flex-1 py-2.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl active:scale-[0.97]">重新尝试</button>
            <button
              onClick={() => window.open('https://platform.minimaxi.com', '_blank')}
              className="flex-1 py-2.5 bg-amber-500 text-white text-xs font-bold rounded-xl active:scale-[0.97]"
            >前往获取 →</button>
          </div>
        </div>
      )}

      {videoStatus === 'done' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-base">✅</div>
            <div>
              <div className="font-bold text-gray-900 text-sm">视频生成完成！</div>
              <div className="text-[10px] text-gray-400">MiniMax T2V 渲染成功</div>
            </div>
          </div>
          {videoUrl ? (
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden bg-black">
                <video src={videoUrl} controls className="w-full" style={{maxHeight: '220px'}} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={videoUrl}
                  download={`contentos_video_${Date.now()}.mp4`}
                  className="flex items-center justify-center gap-1.5 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-2xl text-xs active:scale-[0.98] transition-all"
                >
                  ⬇️ 下载视频
                </a>
                <button
                  onClick={() => { navigator.clipboard?.writeText(videoUrl); showToast('✅ 链接已复制') }}
                  className="flex items-center justify-center gap-1.5 py-3 bg-blue-50 text-blue-500 font-bold rounded-2xl text-xs active:scale-[0.98] transition-all"
                >
                  🔗 复制链接
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎬</div>
              <div className="text-xs text-gray-500">视频已生成，下载链接获取中...</div>
            </div>
          )}
          <button
            onClick={() => { setVideoStatus('idle'); setVideoUrl(''); setVideoTaskId('') }}
            className="w-full mt-3 py-2.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-xl active:scale-[0.97]"
          >🔄 重新生成</button>
        </div>
      )}

      {videoStatus === 'error' && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="font-bold text-red-600 text-sm mb-1">❌ 生成失败</div>
          <div className="text-xs text-red-500 mb-3">{videoError}</div>
          <button onClick={() => setVideoStatus('idle')} className="w-full py-2 bg-red-100 text-red-600 text-xs font-semibold rounded-xl">重试</button>
        </div>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════
// CONTENT CALENDAR — 内容日历视图
// ═══════════════════════════════════════════════════════════
function ContentCalendar({ schedule, setSchedule, showToast, setShowAddSchedule, setShowVideoRecord, setQuickRecordData }: any) {
  const today = new Date()
  const [viewMonth, setViewMonth] = React.useState(today.getMonth())
  const [viewYear, setViewYear] = React.useState(today.getFullYear())
  const [calView, setCalView] = React.useState<'month' | 'list'>('month')
  const [selectedDay, setSelectedDay] = React.useState<number | null>(today.getDate())

  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const WEEKDAYS = ['日','一','二','三','四','五','六']
  const STATUS_COLOR: Record<string, string> = {
    '待发布': 'bg-orange-400',
    '已发布': 'bg-green-400',
    '草稿': 'bg-gray-300',
    '计划中': 'bg-blue-400',
  }
  const PLATFORM_EMOJI: Record<string, string> = {
    '抖音': '🎵', '小红书': '📕', 'B站': '📺', '视频号': '📱', '快手': '⚡'
  }

  // 解析排期时间到日期
  function parseScheduleDate(timeStr: string): { month: number; day: number } | null {
    const now = new Date()
    if (timeStr.startsWith('今天')) return { month: now.getMonth(), day: now.getDate() }
    if (timeStr.startsWith('明天')) { const d = new Date(now); d.setDate(d.getDate()+1); return { month: d.getMonth(), day: d.getDate() } }
    if (timeStr.startsWith('后天')) { const d = new Date(now); d.setDate(d.getDate()+2); return { month: d.getMonth(), day: d.getDate() } }
    const m = timeStr.match(/(\d+)月(\d+)日/)
    if (m) return { month: parseInt(m[1])-1, day: parseInt(m[2]) }
    return null
  }

  // 获取当月日历数据
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const calDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)]
  while (calDays.length % 7 !== 0) calDays.push(null)

  // 获取某天的排期
  function getDaySchedule(day: number | null) {
    if (!day) return []
    return schedule.filter((s: any) => {
      const d = parseScheduleDate(s.time)
      return d && d.month === viewMonth && d.day === day
    })
  }

  // 选中日的排期
  const selectedSchedule = selectedDay ? getDaySchedule(selectedDay) : []

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
      {/* 日历头部 */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1) } else setViewMonth(m => m-1) }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm active:scale-90 transition-transform">‹</button>
            <span className="font-black text-gray-900 text-sm">{viewYear}年 {MONTHS[viewMonth]}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1) } else setViewMonth(m => m+1) }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm active:scale-90 transition-transform">›</button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {(['month','list'] as const).map(v => (
                <button key={v} onClick={() => setCalView(v)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${calView === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>{v === 'month' ? '📅 月' : '📋 列'}</button>
              ))}
            </div>
            <button onClick={() => setShowAddSchedule(true)} className="w-7 h-7 rounded-full bg-blue-500 text-white text-lg flex items-center justify-center leading-none active:scale-90 transition-transform">+</button>
          </div>
        </div>

        {calView === 'month' && (
          <>
            {/* 星期标题 */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className={`text-center text-[10px] font-bold py-1 ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>
            {/* 日历格子 */}
            <div className="grid grid-cols-7 gap-y-1">
              {calDays.map((day, i) => {
                const daySchedule = getDaySchedule(day)
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
                const isSelected = day === selectedDay
                const isWeekend = i % 7 === 0 || i % 7 === 6
                return (
                  <button
                    key={i}
                    onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                    className={`relative flex flex-col items-center py-1 rounded-xl transition-all active:scale-90 ${!day ? 'pointer-events-none' : ''} ${isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`text-xs font-semibold leading-tight ${!day ? 'invisible' : isSelected ? 'text-white' : isToday ? 'text-blue-500' : isWeekend ? 'text-red-400' : 'text-gray-700'}`}>
                      {day || '·'}
                    </span>
                    {/* 排期点 */}
                    {daySchedule.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {daySchedule.slice(0, 3).map((s: any, j: number) => (
                          <div key={j} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : STATUS_COLOR[s.status] || 'bg-gray-300'}`}/>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {calView === 'list' && (
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {schedule.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-2xl mb-1 animate-float">📅</div>
                <p className="text-xs text-gray-400">暂无排期</p>
              </div>
            ) : schedule.map((s: any, i: number) => (
              <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 animate-fade-in-up`} style={{animationDelay:`${i*50}ms`}}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLOR[s.status] || 'bg-gray-300'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 truncate">{s.title}</div>
                  <div className="text-[10px] text-gray-400">{s.time} · {PLATFORM_EMOJI[s.platform] || ''} {s.platform}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {s.status === '已发布' && setShowVideoRecord && (
                    <button
                      onClick={() => {
                        if (setQuickRecordData) setQuickRecordData({ title: s.title, platform: s.platform, publishDate: s.time })
                        if (setShowVideoRecord) setShowVideoRecord(true)
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 font-semibold active:scale-95 transition-transform"
                    >录入</button>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 选中日详情 */}
      {calView === 'month' && selectedDay && (
        <div className="border-t border-gray-50 px-4 py-3 animate-slide-bottom">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">{viewMonth+1}月{selectedDay}日 的排期</span>
            <button onClick={() => setShowAddSchedule(true)} className="text-[10px] text-blue-500 font-semibold">+ 添加</button>
          </div>
          {selectedSchedule.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-xs text-gray-400">当天暂无排期</p>
              <button onClick={() => setShowAddSchedule(true)} className="mt-2 text-xs text-blue-400 font-medium">点击添加 →</button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedSchedule.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-base">{PLATFORM_EMOJI[s.platform] || '📱'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-800 truncate">{s.title}</div>
                    <div className="text-[10px] text-gray-400">{s.time}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.status === '待发布' ? 'bg-orange-50 text-orange-500' : s.status === '已发布' ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 图例 */}
      <div className="px-4 pb-3 flex items-center gap-3">
        {Object.entries(STATUS_COLOR).map(([label, color]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`}/>
            <span className="text-[10px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// BEST TIME PANEL — 最佳发布时间分析
// ═══════════════════════════════════════════════════════════
function BestTimePanel({ acc }: any) {
  const [expanded, setExpanded] = React.useState(false)

  // 基于行业的最佳发布时间数据
  const INDUSTRY_TIMES: Record<string, any> = {
    '餐饮': {
      bestTimes: [
        { time: '11:30-12:00', label: '午餐前', score: 95, reason: '用户刷手机决定午餐去哪' },
        { time: '17:30-18:30', label: '下班途中', score: 88, reason: '通勤时间，决定晚餐' },
        { time: '20:00-21:00', label: '饭后休闲', score: 82, reason: '饭后刷视频高峰' },
      ],
      bestDays: ['周四', '周五', '周六'],
      avoidTimes: '凌晨 0-7 点',
      tip: '餐饮类内容在饭点前后效果最佳，周末流量比工作日高 40%',
    },
    '健身': {
      bestTimes: [
        { time: '06:30-07:30', label: '晨练时段', score: 92, reason: '健身人群早起刷视频' },
        { time: '12:00-13:00', label: '午休时间', score: 85, reason: '上班族午休刷手机' },
        { time: '21:00-22:00', label: '夜间健身后', score: 90, reason: '健身后放松刷视频' },
      ],
      bestDays: ['周一', '周三', '周五'],
      avoidTimes: '周末下午 14-17 点',
      tip: '健身内容在周一（新的一周开始）发布效果最好，用户动力最强',
    },
    '美妆': {
      bestTimes: [
        { time: '08:00-09:00', label: '早晨化妆时', score: 88, reason: '用户边化妆边刷视频' },
        { time: '12:30-13:30', label: '午休时间', score: 85, reason: '女性用户午休高峰' },
        { time: '21:00-22:30', label: '睡前护肤', score: 95, reason: '护肤时间，高度相关' },
      ],
      bestDays: ['周二', '周四', '周六'],
      avoidTimes: '工作日上午 9-11 点',
      tip: '美妆内容在睡前护肤时段互动率最高，周末下午也是爆款高发期',
    },
  }

  const timeData = INDUSTRY_TIMES[acc?.industry] || INDUSTRY_TIMES['餐饮']

  // 热力图数据（7天 x 24小时，简化为7天 x 6时段）
  const HOURS = ['0-4时', '4-8时', '8-12时', '12-16时', '16-20时', '20-24时']
  const DAYS_SHORT = ['一','二','三','四','五','六','日']
  const heatData = [
    [1,2,3,4,3,5], [1,2,4,5,4,6], [1,2,4,5,4,7],
    [1,2,4,6,5,7], [1,2,4,5,5,8], [2,3,5,5,6,7], [2,3,4,4,5,6],
  ]
  const maxHeat = 8
  const heatColors = ['bg-blue-50','bg-blue-100','bg-blue-200','bg-blue-300','bg-blue-400','bg-blue-500','bg-blue-600','bg-blue-700','bg-blue-800']

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in-up delay-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-sm">⏰</div>
          <div className="text-left">
            <div className="font-bold text-gray-900 text-sm">最佳发布时间</div>
            <div className="text-[10px] text-gray-400 mt-0.5">基于 {acc?.industry || '餐饮'} 行业数据分析</div>
          </div>
        </div>
        <span className={`text-gray-400 text-sm transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-slide-bottom">
          {/* 最佳时段卡片 */}
          <div className="space-y-2 mb-4">
            {timeData.bestTimes.map((t: any, i: number) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl animate-fade-in-up`} style={{animationDelay:`${i*60}ms`, background: i === 0 ? '#FFF7ED' : '#F9FAFB'}}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : i === 1 ? 'bg-gradient-to-br from-blue-400 to-cyan-400' : 'bg-gradient-to-br from-purple-400 to-pink-400'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-black text-gray-900">{t.time}</span>
                    <span className="text-[10px] text-gray-400">{t.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{t.reason}</div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-sm font-black ${i === 0 ? 'text-orange-500' : 'text-gray-700'}`}>{t.score}</span>
                  <span className="text-[9px] text-gray-400">热度</span>
                </div>
              </div>
            ))}
          </div>

          {/* 热力图 */}
          <div className="mb-3">
            <div className="text-xs font-bold text-gray-700 mb-2">📊 全周流量热力图</div>
            <div className="flex gap-1">
              <div className="flex flex-col gap-1 mr-1">
                {DAYS_SHORT.map((d, i) => <div key={i} className="h-6 flex items-center text-[9px] text-gray-400 w-4">{d}</div>)}
              </div>
              <div className="flex-1">
                <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${HOURS.length}, 1fr)`}}>
                  {HOURS.map((h, hi) => (
                    <div key={hi} className="text-[8px] text-gray-400 text-center mb-0.5 truncate">{h.split('-')[0]}</div>
                  ))}
                </div>
                {heatData.map((row, ri) => (
                  <div key={ri} className="grid gap-1 mb-1" style={{gridTemplateColumns:`repeat(${HOURS.length}, 1fr)`}}>
                    {row.map((val, ci) => (
                      <div
                        key={ci}
                        className={`h-6 rounded-md ${heatColors[Math.min(val, heatColors.length-1)]} transition-all`}
                        title={`${DAYS_SHORT[ri]}曜 ${HOURS[ci]}: 热度${val}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 justify-end">
              <span className="text-[9px] text-gray-400">低</span>
              {heatColors.slice(0,6).map((c, i) => <div key={i} className={`w-3 h-3 rounded-sm ${c}`}/>)}
              <span className="text-[9px] text-gray-400">高</span>
            </div>
          </div>

          {/* 建议 */}
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-start gap-2">
              <span className="text-sm flex-shrink-0">💡</span>
              <div>
                <div className="text-xs font-bold text-amber-700 mb-0.5">行业建议</div>
                <div className="text-[10px] text-amber-600 leading-relaxed">{timeData.tip}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-amber-500 font-semibold">最佳日期：</span>
                  {timeData.bestDays.map((d: string) => <span key={d} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg font-medium">{d}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




// ═══════════════════════════════════════════════════════════
// VideoRecordModal — 视频数据录入弹窗
// ═══════════════════════════════════════════════════════════
function VideoRecordModal({ quickRecordData, setShowVideoRecord, setQuickRecordData, saveVideoRecord }: any) {
  const PLATFORMS = ['抖音', '小红书', 'B站', '视频号', '快手']
  const [title, setTitle] = React.useState(quickRecordData?.title || '')
  const [platform, setPlatform] = React.useState(quickRecordData?.platform || '抖音')
  const [publishDate, setPublishDate] = React.useState(quickRecordData?.publishDate || new Date().toLocaleDateString('zh-CN'))
  const [plays, setPlays] = React.useState('')
  const [likes, setLikes] = React.useState('')
  const [comments, setComments] = React.useState('')
  const [collects, setCollects] = React.useState('')
  const [fansChange, setFansChange] = React.useState('')

  function handleSave() {
    if (!title.trim()) return
    saveVideoRecord({ title, platform, publishDate, plays, likes, comments, collects, fansChange })
  }

  return (
    <div className="absolute inset-0 bg-black/40 z-50 flex flex-col rounded-[50px] overflow-hidden" onClick={() => { setShowVideoRecord(false); setQuickRecordData(null) }}>
      <div className="flex-1" />
      <div className="bg-white rounded-t-3xl p-5 pb-8 max-h-[90%] flex flex-col" onClick={(e: any) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="font-black text-gray-900">📊 录入视频数据</h3>
            <p className="text-xs text-gray-400 mt-0.5">录入后自动更新运营图表</p>
          </div>
          <button onClick={() => { setShowVideoRecord(false); setQuickRecordData(null) }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {/* 视频标题 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">视频标题</p>
            <input
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="输入视频标题"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
            />
          </div>

          {/* 发布平台 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">发布平台</p>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map((p: string) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${platform === p ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* 发布时间 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">发布时间</p>
            <input
              value={publishDate}
              onChange={(e: any) => setPublishDate(e.target.value)}
              placeholder="如：2025/1/15"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
            />
          </div>

          {/* 数据录入 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">视频数据</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '播放量', placeholder: '如：12000', value: plays, set: setPlays, icon: '▶️' },
                { label: '点赞数', placeholder: '如：580', value: likes, set: setLikes, icon: '❤️' },
                { label: '评论数', placeholder: '如：120', value: comments, set: setComments, icon: '💬' },
                { label: '收藏数', placeholder: '如：340', value: collects, set: setCollects, icon: '⭐' },
              ].map((f: any) => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-gray-400 mb-1">{f.icon} {f.label}</div>
                  <input
                    value={f.value}
                    onChange={(e: any) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    type="number"
                    className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 粉丝变化 */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">粉丝变化（可选）</p>
            <input
              value={fansChange}
              onChange={(e: any) => setFansChange(e.target.value)}
              placeholder="如：+120 或 -5"
              className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
            />
          </div>

          {/* 互动率预览 */}
          {plays && (parseInt(plays) > 0) && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-3">
              <div className="text-xs text-blue-600 font-semibold mb-1">📈 互动率预览</div>
              <div className="text-2xl font-black text-blue-700">
                {(((parseInt(likes||'0') + parseInt(comments||'0') + parseInt(collects||'0')) / parseInt(plays)) * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-blue-400 mt-0.5">(点赞+评论+收藏) / 播放量</div>
            </div>
          )}
        </div>

        {/* 保存按钮 */}
        <div className="flex gap-2 mt-4 flex-shrink-0">
          <button onClick={() => { setShowVideoRecord(false); setQuickRecordData(null) }} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm">取消</button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >💾 保存数据</button>
        </div>
      </div>
    </div>
  )
}

function Operations({ acc, opsTab, setOpsTab, schedule, setSchedule, savedContents, showToast, insights, insightsLoading, fetchInsights, showAddSchedule, setShowAddSchedule, newScheduleTitle, setNewScheduleTitle, newSchedulePlatform, setNewSchedulePlatform, addScheduleItem, platformStats, setPlatformStats, statsRange, setStatsRange, showDataBind, setShowDataBind, dataBindTab, setDataBindTab, manualFans, setManualFans, manualPlays, setManualPlays, manualLikes, setManualLikes, statsLoading, fetchPlatformStats, updateManualStats, setShowAiPanel, videoRecords, showVideoRecord, setShowVideoRecord, recordingVideo, setRecordingVideo, quickRecordData, setQuickRecordData, saveVideoRecord }: any) {
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

      {/* 视频数据录入弹窗 */}
      {showVideoRecord && (
        <VideoRecordModal
          quickRecordData={quickRecordData}
          setShowVideoRecord={setShowVideoRecord}
          setQuickRecordData={setQuickRecordData}
          saveVideoRecord={saveVideoRecord}
        />
      )}

      <div className="px-5 pt-12 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-gray-900">运营中心</h1>
          <button
            onClick={() => setShowAiPanel(true)}
            className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 shadow-sm flex items-center justify-center text-base active:scale-95 transition-transform relative"
          >
            🤖
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
          </button>
        </div>
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
            {/* 内容日历 */}
            <ContentCalendar schedule={schedule} setSchedule={setSchedule} showToast={showToast} setShowAddSchedule={setShowAddSchedule} setShowVideoRecord={setShowVideoRecord} setQuickRecordData={setQuickRecordData} />

            {/* 最佳发布时间 */}
            <BestTimePanel acc={acc} />

            {/* AI 运营建议 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm animate-fade-in-up delay-200">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">🤖 AI 运营建议</div>
                <button
                  onClick={fetchInsights}
                  disabled={insightsLoading}
                  className="text-xs text-blue-500 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                >
                  {insightsLoading ? '分析中...' : '✨ 刷新'}
                </button>
              </div>
              {insightsLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl" style={{animationDelay:`${i*100}ms`}}/>)}
                </div>
              ) : insights.length > 0 ? (
                <div className="space-y-2">
                  {insights.map((ins: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl animate-fade-in-up`} style={{animationDelay:`${i*60}ms`, background: ins.type === 'warning' ? '#FFF7ED' : ins.type === 'success' ? '#F0FDF4' : '#EFF6FF'}}>
                      <span className="text-base flex-shrink-0 mt-0.5">{ins.icon || '💡'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 mb-0.5">{ins.title}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{ins.content}</div>
                      </div>
                    </div>
                  ))}
                  <button onClick={fetchInsights} disabled={insightsLoading} className="w-full py-2 bg-blue-50 text-blue-500 text-xs font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50">
                    {insightsLoading ? '分析中...' : '✨ 获取 AI 个性化建议'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2 animate-float">🤖</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">AI 运营诊断</p>
                  <p className="text-xs text-gray-400 mb-4">分析你的账号数据，给出个性化建议</p>
                  <button onClick={fetchInsights} disabled={insightsLoading} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform shadow-sm">
                    {insightsLoading ? '分析中...' : '✨ 开始分析'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Stats Tab */}
        {opsTab === 'stats' && (
          <>
            {/* 数据绑定弹窗 */}
            {showDataBind && (
              <div className="absolute inset-0 bg-black/40 z-40 flex flex-col rounded-[50px] overflow-hidden" onClick={() => setShowDataBind(false)}>
                <div className="flex-1" />
                <div className="bg-white rounded-t-3xl p-5 pb-8" onClick={(e: any) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-black text-gray-900">数据绑定</h3>
                      <p className="text-xs text-gray-400 mt-0.5">手动录入或导入平台数据</p>
                    </div>
                    <button onClick={() => setShowDataBind(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {[{id:'manual',label:'✏️ 手动录入'},{id:'import',label:'🤖 AI 生成'},{id:'records',label:'📊 视频记录'}].map((t: any) => (
                      <button key={t.id} onClick={() => setDataBindTab(t.id)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${dataBindTab === t.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{t.label}</button>
                    ))}
                  </div>
                  {dataBindTab === 'manual' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: '当前粉丝数', placeholder: `当前: ${platformStats.totalFans.toLocaleString()}`, value: manualFans, set: setManualFans },
                          { label: '总播放量', placeholder: `当前: ${platformStats.totalPlays.toLocaleString()}`, value: manualPlays, set: setManualPlays },
                          { label: '本周点赞', placeholder: `当前: ${platformStats.likes[6]}`, value: manualLikes, set: setManualLikes },
                        ].map((f: any, i: number) => (
                          <div key={i} className={i === 2 ? 'col-span-2' : ''}>
                            <div className="text-xs text-gray-500 mb-1 font-medium">{f.label}</div>
                            <input value={f.value} onChange={(e: any) => f.set(e.target.value)} placeholder={f.placeholder} className="w-full px-3 py-2 rounded-xl bg-gray-100 text-sm outline-none" type="number" />
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="text-xs text-blue-600 font-semibold mb-1">📊 数据来源</div>
                        <div className="text-xs text-blue-500 leading-relaxed">从抖音/小红书创作者后台复制数据填入，系统将自动生成趋势图表</div>
                      </div>
                      <button onClick={updateManualStats} className="w-full py-3 bg-blue-500 text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-transform">✅ 更新数据</button>
                    </div>
                  )}
                  {dataBindTab === 'import' && (
                    <div className="space-y-3">
                      <div className="bg-purple-50 rounded-xl p-3">
                        <div className="text-xs text-purple-700 font-semibold mb-1">🤖 AI 智能生成</div>
                        <div className="text-xs text-purple-600 leading-relaxed">基于你的账号定位和行业，AI 将生成符合真实规律的数据趋势，用于图表展示和运营分析</div>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
                        <div className="text-xs font-semibold text-gray-700">将基于以下信息生成：</div>
                        {[`账号：${acc.name}`, `行业：${acc.industry}`, `定位：${acc.positioning?.slice(0,30) || '未设置'}...`].map((s: string, i: number) => (
                          <div key={i} className="text-xs text-gray-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0"/>{s}</div>
                        ))}
                      </div>
                      <button onClick={() => { fetchPlatformStats(); setShowDataBind(false) }} disabled={statsLoading} className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-400 text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60">
                        {statsLoading ? '生成中...' : '🤖 AI 生成数据'}
                      </button>
                    </div>
                  )}
                  {dataBindTab === 'records' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {videoRecords.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-3xl mb-2">📊</div>
                          <p className="text-xs text-gray-400">暂无视频数据记录</p>
                          <p className="text-xs text-gray-300 mt-1">在视频生成页发布后录入数据</p>
                        </div>
                      ) : videoRecords.map((r: any, i: number) => (
                        <div key={r.id} className="bg-gray-50 rounded-xl p-3 animate-fade-in-up" style={{animationDelay:`${i*40}ms`}}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="text-xs font-semibold text-gray-800 flex-1 truncate">{r.title || '未命名视频'}</div>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{r.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium">{r.platform || '抖音'}</span>
                            {r.publishDate && <span className="text-[10px] text-gray-400">{r.publishDate}</span>}
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {[{label:'播放',val:r.plays},{label:'点赞',val:r.likes},{label:'评论',val:r.comments},{label:'收藏',val:r.collects}].map((d: any) => (
                              <div key={d.label} className="text-center">
                                <div className="text-xs font-bold text-gray-800">{parseInt(d.val||0)>=10000?(parseInt(d.val)/10000).toFixed(1)+'w':d.val||0}</div>
                                <div className="text-[9px] text-gray-400">{d.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 顶部操作栏 */}
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">{platformStats.platform} 数据</span>
                    {platformStats.lastSync && <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">已同步 {platformStats.lastSync}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">点击"绑定"录入真实数据</div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 平台切换 */}
                  <select
                    value={platformStats.platform}
                    onChange={(e: any) => setPlatformStats((prev: any) => ({ ...prev, platform: e.target.value }))}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1.5 rounded-xl outline-none font-medium"
                  >
                    {['抖音', '小红书', 'B站', '视频号'].map((p: string) => <option key={p}>{p}</option>)}
                  </select>
                  <button onClick={() => setShowDataBind(true)} className="text-xs font-bold px-3 py-1.5 bg-blue-500 text-white rounded-xl active:scale-95 transition-transform">绑定</button>
                </div>
              </div>
            </div>

            {/* 核心数据卡片（动态） */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '总粉丝数', value: platformStats.totalFans >= 10000 ? (platformStats.totalFans/10000).toFixed(1)+'万' : platformStats.totalFans.toLocaleString(), unit: '', trend: `+${Math.round((platformStats.fans[6]-platformStats.fans[0])/platformStats.fans[0]*100)}%`, up: platformStats.fans[6] > platformStats.fans[0] },
                { label: '总播放量', value: platformStats.totalPlays >= 10000 ? (platformStats.totalPlays/10000).toFixed(1)+'万' : platformStats.totalPlays.toLocaleString(), unit: '', trend: `+${Math.round((platformStats.plays[6]-platformStats.plays[0])/platformStats.plays[0]*100)}%`, up: platformStats.plays[6] > platformStats.plays[0] },
                { label: '本周互动', value: (platformStats.likes[6]+platformStats.comments[6]+platformStats.collects[6]).toLocaleString(), unit: '', trend: `+${Math.round(((platformStats.likes[6]+platformStats.comments[6])-(platformStats.likes[0]+platformStats.comments[0]))/(platformStats.likes[0]+platformStats.comments[0])*100)}%`, up: true },
                { label: '平均互动率', value: platformStats.avgEngagement.toFixed(1), unit: '%', trend: '+0.8%', up: true },
              ].map((s: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                  <div className="text-2xl font-black text-gray-900">{s.value}<span className="text-sm font-medium text-gray-400 ml-0.5">{s.unit}</span></div>
                  <div className={`text-xs font-semibold mt-1 ${s.up ? 'text-green-500' : 'text-red-400'}`}>{s.up ? '↑' : '↓'} {s.trend} 较上周</div>
                </div>
              ))}
            </div>

            {/* 粉丝增长折线图（动态数据） */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">👥 粉丝增长趋势</div>
                <div className="flex gap-1">
                  {(['7d','30d'] as const).map((t) => (
                    <button key={t} onClick={() => setStatsRange(t)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${statsRange === t ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{t === '7d' ? '7天' : '30天'}</button>
                  ))}
                </div>
              </div>
              {(() => {
                const data = platformStats.fans
                const min = Math.min(...data)
                const max = Math.max(...data)
                const range = max - min || 1
                const pts = data.map((v: number, i: number) => [30 + i * 44, 88 - ((v - min) / range) * 70])
                const polyline = pts.map((p: number[]) => p.join(',')).join(' ')
                const area = `M${pts[0][0]},${pts[0][1]} ` + pts.slice(1).map((p: number[]) => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length-1][0]},88 L${pts[0][0]},88 Z`
                return (
                  <svg viewBox="0 0 300 100" className="w-full" style={{height:'90px'}}>
                    <defs>
                      <linearGradient id="fanGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[0,1,2,3].map((i: number) => <line key={i} x1="30" y1={10+i*22} x2="295" y2={10+i*22} stroke="#F3F4F6" strokeWidth="1"/>)}
                    {[max, Math.round(min+(max-min)*0.67), Math.round(min+(max-min)*0.33), min].map((v: number, i: number) => (
                      <text key={i} x="25" y={14+i*22} textAnchor="end" fontSize="7" fill="#9CA3AF">{v>=10000?(v/10000).toFixed(1)+'w':v}</text>
                    ))}
                    <path d={area} fill="url(#fanGrad2)"/>
                    <polyline points={polyline} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p: number[], i: number) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke="#3B82F6" strokeWidth="2"/>)}
                    {['周一','周二','周三','周四','周五','周六','周日'].map((d: string, i: number) => (
                      <text key={i} x={30+i*44} y="98" textAnchor="middle" fontSize="7" fill="#9CA3AF">{d}</text>
                    ))}
                  </svg>
                )
              })()}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="text-xs text-gray-400">本周新增 <span className="font-bold text-blue-500">+{platformStats.fans[6]-platformStats.fans[0]}</span></div>
                <div className="text-xs text-gray-400">总计 <span className="font-bold text-gray-700">{platformStats.totalFans >= 10000 ? (platformStats.totalFans/10000).toFixed(1)+'万' : platformStats.totalFans.toLocaleString()}</span></div>
              </div>
            </div>

            {/* 播放量趋势（动态） */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">▶️ 播放量趋势</div>
                <div className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">近7天</div>
              </div>
              {(() => {
                const data = platformStats.plays
                const min = Math.min(...data)
                const max = Math.max(...data)
                const range = max - min || 1
                const pts = data.map((v: number, i: number) => [30 + i * 44, 88 - ((v - min) / range) * 70])
                const polyline = pts.map((p: number[]) => p.join(',')).join(' ')
                const area = `M${pts[0][0]},${pts[0][1]} ` + pts.slice(1).map((p: number[]) => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length-1][0]},88 L${pts[0][0]},88 Z`
                return (
                  <svg viewBox="0 0 300 100" className="w-full" style={{height:'90px'}}>
                    <defs>
                      <linearGradient id="playGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {[0,1,2,3].map((i: number) => <line key={i} x1="30" y1={10+i*22} x2="295" y2={10+i*22} stroke="#F3F4F6" strokeWidth="1"/>)}
                    {[max, Math.round(min+(max-min)*0.67), Math.round(min+(max-min)*0.33), min].map((v: number, i: number) => (
                      <text key={i} x="25" y={14+i*22} textAnchor="end" fontSize="7" fill="#9CA3AF">{v>=10000?(v/10000).toFixed(1)+'w':v}</text>
                    ))}
                    <path d={area} fill="url(#playGrad2)"/>
                    <polyline points={polyline} fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    {pts.map((p: number[], i: number) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white" stroke="#8B5CF6" strokeWidth="2"/>)}
                    {['周一','周二','周三','周四','周五','周六','周日'].map((d: string, i: number) => (
                      <text key={i} x={30+i*44} y="98" textAnchor="middle" fontSize="7" fill="#9CA3AF">{d}</text>
                    ))}
                  </svg>
                )
              })()}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="text-xs text-gray-400">峰值 <span className="font-bold text-purple-500">{Math.max(...platformStats.plays).toLocaleString()}</span></div>
                <div className="text-xs text-gray-400">总计 <span className="font-bold text-gray-700">{platformStats.totalPlays >= 10000 ? (platformStats.totalPlays/10000).toFixed(1)+'万' : platformStats.totalPlays.toLocaleString()}</span></div>
              </div>
            </div>

            {/* 互动数据柱状图（动态） */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">❤️ 互动数据（近7天）</div>
              <div className="flex items-end gap-1 h-28 mb-2">
                {platformStats.likes.map((v: number, i: number) => {
                  const maxVal = Math.max(...platformStats.likes, ...platformStats.comments, ...platformStats.collects)
                  const likeH = Math.max(4, (v / maxVal) * 88)
                  const cmtH = Math.max(4, (platformStats.comments[i] / maxVal) * 88)
                  const colH = Math.max(4, (platformStats.collects[i] / maxVal) * 88)
                  return (
                    <div key={i} className="flex-1 flex items-end gap-0.5">
                      <div className="flex-1 bg-gradient-to-t from-red-400 to-pink-300 rounded-t-sm" style={{height:`${likeH}px`}}/>
                      <div className="flex-1 bg-gradient-to-t from-blue-400 to-cyan-300 rounded-t-sm" style={{height:`${cmtH}px`}}/>
                      <div className="flex-1 bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t-sm" style={{height:`${colH}px`}}/>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {[{color:'bg-red-400',label:'点赞'},{color:'bg-blue-400',label:'评论'},{color:'bg-amber-400',label:'收藏'}].map((l: any) => (
                  <div key={l.label} className="flex items-center gap-1"><div className={`w-2 h-2 rounded-sm ${l.color}`}/>{l.label}</div>
                ))}
                <div className="ml-auto text-gray-400">本周总互动 <span className="font-bold text-gray-700">{(platformStats.likes.reduce((a: number,b: number)=>a+b,0)+platformStats.comments.reduce((a: number,b: number)=>a+b,0)+platformStats.collects.reduce((a: number,b: number)=>a+b,0)).toLocaleString()}</span></div>
              </div>
            </div>

            {/* 内容类型分布 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎬 内容类型分布</div>
              <div className="flex items-center gap-4">
                <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0">
                  <path d="M50,50 L50,5 A45,45 0 0,1 92.5,72.5 Z" fill="#3B82F6"/>
                  <path d="M50,50 L92.5,72.5 A45,45 0 0,1 27.5,90 Z" fill="#8B5CF6"/>
                  <path d="M50,50 L27.5,90 A45,45 0 0,1 7.5,27.5 Z" fill="#F59E0B"/>
                  <path d="M50,50 L7.5,27.5 A45,45 0 0,1 50,5 Z" fill="#10B981"/>
                  <circle cx="50" cy="50" r="28" fill="white"/>
                  <text x="50" y="47" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1F2937">内容</text>
                  <text x="50" y="58" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1F2937">分布</text>
                </svg>
                <div className="flex-1 space-y-2">
                  {[{label:'口播类',pct:'45%',color:'bg-blue-500'},{label:'剧情类',pct:'25%',color:'bg-purple-500'},{label:'教程类',pct:'20%',color:'bg-amber-500'},{label:'其他',pct:'10%',color:'bg-emerald-500'}].map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${item.color}`}/><span className="text-xs text-gray-600">{item.label}</span></div>
                      <span className="text-xs font-bold text-gray-900">{item.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 最佳内容 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🏆 最佳内容</div>
              {savedContents.length > 0 ? (
                savedContents.slice(0, 3).map((c: any, i: number) => (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : i === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' : 'bg-gradient-to-br from-orange-400 to-red-400'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800 truncate">{c.topic}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{c.style} · {c.savedAt}</div>
                    </div>
                    <div className="text-[10px] text-blue-500 font-semibold">查看</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 text-center py-4">暂无数据，先去生成文案吧</div>
              )}
            </div>

            {/* 视频数据记录列表 */}
            {videoRecords.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 text-sm">🎬 视频数据记录</div>
                  <button
                    onClick={() => { setShowVideoRecord(true) }}
                    className="text-xs text-blue-500 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl active:scale-95 transition-transform"
                  >+ 录入</button>
                </div>
                <div className="space-y-2">
                  {videoRecords.slice(0, 5).map((r: any, i: number) => {
                    const plays = parseInt(r.plays) || 0
                    const likes = parseInt(r.likes) || 0
                    const comments = parseInt(r.comments) || 0
                    const collects = parseInt(r.collects) || 0
                    const engRate = plays > 0 ? (((likes + comments + collects) / plays) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={r.id} className="border border-gray-100 rounded-xl p-3 animate-fade-in-up" style={{animationDelay:`${i*50}ms`}}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-xs font-semibold text-gray-800 flex-1 line-clamp-1">{r.title || '未命名视频'}</div>
                          <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{r.platform || '抖音'}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 mb-1.5">
                          {[{label:'播放',val:plays,color:'text-blue-600'},{label:'点赞',val:likes,color:'text-red-500'},{label:'评论',val:comments,color:'text-orange-500'},{label:'收藏',val:collects,color:'text-yellow-500'},{label:'互动率',val:engRate+'%',color:'text-green-600'}].map((d: any) => (
                            <div key={d.label} className="text-center">
                              <div className={`text-xs font-bold ${d.color}`}>{typeof d.val === 'number' && d.val >= 10000 ? (d.val/10000).toFixed(1)+'w' : d.val}</div>
                              <div className="text-[9px] text-gray-400">{d.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-gray-400">{r.publishDate || r.createdAt}</div>
                      </div>
                    )
                  })}
                  {videoRecords.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-400">还有 {videoRecords.length - 5} 条记录，在数据绑定中查看全部</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 数据说明 */}
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <div className="flex items-start gap-2">
                <span className="text-sm flex-shrink-0">💡</span>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-1">关于平台数据</div>
                  <div className="text-[10px] text-gray-400 leading-relaxed">
                    点击"绑定"手动录入真实数据，或使用 AI 生成趋势数据。抖音/小红书官方 API 需企业资质，后续版本将支持 Cookie 方式自动同步。
                  </div>
                </div>
              </div>
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
