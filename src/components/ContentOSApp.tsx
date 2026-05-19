'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Types ───────────────────────────────────────────────
type Tab = 'dashboard' | 'materials' | 'content' | 'video' | 'operations' | 'profile'
type MatTab = 'hotspot' | 'topics' | 'radar' | 'creator' | 'style' | 'knowledge' | 'trending'
type OpsTab = 'schedule' | 'stats' | 'goals'
type VideoStep = 'input' | 'voice' | 'avatar' | 'preview'
type ContentStep = 1 | 2 | 3

interface Account {
  id: string; name: string; emoji: string; industry: string
  positioning: string; targetAudience: string; color: string
  followers?: string; likes?: string; works?: string
  // 账号独立数据（每个账号独立存储）
  savedContents?: SavedContent[]
  savedTopics?: any[]
  videoRecords?: any[]
  schedule?: any[]
  knowledgeItems?: any[]
  radarCache?: any
  aiTopicsCache?: any[]
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
  reminder?: boolean; reminderMinutes?: number
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

// ─── 确认弹窗组件 ────────────────────────────────────────
function ConfirmDialog({ show, title, desc, onConfirm, onCancel, danger = false }: { show: boolean, title: string, desc?: string, onConfirm: () => void, onCancel: () => void, danger?: boolean }) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 animate-slide-bottom" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <div className="text-center mb-5">
          <div className="text-2xl mb-2">{danger ? '⚠️' : '❓'}</div>
          <div className="font-bold text-gray-900 text-base mb-1">{title}</div>
          {desc && <div className="text-sm text-gray-500 leading-relaxed">{desc}</div>}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm active:scale-[0.97]">取消</button>
          <button onClick={() => { onConfirm(); onCancel(); }} className={`flex-1 py-3 font-bold rounded-2xl text-sm active:scale-[0.97] text-white ${danger ? 'bg-red-500' : 'bg-blue-500'}`}>确认</button>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ icon, title, desc, action, onAction }: { icon: string; title: string; desc?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-5xl mb-4 animate-float">{icon}</div>
      <div className="font-bold text-gray-800 mb-1 text-sm">{title}</div>
      {desc && <div className="text-xs text-gray-400 mb-4 leading-relaxed">{desc}</div>}
      {action && onAction && (
        <button onClick={onAction} className="px-5 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-2xl active:scale-[0.97] transition-transform shadow-md shadow-blue-100">
          {action}
        </button>
      )}
    </div>
  )
}

// ─── 全局搜索组件 ────────────────────────────────────────
function GlobalSearch({ show, onClose, savedTopics, savedContents, trackedCreators, setTab, setMatTab, showToast }: any) {
  const [query, setQuery] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (show) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [show])

  const results = React.useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const items: any[] = []
    // 搜索选题
    ;(savedTopics || []).forEach((t: any) => {
      const title = typeof t === 'string' ? t : (t.title || '')
      if (title.toLowerCase().includes(q)) {
        items.push({ type: '选题', icon: '💡', title, action: 'topics', color: 'bg-purple-50 text-purple-600' })
      }
    })
    // 搜索文案
    ;(savedContents || []).forEach((c: any) => {
      if ((c.topic || '').toLowerCase().includes(q) || (c.content || '').toLowerCase().includes(q)) {
        items.push({ type: '文案', icon: '✍️', title: c.topic || '未命名文案', desc: (c.content || '').slice(0, 40) + '...', action: 'content', color: 'bg-blue-50 text-blue-600' })
      }
    })
    // 搜索博主
    ;(trackedCreators || []).forEach((c: any) => {
      if ((c.name || c.url || '').toLowerCase().includes(q)) {
        items.push({ type: '博主', icon: '👥', title: c.name || c.url, action: 'creator', color: 'bg-cyan-50 text-cyan-600' })
      }
    })
    return items.slice(0, 12)
  }, [query, savedTopics, savedContents, trackedCreators])

  if (!show) return null
  return (
    <div className="fixed inset-0 z-[400] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-[430px] mx-auto mt-16 bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* 搜索框 */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <span className="text-xl">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索选题、文案、博主..."
            className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
          />
          {query && <button onClick={() => setQuery('')} className="text-gray-400 text-lg">✕</button>}
          <button onClick={onClose} className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-100 rounded-lg">关闭</button>
        </div>
        {/* 搜索结果 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="py-10 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm text-gray-400">没有找到「{query}」相关内容</div>
            </div>
          )}
          {!query && (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">✨</div>
              <div className="text-sm text-gray-400">输入关键词搜索全部内容</div>
              <div className="text-xs text-gray-300 mt-1">选题 · 文案 · 博主</div>
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                if (r.action === 'topics') { setTab('materials'); setMatTab('topics') }
                else if (r.action === 'content') { setTab('content') }
                else if (r.action === 'creator') { setTab('materials'); setMatTab('creator') }
                onClose()
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0 text-left transition-colors"
            >
              <span className={`text-base w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.color}`}>{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{r.title}</div>
                {r.desc && <div className="text-xs text-gray-400 truncate mt-0.5">{r.desc}</div>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${r.color}`}>{r.type}</span>
            </button>
          ))}
        </div>
      </div>
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

  // 知识库状态
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [knowledgeInput, setKnowledgeInput] = useState('')
  const [knowledgeTitle, setKnowledgeTitle] = useState('')
  const [knowledgeCategory, setKnowledgeCategory] = useState('专业知识')
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [knowledgeSearch, setKnowledgeSearch] = useState('')

  const [trendingItems, setTrendingItems] = useState<any[]>([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingCategory, setTrendingCategory] = useState('全部')
  const [trendingSort, setTrendingSort] = useState<'heat' | 'relevance'>('heat')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [swRegistered, setSwRegistered] = useState(false)
  const [newScheduleReminder, setNewScheduleReminder] = useState(false)
  const [newScheduleReminderMinutes, setNewScheduleReminderMinutes] = useState(30)
  const [newScheduleTime, setNewScheduleTime] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // 三合一超级生成状态
  const [showSuperGen, setShowSuperGen] = useState(false)
  const [superGenLoading, setSuperGenLoading] = useState(false)
  const [superGenResult, setSuperGenResult] = useState<any[]>([])
  const [superGenTopic, setSuperGenTopic] = useState('')
  const [superGenHotspot, setSuperGenHotspot] = useState('')
  const [superGenStyle, setSuperGenStyle] = useState('')
  const [superGenKnowledge, setSuperGenKnowledge] = useState<string[]>([])

  // Operations
  const [opsTab, setOpsTab] = useState<OpsTab>('schedule')
  // 数据复盘状态
  const [reviewData, setReviewData] = React.useState<any>(null)
  const [reviewLoading, setReviewLoading] = React.useState(false)
  const [reviewPeriod, setReviewPeriod] = React.useState('近30天')
  // 发布排期扩展状态
  const [publishingId, setPublishingId] = React.useState<string | null>(null)
  const [showPublishGuide, setShowPublishGuide] = React.useState<string | null>(null)
  const [scheduleDetailId, setScheduleDetailId] = React.useState<string | null>(null)
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
  // 内容日历升级状态
  const [showWeekPlan, setShowWeekPlan] = useState(false)
  const [weekPlanLoading, setWeekPlanLoading] = useState(false)
  const [dragItem, setDragItem] = useState<any>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  // 博主追踪升级状态
  const [creatorAnalysisTab, setCreatorAnalysisTab] = useState<'overview' | 'pattern' | 'scripts' | 'copy'>('overview')
  const [selectedScript, setSelectedScript] = useState<any>(null)
  const [showScriptDetail, setShowScriptDetail] = useState(false)

  // Video Studio
  const [videoStep, setVideoStep] = useState<VideoStep>('input')
  const [videoCopy, setVideoCopy] = useState('')
  const [videoVoiceId, setVideoVoiceId] = useState('female-shaonv')
  // 声音克隆状态
  const [clonedVoices, setClonedVoices] = React.useState<Array<{id:string,name:string,createdAt:string}>>(() => {
    try { return JSON.parse(localStorage.getItem('contentos_cloned_voices') || '[]') } catch { return [] }
  })
  const [isCloning, setIsCloning] = React.useState(false)
  const [cloneProgress, setCloneProgress] = React.useState('')
  const [showClonePanel, setShowClonePanel] = React.useState(false)
  const [cloneVoiceName, setCloneVoiceName] = React.useState('我的声音')
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

  // Global Search
  const [showGlobalSearch, setShowGlobalSearch] = React.useState(false)

  // Confirm Dialog
  const [confirmDialog, setConfirmDialog] = React.useState<{show:boolean,title:string,desc?:string,onConfirm:()=>void,danger?:boolean}>({show:false,title:'',onConfirm:()=>{}})
  function showConfirm(title: string, desc: string, onConfirm: () => void, danger = false) {
    setConfirmDialog({ show: true, title, desc, onConfirm, danger })
  }
  function hideConfirm() { setConfirmDialog(prev => ({...prev, show: false})) }

  // Theme / Appearance
  const [theme, setTheme] = React.useState('light')
  const [accentColor, setAccentColor] = React.useState('blue')
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-accent', accentColor)
  }, [theme, accentColor])

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

  // 账号切换时加载对应数据
  const prevAccIdRef = React.useRef<string>('')
  React.useEffect(() => {
    if (!acc?.id) return
    if (prevAccIdRef.current === acc.id) return
    if (prevAccIdRef.current) {
      // 切换账号：加载新账号数据
      loadAccData(acc.id)
      localStorage.setItem('contentos_account_idx', String(accountIdx))
    }
    prevAccIdRef.current = acc.id
  }, [acc?.id])

  // 账号数据自动持久化
  React.useEffect(() => { if (acc?.id) saveAccData(acc.id, 'saved', savedContents) }, [savedContents])
  React.useEffect(() => { if (acc?.id) saveAccData(acc.id, 'topics', savedTopics) }, [savedTopics])
  React.useEffect(() => { if (acc?.id) saveAccData(acc.id, 'video_records', videoRecords) }, [videoRecords])
  React.useEffect(() => { if (acc?.id) saveAccData(acc.id, 'schedule', schedule) }, [schedule])
  React.useEffect(() => { if (acc?.id) saveAccData(acc.id, 'knowledge', knowledgeItems) }, [knowledgeItems])

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
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').then(() => setSwRegistered(true)).catch(() => {})
    if ('Notification' in window) setNotificationPermission(Notification.permission)
  }, [])

  async function requestNotificationPermission() {
    if (!('Notification' in window)) { showToast('此浏览器不支持通知'); return }
    const perm = await Notification.requestPermission()
    setNotificationPermission(perm)
    if (perm === 'granted') showToast('✅ 通知权限已开启')
    else showToast('通知权限被拒绝，请在浏览器设置中开启')
  }

  function scheduleReminder(item: ScheduleItem) {
    if (!item.reminder || !item.reminderMinutes || notificationPermission !== 'granted') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: 'SCHEDULE_REMINDER', id: item.id, title: item.title, platform: item.platform, time: item.time, minutesBefore: item.reminderMinutes })
    })
  }


  // ─── 账号数据隔离：按 accountId 读写 ─────────────────────
  function getAccKey(accId: string, key: string) { return `contentos_${accId}_${key}` }
  function loadAccData(accId: string) {
    try {
      const s = localStorage.getItem(getAccKey(accId, 'saved')); setSavedContents(s ? JSON.parse(s) : [])
      const st = localStorage.getItem(getAccKey(accId, 'topics')); setSavedTopics(st ? JSON.parse(st) : [])
      const vr = localStorage.getItem(getAccKey(accId, 'video_records')); setVideoRecords(vr ? JSON.parse(vr) : [])
      const sch = localStorage.getItem(getAccKey(accId, 'schedule')); setSchedule(sch ? JSON.parse(sch) : [])
      const kb = localStorage.getItem(getAccKey(accId, 'knowledge')); setKnowledgeItems(kb ? JSON.parse(kb) : [])
    } catch {}
  }
  function saveAccData(accId: string, key: string, data: any) {
    try { localStorage.setItem(getAccKey(accId, key), JSON.stringify(data)) } catch {}
  }

  useEffect(() => {
    try {
      // 全局数据（不按账号隔离）
      const t = localStorage.getItem('contentos_style_templates'); if (t) setStyleTemplates(JSON.parse(t))
      const c = localStorage.getItem('contentos_creators'); if (c) setTrackedCreators(JSON.parse(c))
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
      const cr = localStorage.getItem('contentos_credits'); if (cr) setCredits(parseInt(cr) || 1000)
      // 加载当前账号数据
      const savedAccIdx = localStorage.getItem('contentos_account_idx')
      const initIdx = savedAccIdx ? parseInt(savedAccIdx) || 0 : 0
      setAccountIdx(initIdx)
      const acList = ac ? JSON.parse(ac) : DEFAULT_ACCOUNTS
      const initAccId = acList[initIdx]?.id || acList[0]?.id || '1'
      loadAccData(initAccId)
    } catch {}
  }, [])

  // ─── Helpers ─────────────────────────────────────────────
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function saveToLocal(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }
  // 账号数据专用保存（自动带 accountId 前缀）
  function saveAccLocal(key: string, data: any) {
    saveAccData(acc?.id || '1', key, data)
  }

  // ─── 数据导出 CSV ────────────────────────────────────────
  function exportToCSV(data: any[], filename: string, headers: string[]) {
    const rows = [headers, ...data]
    const csv = rows.map(row => row.map((cell: any) => {
      const str = String(cell ?? '').replace(/"/g, '""')
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str
    }).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename + '_' + new Date().toLocaleDateString('zh-CN').replace(/\//g,'-') + '.csv'
    a.click(); URL.revokeObjectURL(url)
    showToast('✅ 导出成功')
  }

  function exportTopics() {
    if (!savedTopics?.length) { showToast('⚠️ 暂无选题数据'); return }
    exportToCSV(
      savedTopics.map((t: any, i: number) => [i+1, t.title || t, t.category || '通用', t.savedAt ? new Date(t.savedAt).toLocaleDateString('zh-CN') : '-']),
      'ContentOS_选题库',
      ['序号', '选题标题', '分类', '保存日期']
    )
  }

  function exportContents() {
    if (!savedContents?.length) { showToast('⚠️ 暂无文案数据'); return }
    exportToCSV(
      savedContents.map((c: any, i: number) => [i+1, c.topic || '', c.style || '', c.content || '', c.hook || '', (c.content?.length || 0) + '字', c.savedAt ? new Date(c.savedAt).toLocaleDateString('zh-CN') : '-']),
      'ContentOS_文案库',
      ['序号', '选题', '风格', '正文', '钩子', '字数', '保存日期']
    )
  }

  // ─── 知识库操作 ──────────────────────────────────────────
  function addKnowledgeItem() {
    if (!knowledgeTitle.trim() || !knowledgeInput.trim()) { showToast('⚠️ 请填写标题和内容'); return }
    const item = {
      id: Date.now().toString(),
      title: knowledgeTitle.trim(),
      content: knowledgeInput.trim(),
      category: knowledgeCategory,
      createdAt: new Date().toISOString(),
      wordCount: knowledgeInput.trim().length,
    }
    const updated = [item, ...knowledgeItems]
    setKnowledgeItems(updated)
    saveAccLocal('knowledge', updated)
    setKnowledgeTitle('')
    setKnowledgeInput('')
    setShowAddKnowledge(false)
    showToast('✅ 知识已添加到知识库')
  }

  async function fetchTrendingMaterials() {
    setTrendingLoading(true)
    try {
      const res = await fetch('/api/trending-materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry: acc.industry, positioning: acc.positioning, aiModel, aiApiKey, aiApiBase, aiTemperature }) })
      const data = await res.json()
      if (data.items) { setTrendingItems(data.items); showToast(`✅ 已抓取 ${data.items.length} 条爆款素材`) }
    } catch { showToast('抓取失败，请重试') }
    setTrendingLoading(false)
  }

  function deleteKnowledgeItem(id: string) {
    const updated = knowledgeItems.filter((k: any) => k.id !== id)
    setKnowledgeItems(updated)
    saveAccLocal('knowledge', updated)
    showToast('已删除')
  }

  // ─── 三合一超级文案生成 ──────────────────────────────────
  async function superGenerate() {
    if (!superGenTopic.trim()) { showToast('⚠️ 请输入选题'); return }
    setSuperGenLoading(true)
    setSuperGenResult([])
    try {
      // 构建知识库上下文
      const selectedKb = superGenKnowledge.length > 0
        ? knowledgeItems.filter((k: any) => superGenKnowledge.includes(k.id))
        : knowledgeItems.slice(0, 3)
      const kbContext = selectedKb.length > 0
        ? '\n\n【我的专业知识库】\n' + selectedKb.map((k: any) => `【${k.title}】${k.content.slice(0, 200)}`).join('\n')
        : ''
      const hotspotContext = superGenHotspot ? `\n\n【结合今日热点】${superGenHotspot}` : ''
      const styleContext = superGenStyle ? `\n\n【参考风格模板】${superGenStyle}` : ''

      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: superGenTopic,
          accountName: acc.name,
          industry: acc.industry,
          positioning: acc.positioning,
          targetAudience: acc.targetAudience,
          style: '超级生成',
          userInput: `请结合以下信息生成3个差异化版本的口播文案：${kbContext}${hotspotContext}${styleContext}\n\n要求：\n1. 深度融合知识库中的专业内容，体现账号专业性\n2. 自然结合热点，不生硬\n3. 保持账号一贯风格\n4. 每版有明显差异（角度/结构/情绪不同）`,
        })
      })
      const data = await res.json()
      if (data.versions?.length) {
        setSuperGenResult(data.versions)
        showToast('✅ 超级文案生成完成！')
      } else {
        showToast('生成失败，请重试')
      }
    } catch {
      showToast('❌ 网络错误')
    } finally {
      setSuperGenLoading(false)
    }
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

  async function syncToCloud() {
    if (!user || user.id === 'guest') { showToast('请先登录以使用云端同步'); return }
    setSyncLoading(true)
    try {
      const { error } = await supabase.from('user_data').upsert({ user_id: user.id, account_id: acc.id, data_json: { savedContents, savedTopics, schedule, videoRecords, knowledgeItems, accounts, styleTemplates }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,account_id' })
      if (error) throw error
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      showToast('✅ 数据已同步到云端')
    } catch (e: any) { showToast('同步失败：' + (e.message || '请重试')) }
    setSyncLoading(false)
  }

  async function loadFromCloud() {
    if (!user || user.id === 'guest') return
    try {
      const { data, error } = await supabase.from('user_data').select('data_json, updated_at').eq('user_id', user.id).eq('account_id', acc.id).single()
      if (error || !data) return
      const d = data.data_json as any
      if (d.savedContents) setSavedContents(d.savedContents)
      if (d.savedTopics) setSavedTopics(d.savedTopics)
      if (d.schedule) setSchedule(d.schedule)
      if (d.videoRecords) setVideoRecords(d.videoRecords)
      if (d.knowledgeItems) setKnowledgeItems(d.knowledgeItems)
      if (d.styleTemplates) setStyleTemplates(d.styleTemplates)
      setLastSyncTime(new Date(data.updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
      showToast('✅ 已从云端加载数据')
    } catch {}
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

  async function fetchReview() {
        if (reviewLoading) return
        setReviewLoading(true)
        try {
          const res = await fetch('/api/review-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoRecords, accountInfo: { name: acc.name, industry: acc.industry, positioning: acc.positioning }, period: reviewPeriod, aiModel, aiApiKey, aiApiBase })
          })
          const data = await res.json()
          if (data.success) { setReviewData(data); showToast('✅ 复盘分析完成') }
          else showToast('分析失败：' + (data.error || '未知错误'))
        } catch (e: any) { showToast('分析出错：' + e.message) }
        finally { setReviewLoading(false) }
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
    saveAccLocal('video_records', updated)
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
    saveAccLocal('saved', updated)
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
      saveAccLocal('topics', updated)
      showToast('已取消收藏')
    } else {
      const updated = [title, ...savedTopics]
      setSavedTopics(updated)
      saveAccLocal('topics', updated)
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
    const item: ScheduleItem = { id: Date.now().toString(), time: newScheduleTime || '待定', title: newScheduleTitle, status: '计划中', platform: newSchedulePlatform, reminder: newScheduleReminder, reminderMinutes: newScheduleReminderMinutes }
    setSchedule([...schedule, item])
    if (item.reminder && notificationPermission === 'granted') { scheduleReminder(item); showToast(`✅ 已添加排期，将在发布前 ${item.reminderMinutes} 分钟提醒`) }
    else if (item.reminder && notificationPermission !== 'granted') { requestNotificationPermission(); showToast('✅ 已添加排期，请开启通知权限') }
    else showToast('✅ 已添加到排期')
    setShowAddSchedule(false); setNewScheduleTitle(''); setNewScheduleTime(''); setNewScheduleReminder(false)
  }

  // 批量生成一周内容计划
  async function generateWeekPlan() {
    setWeekPlanLoading(true)
    setShowWeekPlan(true)
    try {
      const today = new Date()
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(today.getDate() + i)
        return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })
      })
      const res = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positioning: acc.positioning, industry: acc.industry, accountName: acc.name,
          count: 7,
          modulePrompt: (modulePrompts['topics'] || '') + '\n请为每个选题指定发布平台（抖音/小红书/B站/视频号之一）和最佳发布时间（如18:30）',
          aiModel, aiApiKey, aiApiBase, aiTemperature
        })
      })
      const data = await res.json()
      if (data.topics && data.topics.length > 0) {
        const PLATFORMS = ['抖音', '小红书', 'B站', '视频号', '抖音', '小红书', '抖音']
        const TIMES = ['18:30', '12:00', '20:00', '19:00', '18:30', '21:00', '17:00']
        const newItems: ScheduleItem[] = data.topics.slice(0, 7).map((t: any, i: number) => ({
          id: (Date.now() + i).toString(),
          time: `${weekDays[i]} ${TIMES[i]}`,
          title: t.title || t,
          status: '计划中',
          platform: PLATFORMS[i],
        }))
        setSchedule(prev => [...prev, ...newItems])
        showToast(`✅ 已生成 ${newItems.length} 条一周计划`)
      } else {
        showToast('生成失败，请重试')
      }
    } catch {
      showToast('网络错误，请重试')
    } finally {
      setWeekPlanLoading(false)
    }
  }

  // 拖拽排期：更新排期时间
  function handleDragDrop(itemId: string, newDate: string) {
    setSchedule(prev => prev.map(s => s.id === itemId ? { ...s, time: newDate + ' ' + (s.time.split(' ')[1] || '18:30') } : s))
    setDragItem(null)
    setDragOverDate(null)
    showToast('✅ 排期已更新')
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
      <GlobalSearch
        show={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        savedTopics={savedTopics}
        savedContents={savedContents}
        trackedCreators={trackedCreators}
        setTab={setTab}
        setMatTab={setMatTab}
        showToast={showToast}
      />
      <ConfirmDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        desc={confirmDialog.desc}
        onConfirm={confirmDialog.onConfirm}
        onCancel={hideConfirm}
        danger={confirmDialog.danger}
      />
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
                videoRecords={videoRecords}
                savedTopicsCount={savedTopics.length}
                setShowSuperGen={setShowSuperGen}
                knowledgeItems={knowledgeItems}
              />
            )}
        {tab === 'materials' && (
          <Materials
                acc={acc} matTab={matTab} setMatTab={setMatTab}
                knowledgeItems={knowledgeItems} knowledgeInput={knowledgeInput} setKnowledgeInput={setKnowledgeInput}
                knowledgeTitle={knowledgeTitle} setKnowledgeTitle={setKnowledgeTitle}
                knowledgeCategory={knowledgeCategory} setKnowledgeCategory={setKnowledgeCategory}
                showAddKnowledge={showAddKnowledge} setShowAddKnowledge={setShowAddKnowledge}
                knowledgeSearch={knowledgeSearch} setKnowledgeSearch={setKnowledgeSearch}
                addKnowledgeItem={addKnowledgeItem} deleteKnowledgeItem={deleteKnowledgeItem}
                showSuperGen={showSuperGen} setShowSuperGen={setShowSuperGen}
                superGenLoading={superGenLoading} superGenResult={superGenResult} setSuperGenResult={setSuperGenResult}
                superGenTopic={superGenTopic} setSuperGenTopic={setSuperGenTopic}
                superGenHotspot={superGenHotspot} setSuperGenHotspot={setSuperGenHotspot}
                superGenStyle={superGenStyle} setSuperGenStyle={setSuperGenStyle}
                superGenKnowledge={superGenKnowledge} setSuperGenKnowledge={setSuperGenKnowledge}
                superGenerate={superGenerate}
                hotspots={HOTSPOTS} aiTopics={aiTopics} topicsLoading={topicsLoading}
                generateTopics={generateTopics}
                topicFilter={topicFilter} setTopicFilter={setTopicFilter}
                topicSearch={topicSearch} setTopicSearch={setTopicSearch}
                batchCount={batchCount} setBatchCount={setBatchCount}
                topicCategories={topicCategories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
                useTopic={(t: string) => { setSelectedTopic(t); setTab('content'); setContentStep(2) }}
                savedContents={savedContents} savedTopics={savedTopics} videoRecords={videoRecords} saveTopic={saveTopic}
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
                creatorAnalysisTab={creatorAnalysisTab} setCreatorAnalysisTab={setCreatorAnalysisTab}
                selectedScript={selectedScript} setSelectedScript={setSelectedScript}
                showScriptDetail={showScriptDetail} setShowScriptDetail={setShowScriptDetail}
                trendingItems={trendingItems} trendingLoading={trendingLoading}
                trendingCategory={trendingCategory} setTrendingCategory={setTrendingCategory}
                trendingSort={trendingSort} setTrendingSort={setTrendingSort}
                fetchTrendingMaterials={fetchTrendingMaterials}
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
            clonedVoices={clonedVoices} setClonedVoices={setClonedVoices}
            isCloning={isCloning} setIsCloning={setIsCloning}
            cloneProgress={cloneProgress} setCloneProgress={setCloneProgress}
            showClonePanel={showClonePanel} setShowClonePanel={setShowClonePanel}
            cloneVoiceName={cloneVoiceName} setCloneVoiceName={setCloneVoiceName}
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
            generateWeekPlan={generateWeekPlan}
            weekPlanLoading={weekPlanLoading}
            showWeekPlan={showWeekPlan} setShowWeekPlan={setShowWeekPlan}
            dragItem={dragItem} setDragItem={setDragItem}
            dragOverDate={dragOverDate} setDragOverDate={setDragOverDate}
            handleDragDrop={handleDragDrop}
            setShowAiPanel={setShowAiPanel}
            videoRecords={videoRecords}
            showVideoRecord={showVideoRecord} setShowVideoRecord={setShowVideoRecord}
            recordingVideo={recordingVideo} setRecordingVideo={setRecordingVideo}
            quickRecordData={quickRecordData} setQuickRecordData={setQuickRecordData}
            saveVideoRecord={saveVideoRecord}
                reviewData={reviewData} reviewLoading={reviewLoading} fetchReview={fetchReview}
                reviewPeriod={reviewPeriod} setReviewPeriod={setReviewPeriod}
                publishingId={publishingId} setPublishingId={setPublishingId}
                showPublishGuide={showPublishGuide} setShowPublishGuide={setShowPublishGuide}
                scheduleDetailId={scheduleDetailId} setScheduleDetailId={setScheduleDetailId}
                newScheduleTime={newScheduleTime} setNewScheduleTime={setNewScheduleTime}
                newScheduleReminder={newScheduleReminder} setNewScheduleReminder={setNewScheduleReminder}
                newScheduleReminderMinutes={newScheduleReminderMinutes} setNewScheduleReminderMinutes={setNewScheduleReminderMinutes}
                notificationPermission={notificationPermission} requestNotificationPermission={requestNotificationPermission}
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
            exportTopics={exportTopics} exportContents={exportContents}
            theme={theme} setTheme={setTheme}
            accentColor={accentColor} setAccentColor={setAccentColor}
          />
        )}
      </div>
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 flex items-start pt-2 flex-shrink-0 z-50" style={{paddingBottom:'max(20px, env(safe-area-inset-bottom, 20px))'}}>
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
function Dashboard({ acc, accounts, accountIdx, setAccountIdx, setTab, setMatTab, showToast, user, onLogout, savedContents, schedule, onPositioning, showAddAccount, setShowAddAccount, newAccName, setNewAccName, newAccIndustry, setNewAccIndustry, newAccEmoji, setNewAccEmoji, addAccount, hotspots, radarData, fetchRadar, radarLoading, savedTopics, setShowAiPanel, videoRecords, savedTopicsCount, setShowGlobalSearch, setShowSuperGen, knowledgeItems }: any) {
  const [showAccSwitcher, setShowAccSwitcher] = React.useState(false)
      const EMOJIS = ['🏪', '🍜', '💪', '💄', '📚', '🏠', '🚗', '🎵', '🌿', '☕']

      // 任务完成状态
      const [completedTasks, setCompletedTasks] = React.useState<Set<string>>(new Set())
      const [showDailyPlan, setShowDailyPlan] = React.useState(false)
      const [planLoading, setPlanLoading] = React.useState(false)
      const [dailyPlan, setDailyPlan] = React.useState<any[]>([])
      const [showAddAcc, setShowAddAcc] = React.useState(false)

      // 今日 & 明日排期
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayStr = today.toDateString()
      const tomorrowStr = tomorrow.toDateString()

      const todaySchedule = React.useMemo(() => schedule.filter((s: any) => {
        const d = new Date(s.time || s.date || '')
        return d.toDateString() === todayStr
      }), [schedule, todayStr])

      const tomorrowSchedule = React.useMemo(() => schedule.filter((s: any) => {
        const d = new Date(s.time || s.date || '')
        return d.toDateString() === tomorrowStr
      }), [schedule, tomorrowStr])

      // 智能任务清单（动态生成）
      const todayTasks = React.useMemo(() => {
        const tasks: any[] = []

        if (acc.positioning === '待完善') {
          tasks.push({ id: 'positioning', icon: '🎯', label: '完善账号定位', desc: '生成专属定位方案，提升内容精准度', priority: 'urgent', action: 'positioning', tag: '必做' })
        }
        todaySchedule.forEach((s: any) => {
          tasks.push({ id: `pub_${s.id}`, icon: '📤', label: `发布：${s.title}`, desc: `${s.platform} · ${s.time || '今日'}`, priority: 'urgent', action: 'operations', tag: '今日' })
        })
        if (!radarData) {
          tasks.push({ id: 'radar', icon: '📡', label: '获取今日情报', desc: '热点 · 爆款形式 · 关键词趋势', priority: 'important', action: 'radar', tag: '推荐' })
        }
        if (savedContents.length === 0) {
          tasks.push({ id: 'copy', icon: '✍️', label: '生成今日文案', desc: '选择选题，AI 一键生成高质量文案', priority: 'important', action: 'content', tag: '推荐' })
        } else {
          tasks.push({ id: 'copy2', icon: '✍️', label: '继续创作文案', desc: `已有 ${savedContents.length} 条，保持更新节奏`, priority: 'normal', action: 'content', tag: '建议' })
        }
        if ((savedTopicsCount || savedTopics?.length || 0) < 3) {
          tasks.push({ id: 'topic', icon: '💡', label: '补充选题库', desc: '选题不足，AI 批量生成高完播率选题', priority: 'important', action: 'topics', tag: '推荐' })
        } else {
          tasks.push({ id: 'topic2', icon: '💡', label: '生成今日选题', desc: `已有 ${savedTopicsCount || savedTopics?.length || 0} 个选题，继续扩充`, priority: 'normal', action: 'topics', tag: '建议' })
        }
        if (todaySchedule.length === 0) {
          tasks.push({ id: 'schedule', icon: '📅', label: '安排今日发布', desc: '还没有今日排期，去运营中心添加', priority: 'normal', action: 'operations', tag: '建议' })
        }
        if ((knowledgeItems||[]).length === 0) {
          tasks.push({ id: 'knowledge', icon: '🧠', label: '建立专属知识库', desc: '添加你的专业知识，让 AI 生成更有深度的文案', priority: 'important', action: 'knowledge', tag: '推荐' })
        }

        return tasks.slice(0, 6)
      }, [acc, todaySchedule, savedContents, radarData, savedTopics, savedTopicsCount])

      const completedCount = completedTasks.size
      const totalCount = todayTasks.length
      const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      function toggleTask(id: string) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
        setCompletedTasks((prev: Set<string>) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }

      function handleTaskAction(action: string) {
        if (action === 'positioning') { onPositioning() }
        else if (action === 'content') { setTab('content') }
        else if (action === 'topics') { setTab('materials'); setMatTab('topics') }
        else if (action === 'operations') { setTab('operations') }
        else if (action === 'radar') { setTab('materials'); setMatTab('hotspot') }
        else if (action === 'knowledge') { setTab('materials'); setMatTab('knowledge') }
      }

      // 生成每日内容计划
      async function generateDailyPlan() {
        setPlanLoading(true)
        setShowDailyPlan(true)
        await new Promise(r => setTimeout(r, 1200))
        const plans = [
          { time: '08:00', type: '情报收集', title: '查看今日热点与行业动态', status: 'pending', icon: '📡', color: 'blue' },
          { time: '10:00', type: '选题确认', title: `为「${acc.name}」确认今日创作选题`, status: 'pending', icon: '💡', color: 'purple' },
          { time: '14:00', type: '文案创作', title: 'AI 生成文案，人工润色优化', status: 'pending', icon: '✍️', color: 'green' },
          { time: '16:00', type: '视频制作', title: '录制/合成视频，添加字幕', status: 'pending', icon: '🎬', color: 'orange' },
          { time: '19:00', type: '发布上线', title: todaySchedule.length > 0 ? `发布「${todaySchedule[0].title}」` : '发布今日内容', status: todaySchedule.length > 0 ? 'scheduled' : 'pending', icon: '📤', color: 'red' },
          { time: '21:00', type: '数据复盘', title: '查看今日数据，记录视频表现', status: 'pending', icon: '📊', color: 'gray' },
        ]
        setDailyPlan(plans)
        setPlanLoading(false)
      }

      // 数据概览
      const statsCards = [
        { label: '已存文案', value: savedContents.length, icon: '✍️', color: 'blue', action: 'content' },
        { label: '选题库', value: savedTopicsCount || savedTopics?.length || 0, icon: '💡', color: 'purple', action: 'topics' },
        { label: '知识库', value: (knowledgeItems||[]).length, icon: '🧠', color: 'indigo', action: 'knowledge' },
        { label: '排期数', value: schedule.length, icon: '📅', color: 'green', action: 'operations' },
      ]

      const priorityConfig: any = {
        urgent: { label: '紧急', bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400', tagBg: 'bg-red-100 text-red-500' },
        important: { label: '重要', bg: 'bg-orange-50', text: 'text-orange-500', dot: 'bg-orange-400', tagBg: 'bg-orange-100 text-orange-500' },
        normal: { label: '普通', bg: 'bg-gray-50', text: 'text-gray-400', dot: 'bg-gray-300', tagBg: 'bg-gray-100 text-gray-500' },
      }

      const dateStr = today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

      return (
        <div className="flex flex-col h-full bg-gray-50">
          {/* 顶部账号栏 */}
          <div className="bg-white px-4 pt-12 pb-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-lg shadow-sm">
                  {acc.emoji || '🏪'}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm leading-tight">{acc.name}</div>
                  <div className="text-[10px] text-gray-400">{acc.industry} · {acc.positioning === '待完善' ? <span className="text-orange-400">定位待完善</span> : acc.positioning?.slice(0, 10)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowGlobalSearch(true)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-base">🔍</button>
                <button onClick={() => setShowAiPanel(true)} className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-base">🤖</button>
                <button onClick={() => setShowAddAcc(!showAddAcc)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-base">⚙️</button>
              </div>
            </div>

            {/* 账号切换 */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {accounts.map((a: any, i: number) => (
                <button
                  key={a.id}
                  onClick={() => { setAccountIdx(i); if (typeof navigator !== 'undefined') navigator.vibrate?.(10) }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${i === accountIdx ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <span>{a.emoji || '🏪'}</span>
                  <span className="max-w-[60px] truncate">{a.name}</span>
                  {i === accountIdx && <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />}
                </button>
              ))}
              <button
                onClick={() => setShowAddAccount(true)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-dashed border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-all"
              >
                <span>＋</span>
                <span>新账号</span>
              </button>
            </div>
          </div>

          {/* 主内容区 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">

            {/* 日期 + 进度概览 */}
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-4 text-white shadow-md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white/70 text-xs mb-0.5">今天</div>
                  <div className="font-bold text-base">{dateStr}</div>
                </div>
                <button
                  onClick={generateDailyPlan}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95"
                >
                  📋 今日计划
                </button>
              </div>
              {/* 进度条 */}
              <div className="bg-white/20 rounded-full h-2 mb-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80">今日任务完成度</span>
                <span className="font-bold">{completedCount}/{totalCount} · {progressPct}%</span>
              </div>
            </div>

            {/* 超级生成横幅 */}
            <div
              onClick={() => { setTab('materials'); setMatTab('knowledge'); setTimeout(()=>setShowSuperGen(true),300) }}
              className="mx-4 mb-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-purple-200/50"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">⚡</div>
              <div className="flex-1">
                <div className="font-black text-white text-sm">超级文案生成</div>
                <div className="text-white/80 text-[10px]">热点 × 知识库({(knowledgeItems||[]).length}条) × 风格 三合一</div>
              </div>
              <div className="text-white/80 text-sm font-bold">立即 →</div>
            </div>

            {/* 每日内容计划弹层 */}
            {showDailyPlan && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="font-bold text-gray-900 text-sm">📋 今日内容计划</div>
                  <button onClick={() => setShowDailyPlan(false)} className="text-gray-400 text-sm">✕</button>
                </div>
                {planLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">AI 正在生成今日计划...</span>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {dailyPlan.map((item: any, i: number) => {
                      const colorMap: any = {
                        blue: 'bg-blue-50 text-blue-500',
                        purple: 'bg-purple-50 text-purple-500',
                        green: 'bg-green-50 text-green-500',
                        orange: 'bg-orange-50 text-orange-500',
                        red: 'bg-red-50 text-red-500',
                        gray: 'bg-gray-50 text-gray-500',
                      }
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${colorMap[item.color]}`}>{item.icon}</div>
                            {i < dailyPlan.length - 1 && <div className="w-0.5 h-4 bg-gray-100 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] text-gray-400 font-mono">{item.time}</span>
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{item.type}</span>
                              {item.status === 'scheduled' && <span className="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full">已排期</span>}
                            </div>
                            <div className="text-xs font-medium text-gray-800">{item.title}</div>
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => setTab('operations')}
                      className="w-full mt-2 py-2 bg-blue-50 text-blue-500 text-xs font-semibold rounded-xl"
                    >
                      前往运营中心管理排期 →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 数据概览 */}
            <div className="grid grid-cols-4 gap-2">
              {statsCards.map((card: any) => (
                <button
                  key={card.label}
                  onClick={() => { if (card.action === 'topics') { setTab('materials'); setMatTab('topics') } else if (card.action === 'knowledge') { setTab('materials'); setMatTab('knowledge') } else setTab(card.action) }}
                  className="bg-white rounded-2xl p-3 shadow-sm text-center active:scale-95 transition-transform"
                >
                  <div className="text-lg mb-1">{card.icon}</div>
                  <div className="text-base font-black text-gray-900">{card.value}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                </button>
              ))}
            </div>

            {/* 智能任务清单 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-gray-900 text-sm">✅ 今日任务</div>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{completedCount}/{totalCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {completedCount === totalCount && totalCount > 0 && (
                    <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full font-bold">全部完成 🎉</span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {todayTasks.map((task: any) => {
                  const cfg = priorityConfig[task.priority]
                  const done = completedTasks.has(task.id)
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${done ? 'opacity-50' : ''}`}
                    >
                      {/* 勾选框 */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-green-400 border-green-400' : `border-gray-200 ${cfg.bg}`}`}
                      >
                        {done && <span className="text-white text-[10px] font-black">✓</span>}
                      </button>
                      {/* 任务内容 */}
                      <button
                        onClick={() => handleTaskAction(task.action)}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${cfg.bg}`}>
                          {task.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.label}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{task.desc}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.tagBg}`}>{task.tag}</span>
                          {!done && <span className="text-gray-300 text-xs">→</span>}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 今日 & 明日发布计划 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div className="font-bold text-gray-900 text-sm">📅 发布计划</div>
                <button onClick={() => setTab('operations')} className="text-xs text-blue-500 font-medium">管理 →</button>
              </div>
              {/* 今日 */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">今日</span>
                  {todaySchedule.length > 0 && <span className="text-[10px] text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full">{todaySchedule.length} 条</span>}
                </div>
                {todaySchedule.length === 0 ? (
                  <div className="flex items-center gap-2 py-2 mb-2">
                    <span className="text-gray-300 text-sm">📭</span>
                    <span className="text-xs text-gray-400">今日暂无排期</span>
                    <button onClick={() => setTab('operations')} className="text-xs text-blue-400 font-medium ml-auto">+ 添加</button>
                  </div>
                ) : (
                  <div className="space-y-2 mb-2">
                    {todaySchedule.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 py-1.5">
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
              {/* 明日 */}
              <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">明日</span>
                  {tomorrowSchedule.length > 0 && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{tomorrowSchedule.length} 条</span>}
                </div>
                {tomorrowSchedule.length === 0 ? (
                  <div className="flex items-center gap-2 py-1">
                    <span className="text-gray-300 text-sm">📭</span>
                    <span className="text-xs text-gray-400">明日暂无排期</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tomorrowSchedule.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 py-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-200" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-600 truncate">{s.title}</div>
                          <div className="text-[10px] text-gray-400">{s.time} · {s.platform}</div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400 flex-shrink-0">{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 快捷入口 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">⚡ 快捷入口</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '📡', label: '情报雷达', action: () => { setTab('materials'); setMatTab('hotspot') }, color: 'bg-blue-50' },
                  { icon: '💡', label: '生成选题', action: () => { setTab('materials'); setMatTab('topics') }, color: 'bg-purple-50' },
                  { icon: '✍️', label: '写文案', action: () => setTab('content'), color: 'bg-green-50' },
                  { icon: '🎬', label: '做视频', action: () => setTab('video'), color: 'bg-orange-50' },
                  { icon: '📊', label: '运营中心', action: () => setTab('operations'), color: 'bg-red-50' },
                  { icon: '🎨', label: '风格模板', action: () => { setTab('materials'); setMatTab('style') }, color: 'bg-pink-50' },
                  { icon: '👥', label: '博主追踪', action: () => { setTab('materials'); setMatTab('creator') }, color: 'bg-cyan-50' },
                  { icon: '⚡', label: '超级生成', action: () => { setTab('materials'); setMatTab('knowledge'); setTimeout(()=>setShowSuperGen(true),300) }, color: 'bg-gradient-to-br from-purple-50 to-pink-50' },
                  { icon: '🧠', label: '知识库', action: () => { setTab('materials'); setMatTab('knowledge') }, color: 'bg-indigo-50' },
                  { icon: '📥', label: '导出数据', action: () => { setTab('profile') }, color: 'bg-teal-50' },
                  { icon: '🎯', label: '账号定位', action: onPositioning, color: 'bg-amber-50' },
                ].map((item: any, i: number) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className={`${item.color} rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{item.label}</span>
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
                <div className="space-y-2.5">
                  {hotspots.slice(0, 4).map((h: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-xs font-black w-5 text-center flex-shrink-0 ${i === 0 ? 'text-red-400' : i === 1 ? 'text-orange-400' : i === 2 ? 'text-amber-400' : 'text-gray-300'}`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-800 truncate">{h.title}</div>
                        {h.desc && <div className="text-[10px] text-gray-400 truncate mt-0.5">{h.desc}</div>}
                      </div>
                      {h.heat && <span className="text-[10px] text-red-400 font-bold flex-shrink-0">{h.heat}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最近文案 */}
            {savedContents.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 text-sm">💾 最近文案</div>
                  <button onClick={() => setTab('content')} className="text-xs text-blue-500 font-medium">查看全部 →</button>
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

            {/* 添加账号弹层 */}
            {showAddAcc && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-gray-900 text-sm">➕ 添加账号</div>
                  <button onClick={() => setShowAddAcc(false)} className="text-gray-400 text-sm">✕</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">账号名称</div>
                    <input
                      value={newAccName}
                      onChange={(e: any) => setNewAccName(e.target.value)}
                      placeholder="例：美食探店号"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">行业方向</div>
                    <input
                      value={newAccIndustry}
                      onChange={(e: any) => setNewAccIndustry(e.target.value)}
                      placeholder="例：美食、健身、教育..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-2">选择图标</div>
                    <div className="flex gap-2 flex-wrap">
                      {EMOJIS.map((e: string) => (
                        <button
                          key={e}
                          onClick={() => setNewAccEmoji(e)}
                          className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${newAccEmoji === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-100'}`}
                        >{e}</button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { addAccount(); setShowAddAcc(false) }}
                    disabled={!newAccName}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold disabled:opacity-40"
                  >
                    创建账号
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )
    }
    

function Materials({ acc, matTab, setMatTab, hotspots, aiTopics, topicsLoading, generateTopics, topicFilter, setTopicFilter, topicSearch, setTopicSearch, batchCount, setBatchCount, topicCategories, selectedCategory, setSelectedCategory, useTopic, savedContents, savedTopics, saveTopic, creatorUrl, setCreatorUrl, creatorLoading, creatorData, setCreatorData, trackedCreators, setTrackedCreators, scrapeCreator, showToast, radarData, radarLoading, fetchRadar, styleTemplates, styleLoading, styleUrl, setStyleUrl, styleName, setStyleName, styleText, setStyleText, analyzeStyle, applyTemplate, deleteTemplate, saveToLocal, setTab, setVideoCopy, setShowAiPanel, creatorAnalysisTab, setCreatorAnalysisTab, selectedScript, setSelectedScript, showScriptDetail, setShowScriptDetail, knowledgeItems, knowledgeInput, setKnowledgeInput, knowledgeTitle, setKnowledgeTitle, knowledgeCategory, setKnowledgeCategory, showAddKnowledge, setShowAddKnowledge, knowledgeSearch, setKnowledgeSearch, addKnowledgeItem, deleteKnowledgeItem, showSuperGen, setShowSuperGen, superGenLoading, superGenResult, setSuperGenResult, superGenTopic, setSuperGenTopic, superGenHotspot, setSuperGenHotspot, superGenStyle, setSuperGenStyle, superGenKnowledge, setSuperGenKnowledge, superGenerate, acc: accProp, trendingItems, trendingLoading, trendingCategory, setTrendingCategory, trendingSort, setTrendingSort, fetchTrendingMaterials }: any) {
  const TABS = [
    { id: 'hotspot', label: '🔥 热点' },
    { id: 'trending', label: '💎 爆款' },
    { id: 'topics', label: '💡 选题库' },
    { id: 'radar', label: '📡 情报' },
    { id: 'creator', label: '🎯 博主' },
    { id: 'style', label: '🎨 风格' },
    { id: 'knowledge', label: '🧠 知识库' },
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

                {/* ── 爆款素材 Tab ── */}
            {matTab === 'trending' && (
              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <div className="flex gap-2">
                    <button onClick={() => setTrendingSort('heat')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${trendingSort === 'heat' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>🔥 热度</button>
                    <button onClick={() => setTrendingSort('relevance')} className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${trendingSort === 'relevance' ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>🎯 相关</button>
                  </div>
                  <button onClick={fetchTrendingMaterials} disabled={trendingLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-xs font-bold disabled:opacity-60 active:scale-95 transition-all">
                    {trendingLoading ? <><Spinner /><span>抓取中...</span></> : <><span>⚡</span><span>一键抓取</span></>}
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-3">
                  {['全部', '娱乐', '教育', '生活', '美食', '科技', '情感', '搞笑', '励志', '行业'].map(cat => (
                    <button key={cat} onClick={() => setTrendingCategory(cat)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${trendingCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>{cat}</button>
                  ))}
                </div>
                {trendingItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-5xl mb-4">💎</div>
                    <p className="text-gray-500 font-semibold mb-1">点击「一键抓取」获取爆款素材</p>
                    <p className="text-xs text-gray-400">AI 自动分析全平台热门内容<br/>并评估与你账号的相关性</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...trendingItems]
                      .filter(item => trendingCategory === '全部' || item.category === trendingCategory)
                      .sort((a, b) => trendingSort === 'heat' ? b.heat - a.heat : b.relevance - a.relevance)
                      .map((item: any) => (
                        <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{item.platform}</span>
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-500 rounded-full">{item.category}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 leading-snug">{item.title}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-xs text-orange-500 font-bold">🔥{item.heat}</span>
                              <span className="text-xs text-blue-500 font-bold">🎯{item.relevance}%</span>
                            </div>
                          </div>
                          {item.angle && <div className="bg-blue-50 rounded-xl px-3 py-2 mb-2"><p className="text-xs text-blue-600">💡 {item.angle}</p></div>}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                              {(item.tags || []).map((tag: string) => <span key={tag} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full">{tag}</span>)}
                            </div>
                            <button onClick={() => useTopic(item.title)} className="flex-shrink-0 px-3 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all">用于选题</button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

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
                    <p className="text-xs text-gray-400">没有找到匹配的选题，换个关键词试试</p>
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
                    {radarData.dataSource && (
                      <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${radarData.dataSource.includes('真实') ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {radarData.dataSource.includes('真实') ? '🌐 实时热点' : '🤖 AI生成'}
                      </span>
                    )}
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
                {/* 分析 Tab 切换 */}
                {creatorData.analysis && (
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-100">
                      {[
                        {id:'overview', label:'📊 概览'},
                        {id:'pattern', label:'🔥 规律'},
                        {id:'scripts', label:'📝 文案库'},
                        {id:'copy', label:'✍️ 复用'},
                      ].map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => setCreatorAnalysisTab(t.id)}
                          className={`flex-1 py-2.5 text-[11px] font-bold transition-all ${creatorAnalysisTab === t.id ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-50/50' : 'text-gray-400'}`}
                        >{t.label}</button>
                      ))}
                    </div>

                    <div className="p-4">
                      {/* 概览 Tab */}
                      {creatorAnalysisTab === 'overview' && (
                        <div className="space-y-3">
                          {/* 核心数据 */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              {label:'视频数', val: creatorData.videos?.length || 0, unit:'条'},
                              {label:'平均点赞', val: Math.round((creatorData.videos?.reduce((a: number, v: any) => a + (v.likes||0), 0) || 0) / (creatorData.videos?.length || 1)), unit:''},
                              {label:'爆款率', val: Math.round(((creatorData.videos?.filter((v: any) => (v.likes||0) > 1000).length || 0) / (creatorData.videos?.length || 1)) * 100), unit:'%'},
                            ].map((s: any) => (
                              <div key={s.label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                                <div className="text-base font-black text-gray-900">{s.val >= 10000 ? (s.val/10000).toFixed(1)+'w' : s.val}{s.unit}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                              </div>
                            ))}
                          </div>
                          {/* 内容类型分布 */}
                          {creatorData.analysis.contentRatio && (
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-2">内容类型分布</div>
                              <div className="space-y-1.5">
                                {Object.entries(creatorData.analysis.contentRatio).map(([type, pct]: [string, any]) => (
                                  <div key={type} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-16 flex-shrink-0">{type}</span>
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 w-8 text-right">{pct}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* 借鉴建议 */}
                          {creatorData.analysis.recommendation && (
                            <div className="bg-blue-50 rounded-xl p-3">
                              <div className="text-xs text-blue-500 font-semibold mb-1">💡 借鉴建议</div>
                              <div className="text-xs text-blue-700 leading-relaxed">{creatorData.analysis.recommendation}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 规律 Tab */}
                      {creatorAnalysisTab === 'pattern' && (
                        <div className="space-y-3">
                          {/* 爆款规律 */}
                          {creatorData.analysis.topPatterns && (
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-2">🔥 爆款内容规律</div>
                              <div className="space-y-2">
                                {creatorData.analysis.topPatterns.map((p: string, i: number) => (
                                  <div key={i} className="flex gap-2.5 items-start bg-gray-50 rounded-xl p-2.5">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${i === 0 ? 'bg-red-400' : i === 1 ? 'bg-orange-400' : 'bg-blue-400'}`}>{i + 1}</span>
                                    <span className="text-xs text-gray-700 leading-relaxed">{p}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* 常用钩子 */}
                          {creatorData.analysis.hookTypes && (
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-2">🎣 常用开场钩子</div>
                              <div className="flex flex-wrap gap-1.5">
                                {creatorData.analysis.hookTypes.map((h: string, i: number) => (
                                  <span key={i} className="text-xs bg-orange-50 text-orange-500 px-2.5 py-1 rounded-full font-medium">{h}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* 发布规律 */}
                          <div className="bg-purple-50 rounded-xl p-3">
                            <div className="text-xs text-purple-600 font-semibold mb-1.5">📅 发布规律</div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                              <div>📊 平均每周 {Math.round((creatorData.videos?.length || 0) / 4)} 条</div>
                              <div>⏱️ 平均时长 {creatorData.analysis.avgDuration || '1-3分钟'}</div>
                              <div>🏆 最佳类型 {creatorData.analysis.bestType || '干货分享'}</div>
                              <div>🎯 核心受众 {creatorData.analysis.audience || '职场人群'}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 文案库 Tab */}
                      {creatorAnalysisTab === 'scripts' && (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 mb-2">点击视频查看完整口播文案</div>
                          {creatorData.videos?.filter((v: any) => v.script).map((v: any, i: number) => (
                            <div
                              key={i}
                              onClick={() => { setSelectedScript(v); setShowScriptDetail(true) }}
                              className="border border-gray-100 rounded-xl p-3 cursor-pointer active:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="text-xs font-semibold text-gray-800 flex-1 line-clamp-1">{v.title}</div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${v.type === '干货分享' ? 'bg-blue-50 text-blue-400' : v.type === '情感共鸣' ? 'bg-pink-50 text-pink-400' : 'bg-green-50 text-green-400'}`}>{v.type}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 mb-1.5">
                                👍 {(v.likes||0).toLocaleString()} · 💬 {(v.comments||0).toLocaleString()} · ⭐ {(v.collects||0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{v.script}</div>
                              <div className="text-[10px] text-blue-400 mt-1.5 font-medium">点击查看完整文案 →</div>
                            </div>
                          ))}
                          {!creatorData.videos?.some((v: any) => v.script) && (
                            <div className="text-center py-6">
                              <div className="text-2xl mb-2">📝</div>
                              <p className="text-xs text-gray-400">暂无提取到口播文案</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 复用 Tab */}
                      {creatorAnalysisTab === 'copy' && (
                        <div className="space-y-3">
                          <div className="bg-amber-50 rounded-xl p-3">
                            <div className="text-xs text-amber-700 font-semibold mb-1">✍️ 文案结构复用</div>
                            <div className="text-xs text-amber-600 leading-relaxed">选择一个爆款视频的文案结构，AI 将帮你套用到自己的内容上</div>
                          </div>
                          {creatorData.videos?.slice(0, 5).map((v: any, i: number) => (
                            <div key={i} className="border border-gray-100 rounded-xl p-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="text-xs font-semibold text-gray-800 flex-1 line-clamp-1">{v.title}</div>
                                <span className="text-[10px] text-red-500 font-bold flex-shrink-0">👍{(v.likes||0) >= 10000 ? ((v.likes||0)/10000).toFixed(1)+'w' : (v.likes||0)}</span>
                              </div>
                              {v.hook && (
                                <div className="text-[10px] text-orange-500 bg-orange-50 px-2 py-1 rounded-lg mb-2">
                                  🎣 开场钩子：{v.hook}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  onClick={() => {
                                    const text = v.script || v.title
                                    navigator.clipboard?.writeText(text)
                                    showToast('✅ 文案已复制')
                                  }}
                                  className="py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl active:scale-[0.97] transition-transform"
                                >📋 复制文案</button>
                                <button
                                  onClick={() => {
                                    const text = v.script || v.title
                                    setVideoCopy(text)
                                    setTab('content')
                                    showToast('✅ 已导入文案生成页')
                                  }}
                                  className="py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-xl active:scale-[0.97] transition-transform"
                                >✍️ 仿写文案</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                        {expandedVideo === i && (
                          <div className="px-3 pb-3 border-t border-gray-50">
                            {v.tags && (
                              <div className="flex flex-wrap gap-1 py-2">
                                {v.tags.map((tag: string, ti: number) => (
                                  <span key={ti} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                                ))}
                                <span className="text-[10px] text-gray-400 ml-1">{v.publishDate}</span>
                              </div>
                            )}
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

        {/* 文案详情弹窗 */}
        {showScriptDetail && selectedScript && (
          <div className="absolute inset-0 bg-black/40 z-50 flex flex-col rounded-[50px] overflow-hidden" onClick={() => setShowScriptDetail(false)}>
            <div className="flex-1" />
            <div className="bg-white rounded-t-3xl p-5 pb-8 max-h-[85%] flex flex-col" onClick={(e: any) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">📝 口播文案详情</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{selectedScript.title}</p>
                </div>
                <button onClick={() => setShowScriptDetail(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">✕</button>
              </div>
              {/* 数据 */}
              <div className="flex gap-3 mb-3 flex-shrink-0">
                {[
                  {label:'点赞', val: selectedScript.likes, icon:'👍'},
                  {label:'评论', val: selectedScript.comments, icon:'💬'},
                  {label:'收藏', val: selectedScript.collects, icon:'⭐'},
                ].map((d: any) => (
                  <div key={d.label} className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                    <div className="text-sm font-black text-gray-800">{(d.val||0) >= 10000 ? ((d.val||0)/10000).toFixed(1)+'w' : (d.val||0)}</div>
                    <div className="text-[10px] text-gray-400">{d.icon} {d.label}</div>
                  </div>
                ))}
              </div>
              {/* 开场钩子 */}
              {selectedScript.hook && (
                <div className="bg-orange-50 rounded-xl p-3 mb-3 flex-shrink-0">
                  <div className="text-[10px] text-orange-500 font-semibold mb-1">🎣 开场钩子</div>
                  <div className="text-xs text-orange-700 font-medium">{selectedScript.hook}</div>
                </div>
              )}
              {/* 完整文案 */}
              <div className="flex-1 overflow-y-auto">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 font-medium mb-2">完整口播文案 ({selectedScript.script?.length || 0} 字)</div>
                  <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedScript.script || '暂无文案'}</div>
                </div>
              </div>
              {/* 操作按钮 */}
              <div className="grid grid-cols-2 gap-2 mt-4 flex-shrink-0">
                <button
                  onClick={() => { navigator.clipboard?.writeText(selectedScript.script || ''); showToast('✅ 文案已复制') }}
                  className="py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl text-sm active:scale-[0.98] transition-transform"
                >📋 复制文案</button>
                <button
                  onClick={() => {
                    setVideoCopy(selectedScript.script || selectedScript.title)
                    setTab('content')
                    setShowScriptDetail(false)
                    showToast('✅ 已导入，开始仿写')
                  }}
                  className="py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] transition-transform"
                >✍️ 仿写文案</button>
              </div>
            </div>
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

        {/* ── 知识库 Tab ── */}
        {matTab === 'knowledge' && (
          <div className="space-y-3 pb-4">
            {/* 顶部操作栏 */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 shadow-sm">
                <span className="text-gray-400 text-sm">🔍</span>
                <input
                  value={knowledgeSearch}
                  onChange={e => setKnowledgeSearch(e.target.value)}
                  placeholder="搜索知识库..."
                  className="flex-1 text-xs outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => setShowAddKnowledge(true)}
                className="flex-shrink-0 px-3 py-2.5 bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-sm active:scale-95"
              >+ 添加</button>
            </div>

            {/* 超级生成入口卡片 */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="font-black text-white text-sm">超级文案生成</div>
                  <div className="text-white/80 text-[10px]">热点 × 知识库 × 风格 三合一</div>
                </div>
              </div>
              <p className="text-white/90 text-xs leading-relaxed mb-3">
                结合今日热点 + 你的专业知识库 + 账号风格，生成独一无二的高质量文案
              </p>
              <button
                onClick={() => setShowSuperGen(true)}
                className="w-full py-2.5 bg-white text-purple-600 font-black text-sm rounded-xl active:scale-[0.98] transition-all"
              >🚀 立即生成</button>
            </div>

            {/* 知识库统计 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '全部知识', count: knowledgeItems.length, icon: '📚', color: 'bg-blue-50 text-blue-600' },
                { label: '专业知识', count: knowledgeItems.filter((k:any)=>k.category==='专业知识').length, icon: '🎓', color: 'bg-purple-50 text-purple-600' },
                { label: '案例经验', count: knowledgeItems.filter((k:any)=>k.category==='案例经验').length, icon: '💡', color: 'bg-amber-50 text-amber-600' },
              ].map((s,i) => (
                <div key={i} className={`${s.color} rounded-2xl p-3 text-center`}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="font-black text-lg">{s.count}</div>
                  <div className="text-[10px] font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* 知识库列表 */}
            {knowledgeItems.length === 0 ? (
              <EmptyState
                icon="🧠"
                title="知识库还是空的"
                desc="添加你的专业知识、行业经验、成功案例，AI 生成文案时会自动调用"
                action="添加第一条知识"
                onAction={() => setShowAddKnowledge(true)}
              />
            ) : (
              <div className="space-y-2">
                {knowledgeItems
                  .filter((k:any) => !knowledgeSearch || k.title.includes(knowledgeSearch) || k.content.includes(knowledgeSearch))
                  .map((item: any) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            item.category === '专业知识' ? 'bg-blue-50 text-blue-500' :
                            item.category === '案例经验' ? 'bg-amber-50 text-amber-500' :
                            item.category === '行业洞察' ? 'bg-purple-50 text-purple-500' :
                            'bg-gray-100 text-gray-500'
                          }`}>{item.category}</span>
                          <span className="text-[10px] text-gray-400">{item.wordCount} 字</span>
                        </div>
                        <div className="font-bold text-gray-900 text-sm">{item.title}</div>
                      </div>
                      <button
                        onClick={() => deleteKnowledgeItem(item.id)}
                        className="text-gray-300 text-lg active:text-red-400 flex-shrink-0"
                      >🗑️</button>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{item.content}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <span className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                      <button
                        onClick={() => { setSuperGenKnowledge([item.id]); setShowSuperGen(true) }}
                        className="text-[10px] text-purple-500 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg active:scale-95"
                      >用此知识生成文案 →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 添加知识弹窗 */}
            {showAddKnowledge && (
              <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={() => setShowAddKnowledge(false)}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-8 animate-slide-bottom" onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <div className="font-black text-gray-900 text-base mb-4">🧠 添加知识</div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">知识标题</label>
                      <input
                        value={knowledgeTitle}
                        onChange={e => setKnowledgeTitle(e.target.value)}
                        placeholder="如：本地餐饮选址的3个核心要素"
                        className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">分类</label>
                      <div className="flex gap-2 flex-wrap">
                        {['专业知识', '案例经验', '行业洞察', '用户痛点', '产品卖点'].map(cat => (
                          <button
                            key={cat}
                            onClick={() => setKnowledgeCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${knowledgeCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                          >{cat}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">知识内容</label>
                      <textarea
                        value={knowledgeInput}
                        onChange={e => setKnowledgeInput(e.target.value)}
                        placeholder="详细描述你的专业知识、行业经验或成功案例...&#10;&#10;例如：我在餐饮行业10年，发现选址最重要的是：1.人流量要看早中晚三个时段...&#10;&#10;AI 会在生成文案时自动调用这些内容，让文案更专业、更有说服力。"
                        className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-36 leading-relaxed"
                      />
                      <div className="text-right text-[10px] text-gray-400 mt-1">{knowledgeInput.length} 字</div>
                    </div>
                    <button
                      onClick={addKnowledgeItem}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm active:scale-[0.98] shadow-md"
                    >✅ 保存到知识库</button>
                  </div>
                </div>
              </div>
            )}

            {/* 超级生成弹窗 */}
            {showSuperGen && (
              <div className="fixed inset-0 z-[300] flex items-end justify-center" onClick={() => { if (!superGenLoading) setShowSuperGen(false) }}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-8 animate-slide-bottom max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <div className="font-black text-gray-900 text-base">超级文案生成</div>
                      <div className="text-xs text-gray-400">热点 × 知识库 × 风格 三合一</div>
                    </div>
                  </div>

                  {superGenResult.length === 0 ? (
                    <div className="space-y-4">
                      {/* 选题输入 */}
                      <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1.5 block">📌 选题 <span className="text-red-400">*</span></label>
                        <input
                          value={superGenTopic}
                          onChange={e => setSuperGenTopic(e.target.value)}
                          placeholder="输入你想做的视频选题..."
                          className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
                        />
                      </div>

                      {/* 结合热点 */}
                      <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1.5 block">🔥 结合热点（可选）</label>
                        <input
                          value={superGenHotspot}
                          onChange={e => setSuperGenHotspot(e.target.value)}
                          placeholder="粘贴今日热点话题，如：#五一出行攻略..."
                          className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
                        />
                      </div>

                      {/* 参考风格 */}
                      <div>
                        <label className="text-xs text-gray-500 font-semibold mb-1.5 block">🎨 参考风格（可选）</label>
                        <input
                          value={superGenStyle}
                          onChange={e => setSuperGenStyle(e.target.value)}
                          placeholder="描述你的风格，如：犀利直接、有争议性..."
                          className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
                        />
                      </div>

                      {/* 选择知识库 */}
                      {knowledgeItems.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 font-semibold mb-1.5 block">🧠 调用知识库（可多选）</label>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {knowledgeItems.map((k: any) => (
                              <button
                                key={k.id}
                                onClick={() => setSuperGenKnowledge((prev: string[]) =>
                                  prev.includes(k.id) ? prev.filter((id: string) => id !== k.id) : [...prev, k.id]
                                )}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all ${superGenKnowledge.includes(k.id) ? 'bg-blue-50 border border-blue-300' : 'bg-gray-50 border border-transparent'}`}
                              >
                                <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs ${superGenKnowledge.includes(k.id) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                                  {superGenKnowledge.includes(k.id) ? '✓' : ''}
                                </span>
                                <span className="text-xs text-gray-700 truncate">{k.title}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{k.category}</span>
                              </button>
                            ))}
                          </div>
                          {knowledgeItems.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-2">知识库为空，先添加知识</p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={superGenerate}
                        disabled={superGenLoading || !superGenTopic.trim()}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-purple-200"
                      >
                        {superGenLoading
                          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>AI 深度生成中...</span>
                          : '⚡ 开始超级生成'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold text-gray-800">✅ 生成了 {superGenResult.length} 个版本</div>
                        <button onClick={() => setSuperGenResult([])} className="text-xs text-gray-400">重新生成</button>
                      </div>
                      {superGenResult.map((v: any, i: number) => (
                        <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                          <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-white font-black text-sm">版本 {i+1}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { try { navigator.clipboard.writeText(v.content); showToast('✅ 已复制') } catch {} }}
                                className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg"
                              >复制</button>
                              <button
                                onClick={() => { setTab('content'); showToast('✅ 已导入内容中心') }}
                                className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg"
                              >去编辑</button>
                            </div>
                          </div>
                          <div className="p-4">
                            {v.hook && <div className="bg-orange-50 rounded-xl px-3 py-2 mb-3 flex gap-2"><span>🎣</span><span className="text-xs text-orange-600 font-medium">{v.hook}</span></div>}
                            <p className="text-sm text-gray-800 leading-relaxed">{v.content}</p>
                            <div className="text-[10px] text-gray-400 mt-2">{v.content?.length || 0} 字 · ≈ {Math.ceil((v.content?.length||0)/4)} 秒</div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => { setShowSuperGen(false); setSuperGenResult([]) }}
                        className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm"
                      >完成</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}



    function ContentCenter({ acc, showToast, savedContents, setSavedContents, savedTopics, setTab }: any) {
      const [step, setStep] = React.useState(1)
      const [selectedTopic, setSelectedTopic] = React.useState('')
      const [style, setStyle] = React.useState('犀利观点')
      const [loading, setLoading] = React.useState(false)
      const [versions, setVersions] = React.useState<any[]>([])
      const [history, setHistory] = React.useState<any[]>([])
      const [compareMode, setCompareMode] = React.useState(false)
      const [showTemplates, setShowTemplates] = React.useState(false)
      const [showStyleAnalysis, setShowStyleAnalysis] = React.useState(false)
      const [analysisInput, setAnalysisInput] = React.useState('')
      const [analysisResult, setAnalysisResult] = React.useState<any>(null)
      const [analysisLoading, setAnalysisLoading] = React.useState(false)
      const [customTemplates, setCustomTemplates] = React.useState<any[]>([])
      const [newTemplateName, setNewTemplateName] = React.useState('')
      const [newTemplatePrompt, setNewTemplatePrompt] = React.useState('')
      const [showAddTemplate, setShowAddTemplate] = React.useState(false)

      const BUILTIN_TEMPLATES = [
        { id: 'hook', name: '问题钩子', icon: '🎣', desc: '用问题开头，引发好奇', prompt: '用一个尖锐的问题开头，引发读者强烈好奇心，然后给出意想不到的答案' },
        { id: 'contrast', name: '对比故事', icon: '⚡', desc: '前后对比，制造反差', prompt: '用"以前...现在..."的对比结构，制造强烈反差感，让读者产生共鸣' },
        { id: 'list', name: '干货清单', icon: '📋', desc: '数字列表，清晰实用', prompt: '用"X个方法/技巧/秘诀"的清单形式，每条简洁有力，让读者觉得干货满满' },
        { id: 'sharp', name: '犀利观点', icon: '🔥', desc: '直接表达，有争议性', prompt: '用犀利、有争议的观点开头，敢于说别人不敢说的，引发讨论' },
        { id: 'humor', name: '幽默自嘲', icon: '😄', desc: '自嘲拉近距离', prompt: '用幽默自嘲的方式开头，让读者觉得真实可爱，拉近距离后再给出干货' },
        { id: 'inspire', name: '励志行动', icon: '💪', desc: '激励行动，正能量', prompt: '用激励性的语言，让读者感受到紧迫感和行动力，结尾给出明确的行动指引' },
      ]

      async function generateCopy() {
        if (!selectedTopic.trim()) { showToast('请先输入选题'); return }
        setLoading(true)
        try {
          const selectedTemplate = [...BUILTIN_TEMPLATES, ...customTemplates].find(t => t.name === style)
          const stylePrompt = selectedTemplate ? selectedTemplate.prompt : style
          const res = await fetch('/api/generate-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicTitle: selectedTopic, style: stylePrompt,
              accountName: acc?.name || '', industry: acc?.industry || '',
              positioning: acc?.positioning || '', targetAudience: acc?.targetAudience || '',
            })
          })
          const data = await res.json()
          if (data.versions) {
            setVersions(data.versions)
            setHistory((prev: any[]) => [{ topic: selectedTopic, style, versions: data.versions, time: Date.now() }, ...prev.slice(0, 9)])
            setStep(2); showToast('✅ 文案生成成功')
          } else { showToast(data.error || '生成失败，请重试') }
        } catch { showToast('网络错误，请重试') } finally { setLoading(false) }
      }

      async function analyzeStyle() {
        if (!analysisInput.trim()) { showToast('请粘贴文案内容'); return }
        setAnalysisLoading(true)
        try {
          const res = await fetch('/api/generate-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicTitle: '分析以下文案的风格特征', style: '风格分析',
              userInput: `请分析以下文案的风格特征，返回JSON格式：\n{"style":"风格名称","tone":"语气特点","structure":"结构特点","hookType":"钩子类型","strengths":["优势1"],"suggestions":["建议1"],"score":85}\n\n文案内容：\n${analysisInput}`,
              accountName: acc?.name || '',
            })
          })
          const data = await res.json()
          if (data.versions?.[0]?.content) {
            try {
              const jsonMatch = data.versions[0].content.match(/\{[\s\S]*\}/)
              if (jsonMatch) { setAnalysisResult(JSON.parse(jsonMatch[0])); showToast('✅ 风格分析完成') }
              else { setAnalysisResult({ style: '分析完成', tone: '见下方', structure: '见下方', hookType: '见下方', strengths: [data.versions[0].content], suggestions: [], score: 80 }); showToast('✅ 分析完成') }
            } catch { setAnalysisResult({ style: '分析完成', tone: '见下方', structure: '见下方', hookType: '见下方', strengths: [data.versions[0].content], suggestions: [], score: 80 }); showToast('✅ 分析完成') }
          } else { showToast('分析失败，请重试') }
        } catch { showToast('网络错误') } finally { setAnalysisLoading(false) }
      }

      function saveContent(v: any) {
        setSavedContents((prev: any[]) => [{ id: Date.now(), topic: selectedTopic, content: v.content, style: v.style, hook: v.hook, time: Date.now() }, ...prev])
        showToast('✅ 已保存到素材库')
      }

      const allTemplates = [...BUILTIN_TEMPLATES, ...customTemplates]

      return (
        <div className="flex flex-col h-full bg-[#F2F2F7]">
          <div className="px-5 pt-12 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-black text-gray-900">内容中心</h1>
              <button onClick={() => setShowTemplates(true)} className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 text-xs font-bold rounded-xl active:scale-95">📋 模板</button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={step >= 1 ? 'text-purple-500 font-semibold' : ''}>① 选题</span>
              <span>→</span>
              <span className={step >= 2 ? 'text-purple-500 font-semibold' : ''}>② 文案</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
            {step === 1 && (
              <>
                <div onClick={() => setShowStyleAnalysis(true)} className="bg-gradient-to-r from-violet-500 to-purple-400 rounded-2xl p-4 text-white cursor-pointer active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">🔍</div>
                    <div className="flex-1"><div className="font-bold text-sm">AI 风格分析</div><div className="text-white/80 text-xs mt-0.5">粘贴任意文案，AI 分析风格特征并生成模板</div></div>
                    <span className="text-white/60 text-lg">›</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="font-bold text-gray-900 text-sm mb-2">💡 选题</div>
                  <textarea value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} placeholder="输入选题，例如：普通人如何用 AI 副业月入过万..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20 leading-relaxed" />
                  {savedTopics?.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] text-gray-400 mb-1.5">📌 已保存选题</div>
                      <div className="flex flex-wrap gap-1.5">
                        {savedTopics.slice(0, 4).map((t: any, i: number) => (
                          <button key={i} onClick={() => setSelectedTopic(t.title || t)} className="text-[11px] bg-blue-50 text-blue-500 px-2.5 py-1 rounded-lg font-medium active:scale-95 max-w-[140px] truncate">{t.title || t}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-gray-900 text-sm">🎨 文案风格</div>
                    <button onClick={() => setShowTemplates(true)} className="text-[11px] text-purple-500 font-semibold">更多模板 ›</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {allTemplates.slice(0, 6).map((t: any) => (
                      <button key={t.id || t.name} onClick={() => setStyle(t.name)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${style === t.name ? 'bg-purple-50 border-2 border-purple-400 text-purple-700' : 'bg-gray-50 border-2 border-transparent text-gray-600'}`}>
                        <span className="text-base">{t.icon || '✍️'}</span><span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {history.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="font-bold text-gray-900 text-sm mb-2">🕐 最近生成</div>
                    <div className="space-y-2">
                      {history.slice(0, 3).map((h: any, i: number) => (
                        <button key={i} onClick={() => { setSelectedTopic(h.topic); setStyle(h.style); setVersions(h.versions); setStep(2) }} className="w-full text-left px-3 py-2.5 bg-gray-50 rounded-xl active:scale-[0.98]">
                          <div className="text-xs font-semibold text-gray-800 truncate">{h.topic}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{h.style}</span>
                            <span className="text-[10px] text-gray-400">{h.versions?.length || 0} 个版本</span>
                            <span className="text-[10px] text-blue-400 font-semibold ml-auto">恢复 →</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={generateCopy} disabled={loading || !selectedTopic.trim()} className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all shadow-md">
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>AI 生成中...</span> : '✨ 生成3个版本文案'}
                </button>
              </>
            )}
            {step === 2 && (
              <>
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep(1)} className="text-sm text-gray-400">← 返回</button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCompareMode(!compareMode)} className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${compareMode ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{compareMode ? '退出对比' : '对比模式'}</button>
                    <button onClick={() => { const text = versions.map((v: any, i: number) => `【版本${i+1} · ${v.style}】\n钩子：${v.hook}\n\n${v.content}`).join('\n\n---\n\n'); try { navigator.clipboard.writeText(text); showToast('✅ 已复制全部版本') } catch {} }} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500">复制全部</button>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                  <span className="text-sm">💡</span><span className="text-xs text-blue-700 font-medium truncate">{selectedTopic}</span>
                </div>
                <div className="space-y-3">
                  {versions.map((v: any, i: number) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-400 px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2"><span className="text-white font-black text-sm">版本 {i + 1}</span><span className="text-white/80 text-xs">{v.style}</span></div>
                        <div className="flex gap-2">
                          <button onClick={() => saveContent(v)} className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg active:scale-95">保存</button>
                          <button onClick={() => { try { navigator.clipboard.writeText(v.content); showToast('✅ 已复制') } catch {} }} className="text-[10px] font-bold text-white bg-white/20 px-2.5 py-1 rounded-lg active:scale-95">复制</button>
                        </div>
                      </div>
                      <div className="p-4">
                        {v.hook && <div className="flex items-start gap-2 mb-3 bg-orange-50 rounded-xl px-3 py-2"><span className="text-sm flex-shrink-0">🎣</span><span className="text-xs text-orange-600 font-medium leading-relaxed">{v.hook}</span></div>}
                        <p className="text-sm text-gray-800 leading-relaxed">{v.content}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-3"><span className="text-[11px] text-gray-400">{v.content?.length || 0} 字</span><span className="text-[11px] text-gray-400">≈ {Math.ceil((v.content?.length || 0) / 4)} 秒</span></div>
                          <button onClick={() => { setTab('video'); showToast('✅ 已跳转到视频生成') }} className="text-[11px] font-bold text-purple-500 bg-purple-50 px-3 py-1.5 rounded-xl active:scale-95">去生成视频 →</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setStep(1); setVersions([]) }} className="w-full py-3 bg-white rounded-2xl text-sm font-bold text-gray-500 shadow-sm active:scale-[0.98]">🔄 重新生成</button>
              </>
            )}
          </div>
          {showTemplates && (
            <div className="fixed inset-0 z-50 flex flex-col" style={{background:'rgba(0,0,0,0.5)'}}>
              <div className="flex-1" onClick={() => setShowTemplates(false)} />
              <div className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
                  <div className="font-black text-gray-900 text-base">📋 文案模板库</div>
                  <button onClick={() => setShowTemplates(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
                  <div className="text-xs text-gray-400 mb-1">内置模板</div>
                  {BUILTIN_TEMPLATES.map((t: any) => (
                    <div key={t.id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2"><span className="text-xl">{t.icon}</span><span className="font-bold text-gray-900 text-sm">{t.name}</span></div>
                        <button onClick={() => { setStyle(t.name); setShowTemplates(false); showToast(`✅ 已选择 ${t.name} 模板`) }} className="text-[11px] font-bold text-white bg-purple-500 px-3 py-1.5 rounded-xl active:scale-95">套用</button>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">{t.desc}</div>
                      <div className="text-[11px] text-gray-400 leading-relaxed bg-white rounded-xl px-3 py-2">{t.prompt}</div>
                    </div>
                  ))}
                  {customTemplates.length > 0 && (
                    <>
                      <div className="text-xs text-gray-400 mt-2 mb-1">自定义模板</div>
                      {customTemplates.map((t: any, i: number) => (
                        <div key={i} className="bg-purple-50 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2"><span className="text-xl">✍️</span><span className="font-bold text-gray-900 text-sm">{t.name}</span></div>
                            <div className="flex gap-1.5">
                              <button onClick={() => { setStyle(t.name); setShowTemplates(false); showToast(`✅ 已选择 ${t.name} 模板`) }} className="text-[11px] font-bold text-white bg-purple-500 px-2.5 py-1.5 rounded-xl active:scale-95">套用</button>
                              <button onClick={() => setCustomTemplates((prev: any[]) => prev.filter((_: any, j: number) => j !== i))} className="text-[11px] font-bold text-red-400 bg-red-50 px-2.5 py-1.5 rounded-xl active:scale-95">删除</button>
                            </div>
                          </div>
                          <div className="text-[11px] text-gray-500 leading-relaxed">{t.prompt}</div>
                        </div>
                      ))}
                    </>
                  )}
                  {showAddTemplate ? (
                    <div className="bg-white rounded-2xl p-4 border-2 border-purple-200">
                      <div className="font-bold text-gray-900 text-sm mb-3">新建模板</div>
                      <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="模板名称（如：专业干货）" className="w-full px-3 py-2 rounded-xl bg-gray-100 text-sm outline-none mb-2" />
                      <textarea value={newTemplatePrompt} onChange={e => setNewTemplatePrompt(e.target.value)} placeholder="描述这个风格的写作要求..." className="w-full px-3 py-2 rounded-xl bg-gray-100 text-sm outline-none resize-none h-20 mb-3" />
                      <div className="flex gap-2">
                        <button onClick={() => { if (!newTemplateName.trim() || !newTemplatePrompt.trim()) { showToast('请填写完整'); return } setCustomTemplates((prev: any[]) => [...prev, { id: Date.now(), name: newTemplateName, icon: '✍️', desc: '自定义模板', prompt: newTemplatePrompt }]); setNewTemplateName(''); setNewTemplatePrompt(''); setShowAddTemplate(false); showToast('✅ 模板已保存') }} className="flex-1 py-2.5 bg-purple-500 text-white text-xs font-bold rounded-xl active:scale-95">保存模板</button>
                        <button onClick={() => setShowAddTemplate(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-xl active:scale-95">取消</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddTemplate(true)} className="w-full py-3 border-2 border-dashed border-purple-200 rounded-2xl text-sm font-bold text-purple-400 active:scale-[0.98]">+ 新建自定义模板</button>
                  )}
                </div>
              </div>
            </div>
          )}
          {showStyleAnalysis && (
            <div className="fixed inset-0 z-50 flex flex-col" style={{background:'rgba(0,0,0,0.5)'}}>
              <div className="flex-1" onClick={() => { if (!analysisLoading) setShowStyleAnalysis(false) }} />
              <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
                  <div className="font-black text-gray-900 text-base">🔍 AI 风格分析</div>
                  <button onClick={() => setShowStyleAnalysis(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
                  {!analysisResult ? (
                    <>
                      <div className="text-xs text-gray-500 leading-relaxed bg-blue-50 rounded-xl px-3 py-2.5">💡 粘贴任意博主的文案，AI 将分析其风格特征，帮你快速掌握爆款写作套路</div>
                      <textarea value={analysisInput} onChange={e => setAnalysisInput(e.target.value)} placeholder="粘贴要分析的文案内容（建议 100 字以上）..." className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none resize-none h-40 leading-relaxed" />
                      <button onClick={analyzeStyle} disabled={analysisLoading || !analysisInput.trim()} className="w-full py-3.5 bg-gradient-to-r from-violet-500 to-purple-400 text-white font-bold rounded-2xl text-sm disabled:opacity-50 active:scale-[0.98] transition-all">
                        {analysisLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>AI 分析中...</span> : '🔍 开始分析'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-gradient-to-br from-violet-500 to-purple-400 rounded-2xl p-4 text-white">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-bold text-sm">分析结果</div>
                          <div className="flex items-center gap-1.5"><span className="text-white/80 text-xs">综合评分</span><span className="font-black text-lg">{analysisResult.score || 85}</span></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[{ label: '风格', value: analysisResult.style }, { label: '语气', value: analysisResult.tone }, { label: '结构', value: analysisResult.structure }, { label: '钩子', value: analysisResult.hookType }].map((item: any, i: number) => (
                            <div key={i} className="bg-white/20 rounded-xl px-3 py-2"><div className="text-white/70 text-[10px]">{item.label}</div><div className="text-white font-bold text-xs mt-0.5">{item.value}</div></div>
                          ))}
                        </div>
                      </div>
                      {analysisResult.strengths?.length > 0 && (
                        <div className="bg-green-50 rounded-2xl p-4">
                          <div className="font-bold text-green-700 text-sm mb-2">✅ 优势特点</div>
                          {analysisResult.strengths.map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5"><span className="w-4 h-4 rounded-full bg-green-200 text-green-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span><span className="text-xs text-green-700 leading-relaxed">{s}</span></div>
                          ))}
                        </div>
                      )}
                      {analysisResult.suggestions?.length > 0 && (
                        <div className="bg-orange-50 rounded-2xl p-4">
                          <div className="font-bold text-orange-700 text-sm mb-2">💡 优化建议</div>
                          {analysisResult.suggestions.map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5"><span className="text-orange-400 flex-shrink-0">→</span><span className="text-xs text-orange-700 leading-relaxed">{s}</span></div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => { const sn = analysisResult.style || '分析风格'; setCustomTemplates((prev: any[]) => [...prev, { id: Date.now(), name: sn, icon: '🔍', desc: '从分析中提取的风格：' + analysisResult.tone, prompt: '模仿以下风格特征写作：风格=' + analysisResult.style + '，语气=' + analysisResult.tone + '，结构=' + analysisResult.structure + '，钩子类型=' + analysisResult.hookType }]); setStyle(sn); setShowStyleAnalysis(false); showToast('✅ 已保存并套用 ' + sn + ' 风格') }} className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-400 text-white text-xs font-bold rounded-2xl active:scale-95">💾 保存并套用风格</button>
                        <button onClick={() => { setAnalysisResult(null); setAnalysisInput('') }} className="flex-1 py-3 bg-gray-100 text-gray-500 text-xs font-bold rounded-2xl active:scale-95">重新分析</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
    
function VideoStudio({ acc, step, setStep, copy: videoCopy, setCopy: setVideoCopy, voiceId, setVoiceId, speed, setSpeed, avatarType, setAvatarType, avatarPreset, setAvatarPreset, bgType, setBgType, bgColor, setBgColor, loading, audioB64, error, generateTTS, showToast, savedContents, setTab, setShowAiPanel, setQuickRecordData, setShowVideoRecord, videoSegments, setVideoSegments, segmentMode, setSegmentMode, activeSegment, setActiveSegment, segmentAudios, setSegmentAudios, segmentLoading, setSegmentLoading, subtitlePreview, setSubtitlePreview, subtitleLines, setSubtitleLines, currentSubLine, setCurrentSubLine, clonedVoices, setClonedVoices, isCloning, setIsCloning, cloneProgress, setCloneProgress, showClonePanel, setShowClonePanel, cloneVoiceName, setCloneVoiceName }: any) {
  const VOICES = [
    { id: 'female-shaonv', label: '少女音', emoji: '👧', desc: '清甜活泼，适合生活类' },
    { id: 'female-yujie', label: '御姐音', emoji: '👩', desc: '成熟知性，适合职场类' },
    { id: 'male-qingxin', label: '清新男声', emoji: '👦', desc: '阳光自然，适合日常类' },
    { id: 'male-chunhou', label: '醇厚男声', emoji: '🧔', desc: '低沉有力，适合干货类' },
    { id: 'audiobook-male-1', label: '播音腔', emoji: '🎙️', desc: '专业标准，适合资讯类' },
  ]
  // 声音克隆函数
  async function handleVoiceClone(audioBase64: string, audioFormat: string) {
    setIsCloning(true)
    setCloneProgress('正在上传音频...')
    try {
      const res = await fetch('/api/voice-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, audioFormat, voiceName: cloneVoiceName || '我的声音' })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        showToast('克隆失败：' + (data.error || '未知错误'), 'error')
        return
      }
      setCloneProgress('克隆成功！')
      const newVoice = { id: data.voiceId, name: cloneVoiceName || '我的声音', createdAt: new Date().toLocaleDateString() }
      const updated = [newVoice, ...clonedVoices]
      setClonedVoices(updated)
      localStorage.setItem('contentos_cloned_voices', JSON.stringify(updated))
      setVoiceId(data.voiceId)
      setShowClonePanel(false)
      showToast('声音克隆成功！已自动选中', 'success')
    } catch (e: any) {
      showToast('克隆出错：' + e.message, 'error')
    } finally {
      setIsCloning(false)
      setCloneProgress('')
    }
  }

  // 录音克隆
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const recordedChunksRef = React.useRef<Blob[]>([])
  const [isRecording, setIsRecording] = React.useState(false)
  const [recordSeconds, setRecordSeconds] = React.useState(0)
  const recordTimerRef = React.useRef<any>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      recordedChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1]
          await handleVoiceClone(base64, 'webm')
        }
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch (e: any) {
      showToast('无法访问麦克风：' + e.message, 'error')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordTimerRef.current)
    }
  }

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
  const [subtitleFontSize, setSubtitleFontSize] = React.useState<'sm' | 'md' | 'lg'>('md')
  const [subtitleColor, setSubtitleColor] = React.useState<'white' | 'yellow' | 'cyan' | 'green'>('white')
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
  const SUBTITLE_FONT_SIZES = [
    { id: 'sm', label: '小', size: '12px' },
    { id: 'md', label: '中', size: '15px' },
    { id: 'lg', label: '大', size: '18px' },
  ]
  const SUBTITLE_COLORS = [
    { id: 'white', label: '白色', hex: '#FFFFFF' },
    { id: 'yellow', label: '黄色', hex: '#FFE066' },
    { id: 'cyan', label: '青色', hex: '#67E8F9' },
    { id: 'green', label: '绿色', hex: '#86EFAC' },
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

            {/* 字幕字号 & 颜色 */}
            {subtitleStyle !== 'none' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-900 text-sm mb-3">🎨 字幕样式细节</div>
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2">字体大小</div>
                  <div className="flex gap-2">
                    {SUBTITLE_FONT_SIZES.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSubtitleFontSize(f.id as any)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${subtitleFontSize === f.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-2">字体颜色</div>
                  <div className="flex gap-3">
                    {SUBTITLE_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSubtitleColor(c.id as any)}
                        className={`w-8 h-8 rounded-full border-2 transition-all active:scale-[0.9] ${subtitleColor === c.id ? 'border-purple-500 scale-110' : 'border-gray-200'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

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

            {/* 克隆声音区域 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">🧬 克隆声音</div>
                <button
                  onClick={() => setShowClonePanel(!showClonePanel)}
                  className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg active:scale-95"
                >
                  {showClonePanel ? '收起' : '+ 克隆我的声音'}
                </button>
              </div>

              {/* 已克隆声音列表 */}
              {clonedVoices.length > 0 && (
                <div className="space-y-2 mb-3">
                  {clonedVoices.map((cv: any) => (
                    <button
                      key={cv.id}
                      onClick={() => setVoiceId(cv.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] ${voiceId === cv.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}
                    >
                      <span className="text-xl flex-shrink-0">🎤</span>
                      <div className="flex-1 text-left">
                        <div className={`text-sm font-bold ${voiceId === cv.id ? 'text-purple-700' : 'text-gray-800'}`}>{cv.name}</div>
                        <div className="text-xs text-gray-400">克隆于 {cv.createdAt}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {voiceId === cv.id && <span className="text-purple-500 font-bold">✓</span>}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const updated = clonedVoices.filter((v: any) => v.id !== cv.id)
                            setClonedVoices(updated)
                            localStorage.setItem('contentos_cloned_voices', JSON.stringify(updated))
                            if (voiceId === cv.id) setVoiceId('female-shaonv')
                          }}
                          className="text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded ml-1"
                        >删除</button>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 克隆面板 */}
              {showClonePanel && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100 space-y-3">
                  <div className="text-xs text-purple-700 font-semibold">📋 使用说明</div>
                  <div className="text-[11px] text-purple-600 leading-relaxed">
                    上传或录制 30秒以上清晰语音，AI 将克隆您的声音特征，用于后续视频配音。
                  </div>

                  {/* 声音名称 */}
                  <div>
                    <div className="text-xs text-gray-600 font-medium mb-1">声音名称</div>
                    <input
                      type="text"
                      value={cloneVoiceName}
                      onChange={e => setCloneVoiceName(e.target.value)}
                      placeholder="给这个声音起个名字"
                      className="w-full text-sm px-3 py-2 rounded-xl border border-purple-200 bg-white focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {/* 录音按钮 */}
                  <div>
                    <div className="text-xs text-gray-600 font-medium mb-2">方式一：实时录音</div>
                    <div className="flex items-center gap-2">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          disabled={isCloning}
                          className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          开始录音
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="flex-1 py-2.5 bg-gray-700 text-white text-sm font-bold rounded-xl active:scale-95 flex items-center justify-center gap-2"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                          停止录音（{recordSeconds}s）
                        </button>
                      )}
                    </div>
                    {isRecording && (
                      <div className="mt-2 flex items-center gap-1 justify-center">
                        {[0.3,0.6,1,0.8,0.5,0.9,0.4,0.7,1,0.6].map((h, i) => (
                          <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${h * 24}px`, animationDelay: `${i * 0.08}s` }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 上传文件 */}
                  <div>
                    <div className="text-xs text-gray-600 font-medium mb-2">方式二：上传音频文件</div>
                    <label className="block w-full py-2.5 bg-white border-2 border-dashed border-purple-200 text-purple-600 text-sm font-medium rounded-xl text-center cursor-pointer active:scale-95 hover:border-purple-400 transition-all">
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        disabled={isCloning || isRecording}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const ext = file.name.split('.').pop() || 'mp3'
                          const reader = new FileReader()
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(',')[1]
                            await handleVoiceClone(base64, ext)
                          }
                          reader.readAsDataURL(file)
                        }}
                      />
                      📁 点击上传音频（MP3/WAV/M4A）
                    </label>
                  </div>

                  {/* 克隆进度 */}
                  {isCloning && (
                    <div className="flex items-center gap-2 bg-white rounded-xl p-3">
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-xs text-purple-600 font-medium">{cloneProgress || '克隆中...'}</span>
                    </div>
                  )}
                </div>
              )}

              {clonedVoices.length === 0 && !showClonePanel && (
                <div className="text-xs text-gray-400 text-center py-2">暂无克隆声音，点击上方按钮开始克隆</div>
              )}
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

                {/* TTS 错误提示 */}
                {error && !loading && (
                  <div className="bg-red-50 rounded-2xl p-3 border border-red-100 flex items-start gap-2">
                    <span className="text-base flex-shrink-0 mt-0.5">❌</span>
                    <div>
                      <div className="text-xs font-bold text-red-600 mb-0.5">语音合成失败</div>
                      <div className="text-[11px] text-red-500 leading-relaxed">{error}</div>
                      <button onClick={generateTTS} className="mt-2 text-[11px] font-bold text-red-500 bg-red-100 px-3 py-1 rounded-lg active:scale-95">重新合成</button>
                    </div>
                  </div>
                )}

                {/* TTS 生成中进度动画 */}
                {loading && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-[3px] border-purple-100"/>
                        <div className="absolute inset-0 rounded-full border-[3px] border-t-purple-500 border-r-purple-300 border-b-transparent border-l-transparent animate-spin"/>
                        <div className="absolute inset-0 flex items-center justify-center text-base">🎙️</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-purple-700">
                          {segmentMode ? `正在合成 ${videoSegments.length} 段语音...` : '正在合成语音...'}
                        </div>
                        <div className="text-[11px] text-purple-400">MiniMax TTS 处理中，请稍候</div>
                      </div>
                    </div>
                    <div className="flex items-end justify-center gap-1 h-7">
                      {[0.4,0.7,1,0.8,0.5,0.9,0.6,1,0.7,0.4,0.8,0.5].map((h: number, i: number) => (
                        <div key={i} className="w-1.5 bg-purple-400 rounded-full animate-pulse" style={{ height: `${h * 100}%`, opacity: 0.5 + h * 0.5, animationDelay: `${i * 0.07}s` }} />
                      ))}
                    </div>
                    {segmentMode && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {videoSegments.map((_: any, i: number) => (
                          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${segmentAudios[i] ? 'bg-green-100 text-green-600' : i === Object.keys(segmentAudios).length ? 'bg-purple-100 text-purple-500 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                            段{i+1} {segmentAudios[i] ? '✅' : i === Object.keys(segmentAudios).length ? '⏳' : '○'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TTS 成功提示 */}
                {audioB64 && !loading && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-3 border border-green-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-lg flex-shrink-0">✅</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-green-700">语音合成成功！</div>
                      <div className="text-[11px] text-green-500 truncate">
                        {VOICES.find((v: any) => v.id === voiceId)?.label} · {speed}x 语速
                        {segmentMode ? ` · ${videoSegments.length} 段` : ''}
                      </div>
                    </div>
                    <button onClick={() => setStep('avatar')} className="text-[11px] font-bold text-white bg-green-500 px-3 py-1.5 rounded-xl active:scale-95 flex-shrink-0">下一步 →</button>
                  </div>
                )}

                <button
                  onClick={generateTTS}
                  disabled={loading}
                  className={`w-full py-3.5 font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-md ${audioB64 && !loading ? 'bg-gray-100 text-gray-600' : 'bg-gradient-to-r from-purple-500 to-pink-400 text-white'}`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2 opacity-0">占位</span>
                  ) : audioB64 ? '🔄 重新合成' : segmentMode ? `🎙️ 合成 ${videoSegments.length} 段语音` : '🎙️ 合成语音'}
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
                        <span style={{
                          color: subtitleColor==='white'?'#FFF':subtitleColor==='yellow'?'#FFE066':subtitleColor==='cyan'?'#67E8F9':'#86EFAC',
                          fontSize: subtitleFontSize==='sm'?'9px':subtitleFontSize==='lg'?'13px':'11px',
                          fontWeight:'bold'
                        }}>{videoCopy.slice(0, 20)}</span>
                        <span style={{color:'rgba(255,255,255,0.6)',fontSize:subtitleFontSize==='sm'?'9px':subtitleFontSize==='lg'?'13px':'11px'}}>{videoCopy.slice(20, 35)}</span>
                      </div>
                    )}
                    {subtitleStyle === 'bottom' && (
                      <div className="bg-black/60 rounded-lg px-2 py-1">
                        <span style={{
                          color: subtitleColor==='white'?'#FFF':subtitleColor==='yellow'?'#FFE066':subtitleColor==='cyan'?'#67E8F9':'#86EFAC',
                          fontSize: subtitleFontSize==='sm'?'9px':subtitleFontSize==='lg'?'13px':'11px',
                        }} className="leading-relaxed">{videoCopy.slice(0, 30)}...</span>
                      </div>
                    )}
                    {subtitleStyle === 'highlight' && (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        {videoCopy.slice(0, 20).split('').map((c: string, i: number) => (
                          <span key={i} style={{
                            color: i < 5 ? '#FFE066' : (subtitleColor==='white'?'#FFF':subtitleColor==='yellow'?'#FFE066':subtitleColor==='cyan'?'#67E8F9':'#86EFAC'),
                            fontSize: subtitleFontSize==='sm'?'9px':subtitleFontSize==='lg'?'13px':'11px',
                            fontWeight:'bold'
                          }}>{c}</span>
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
                  ['字幕字号', SUBTITLE_FONT_SIZES.find(f => f.id === subtitleFontSize)?.label || '中'],
                  ['字幕颜色', SUBTITLE_COLORS.find(c => c.id === subtitleColor)?.label || '白色'],
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
            <VideoComposePanel videoCopy={videoCopy} audioB64={audioB64} showToast={showToast} videoRatio={videoRatio} subtitleStyle={subtitleStyle} subtitleFontSize={subtitleFontSize} subtitleColor={subtitleColor} />
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
// ═══════════════════════════════════════════════════════════
    // VIDEO COMPOSE PANEL — 视频合成面板（LatentSync + FFmpeg + T2V）
    // ═══════════════════════════════════════════════════════════
    function VideoComposePanel({ videoCopy, audioB64, showToast, videoRatio, subtitleStyle, subtitleFontSize, subtitleColor }: any) {
      type ComposeMode = 'latentsync' | 'ffmpeg_bg' | 'minimax_t2v'
      type ComposeStatus = 'idle' | 'uploading' | 'processing' | 'polling' | 'done' | 'error' | 'demo' | 'client_side'

      const [composeMode, setComposeMode] = React.useState<ComposeMode>('latentsync')
      const [composeStatus, setComposeStatus] = React.useState<ComposeStatus>('idle')
      const [composeTaskId, setComposeTaskId] = React.useState('')
      const [composeVideoUrl, setComposeVideoUrl] = React.useState('')
      const [composeError, setComposeError] = React.useState('')
      const [pollCount, setPollCount] = React.useState(0)
      const pollRef = React.useRef<any>(null)
      const [avatarVideoB64, setAvatarVideoB64] = React.useState('')
      const [avatarVideoName, setAvatarVideoName] = React.useState('')
      const [avatarVideoPreview, setAvatarVideoPreview] = React.useState('')
      const [bgImageB64, setBgImageB64] = React.useState('')
      const [bgImagePreview, setBgImagePreview] = React.useState('')
      const [bgImageName, setBgImageName] = React.useState('')
      const [t2vPrompt, setT2vPrompt] = React.useState('')

      React.useEffect(() => {
        if (videoCopy) {
          const preview = videoCopy.slice(0, 60).replace(/\n/g, ' ')
          setT2vPrompt(`一位专业主播正在讲述：${preview}，竖屏视频，真实感强，光线明亮`)
        }
      }, [videoCopy])

      const MODES = [
        { id: 'latentsync', label: 'LatentSync换嘴型', icon: '🎭', desc: '上传人物视频，AI同步嘴型', badge: '推荐', badgeColor: 'bg-purple-100 text-purple-600' },
        { id: 'ffmpeg_bg', label: '背景图合成', icon: '🖼️', desc: '上传背景图，配音合成视频', badge: 'FFmpeg', badgeColor: 'bg-blue-100 text-blue-600' },
        { id: 'minimax_t2v', label: 'AI视频生成', icon: '🤖', desc: '文字描述生成视频画面', badge: 'T2V', badgeColor: 'bg-green-100 text-green-600' },
      ]

      function handleAvatarVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 50 * 1024 * 1024) { showToast('视频文件不能超过50MB'); return }
        setAvatarVideoName(file.name)
        setAvatarVideoPreview(URL.createObjectURL(file))
        const reader = new FileReader()
        reader.onload = () => setAvatarVideoB64((reader.result as string).split(',')[1])
        reader.readAsDataURL(file)
      }

      function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setBgImageName(file.name)
        setBgImagePreview(URL.createObjectURL(file))
        const reader = new FileReader()
        reader.onload = () => setBgImageB64((reader.result as string).split(',')[1])
        reader.readAsDataURL(file)
      }

      async function startCompose() {
        if (!audioB64) { showToast('请先在声音步骤合成语音'); return }
        setComposeStatus('uploading'); setComposeError(''); setComposeVideoUrl(''); setPollCount(0)
        try {
          let body: any = { mode: composeMode }
          if (composeMode === 'latentsync') {
            if (!avatarVideoB64) { showToast('请先上传人物视频'); setComposeStatus('idle'); return }
            body.videoBase64 = avatarVideoB64; body.audioBase64 = audioB64
            body.videoFormat = avatarVideoName.split('.').pop() || 'mp4'
          } else if (composeMode === 'ffmpeg_bg') {
            if (!bgImageB64) { showToast('请先上传背景图片'); setComposeStatus('idle'); return }
            body.imageBase64 = bgImageB64; body.audioBase64 = audioB64
            body.imageFormat = bgImageName.split('.').pop() || 'jpg'
            body.subtitles = videoCopy ? videoCopy.split('\n').filter(Boolean) : []
          } else {
            if (!t2vPrompt.trim()) { showToast('请输入视频描述'); setComposeStatus('idle'); return }
            body.prompt = t2vPrompt; body.duration = 6
          }
          const res = await fetch('/api/video-compose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          const data = await res.json()
          if (data.status === 'demo') { setComposeStatus('demo'); showToast('⚠️ 演示模式：' + (data.message || 'API未配置')); return }
          if (data.status === 'client_side') { setComposeStatus('client_side'); return }
          if (data.taskId) { setComposeTaskId(data.taskId); setComposeStatus('polling'); startPolling(data.taskId, composeMode); showToast('🎬 视频合成任务已提交') }
          else { setComposeStatus('error'); setComposeError(data.error || '提交失败') }
        } catch (e: any) { setComposeStatus('error'); setComposeError(e.message) }
      }

      function startPolling(taskId: string, mode: string) {
        let count = 0
        const modeParam = mode === 'latentsync' ? 'latentsync' : mode === 'ffmpeg_bg' ? 'shotstack' : 'minimax'
        pollRef.current = setInterval(async () => {
          count++; setPollCount(count)
          if (count > 120) { clearInterval(pollRef.current); setComposeStatus('error'); setComposeError('合成超时，请重试'); return }
          try {
            const res = await fetch(`/api/video-compose-status?taskId=${taskId}&mode=${modeParam}`)
            const data = await res.json()
            if (data.status === 'Success' || data.videoUrl) { clearInterval(pollRef.current); setComposeStatus('done'); setComposeVideoUrl(data.videoUrl || ''); showToast('✅ 视频合成完成！') }
            else if (data.status === 'Fail') { clearInterval(pollRef.current); setComposeStatus('error'); setComposeError(data.error || '合成失败') }
          } catch {}
        }, 5000)
      }

      React.useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

      const progressSteps = [
        { label: '上传素材', done: ['uploading','processing','polling','done'].includes(composeStatus) },
        { label: '提交任务', done: ['processing','polling','done'].includes(composeStatus) },
        { label: 'AI处理中', done: ['polling','done'].includes(composeStatus) },
        { label: '合成完成', done: composeStatus === 'done' },
      ]

      return (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-gray-900 text-sm">🎬 视频合成</div>
                <div className="text-[11px] text-gray-400 mt-0.5">选择合成方式，生成完整视频</div>
              </div>
              {audioB64 ? (
                <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-600 rounded-full">✅ 语音已就绪</span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 text-orange-500 rounded-full">⚠️ 请先合成语音</span>
              )}
            </div>
            <div className="space-y-2">
              {MODES.map(m => (
                <button key={m.id} onClick={() => { setComposeMode(m.id as ComposeMode); setComposeStatus('idle'); setComposeError('') }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-[0.98] ${composeMode === m.id ? 'bg-purple-50 border-2 border-purple-400' : 'bg-gray-50 border-2 border-transparent'}`}>
                  <span className="text-2xl flex-shrink-0">{m.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${composeMode === m.id ? 'text-purple-700' : 'text-gray-800'}`}>{m.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                  </div>
                  {composeMode === m.id && <span className="text-purple-500 font-bold flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {composeMode === 'latentsync' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="font-bold text-gray-900 text-sm">🎭 上传人物视频</div>
              <div className="text-xs text-gray-500 leading-relaxed bg-purple-50 rounded-xl p-3">
                <div className="font-semibold text-purple-700 mb-1">📋 要求</div>
                <div>• 人物正面朝向镜头，嘴部清晰可见</div>
                <div>• 建议时长 5~30 秒，MP4/MOV 格式</div>
                <div>• AI 将自动同步嘴型与您的语音</div>
              </div>
              {avatarVideoPreview ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-48">
                  <video src={avatarVideoPreview} className="w-full h-full object-cover" controls muted />
                  <button onClick={() => { setAvatarVideoB64(''); setAvatarVideoPreview(''); setAvatarVideoName('') }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">✕</button>
                  <div className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full truncate max-w-[80%]">{avatarVideoName}</div>
                </div>
              ) : (
                <label className="block w-full py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all active:scale-[0.98]">
                  <input type="file" accept="video/*" className="hidden" onChange={handleAvatarVideoUpload} />
                  <div className="text-3xl mb-2">🎥</div>
                  <div className="text-sm font-semibold text-gray-600">点击上传人物视频</div>
                  <div className="text-xs text-gray-400 mt-1">MP4 / MOV · 最大 50MB</div>
                </label>
              )}
            </div>
          )}

          {composeMode === 'ffmpeg_bg' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="font-bold text-gray-900 text-sm">🖼️ 上传背景图片</div>
              <div className="text-xs text-gray-500 leading-relaxed bg-blue-50 rounded-xl p-3">
                <div className="font-semibold text-blue-700 mb-1">📋 合成说明</div>
                <div>• 上传竖屏背景图（9:16 比例最佳）</div>
                <div>• 系统将图片+语音合成为视频</div>
                <div>• 字幕将自动叠加在视频底部</div>
              </div>
              {bgImagePreview ? (
                <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[9/16] max-h-48">
                  <img src={bgImagePreview} alt="背景图" className="w-full h-full object-cover" />
                  <button onClick={() => { setBgImageB64(''); setBgImagePreview(''); setBgImageName('') }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">✕</button>
                  <div className="absolute bottom-2 left-2 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded-full truncate max-w-[80%]">{bgImageName}</div>
                </div>
              ) : (
                <label className="block w-full py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-[0.98]">
                  <input type="file" accept="image/*" className="hidden" onChange={handleBgImageUpload} />
                  <div className="text-3xl mb-2">🖼️</div>
                  <div className="text-sm font-semibold text-gray-600">点击上传背景图片</div>
                  <div className="text-xs text-gray-400 mt-1">JPG / PNG · 建议 9:16 竖屏</div>
                </label>
              )}
            </div>
          )}

          {composeMode === 'minimax_t2v' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="font-bold text-gray-900 text-sm">🤖 视频描述</div>
              <textarea value={t2vPrompt} onChange={e => setT2vPrompt(e.target.value)} rows={4}
                placeholder="描述视频画面，如：一位专业主播正在讲述..."
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-purple-400 resize-none leading-relaxed" />
              <div className="text-xs text-gray-400">由 MiniMax T2V 模型生成，需配置 MINIMAX_API_KEY</div>
            </div>
          )}

          {['uploading','processing','polling'].includes(composeStatus) && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-10 h-10 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border-[3px] border-purple-200 border-t-purple-500 animate-spin" />
                  <div className="absolute inset-1.5 rounded-full border-[2px] border-pink-200 border-b-pink-400 animate-spin" style={{animationDirection:'reverse',animationDuration:'0.8s'}} />
                  <div className="absolute inset-0 flex items-center justify-center text-sm">🎬</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-purple-700">视频合成中...</div>
                  <div className="text-[11px] text-purple-400">已轮询 {pollCount} 次，预计 1~3 分钟</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {progressSteps.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step.done ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                        {step.done ? '✓' : i+1}
                      </div>
                      <div className={`text-[9px] text-center leading-tight ${step.done ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>{step.label}</div>
                    </div>
                    {i < progressSteps.length - 1 && (
                      <div className={`h-0.5 flex-1 mb-4 rounded-full transition-all ${progressSteps[i+1].done ? 'bg-purple-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {composeStatus === 'done' && composeVideoUrl && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-lg">✅</div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">视频合成完成！</div>
                  <div className="text-xs text-gray-400">点击下方预览或下载</div>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-64">
                <video src={composeVideoUrl} className="w-full h-full object-contain" controls />
              </div>
              <a href={composeVideoUrl} download="contentos_video.mp4"
                className="block w-full py-3 bg-gradient-to-r from-green-500 to-emerald-400 text-white font-bold rounded-2xl text-sm text-center active:scale-[0.98] transition-all shadow-md">
                ⬇️ 下载视频
              </a>
            </div>
          )}

          {composeStatus === 'demo' && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-start gap-2">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div>
                  <div className="font-bold text-amber-700 text-sm mb-1">演示模式 — API 未配置</div>
                  <div className="text-xs text-amber-600 leading-relaxed">
                    {composeMode === 'latentsync' && '配置 REPLICATE_API_KEY 以启用 LatentSync 换嘴型'}
                    {composeMode === 'ffmpeg_bg' && '配置 FFMPEG_API_KEY（Shotstack）以启用背景合成'}
                    {composeMode === 'minimax_t2v' && '配置 MINIMAX_API_KEY 以启用 AI 视频生成'}
                  </div>
                  <div className="mt-2 text-[11px] text-amber-500 bg-amber-100 rounded-lg p-2 font-mono">
                    {composeMode === 'latentsync' && 'REPLICATE_API_KEY=r8_xxx'}
                    {composeMode === 'ffmpeg_bg' && 'FFMPEG_API_KEY=your_shotstack_key'}
                    {composeMode === 'minimax_t2v' && 'MINIMAX_API_KEY=your_minimax_key'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {composeStatus === 'client_side' && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <div className="font-bold text-blue-700 text-sm mb-2">💡 本地 FFmpeg 合成命令</div>
              <div className="text-[11px] text-blue-600 bg-blue-100 rounded-lg p-2 font-mono leading-relaxed">
                ffmpeg -loop 1 -i bg.jpg -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4
              </div>
            </div>
          )}

          {composeStatus === 'error' && (
            <div className="bg-red-50 rounded-2xl p-3 border border-red-100 flex items-start gap-2">
              <span className="text-base flex-shrink-0 mt-0.5">❌</span>
              <div>
                <div className="text-xs font-bold text-red-600 mb-0.5">合成失败</div>
                <div className="text-[11px] text-red-500 leading-relaxed">{composeError}</div>
                <button onClick={() => setComposeStatus('idle')} className="mt-2 text-[11px] font-bold text-red-500 bg-red-100 px-3 py-1 rounded-lg active:scale-95">重试</button>
              </div>
            </div>
          )}

          {['idle', 'error'].includes(composeStatus) && (
            <button onClick={startCompose} disabled={!audioB64}
              className={`w-full py-3.5 font-bold rounded-2xl text-sm transition-all shadow-md active:scale-[0.98] ${audioB64 ? 'bg-gradient-to-r from-purple-500 to-pink-400 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              {!audioB64 ? '⚠️ 请先合成语音' : composeMode === 'latentsync' ? '🎭 开始换嘴型合成' : composeMode === 'ffmpeg_bg' ? '🖼️ 开始背景合成' : '🤖 开始 AI 生成'}
            </button>
          )}
        </div>
      )
    }

    // VIDEO GENERATE PANEL — MiniMax 视频合成面板
// ═══════════════════════════════════════════════════════════
function VideoGeneratePanel({ videoCopy, showToast, videoRatio, subtitleStyle, subtitleFontSize, subtitleColor }: any) {
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
          {/* 阶段指示器 */}
          <div className="flex items-center justify-between mb-5">
            {[
              { label: '提交任务', icon: '📤', active: true },
              { label: 'AI 渲染', icon: '🎬', active: videoStatus === 'polling' },
              { label: '完成', icon: '✅', active: false },
            ].map((stage, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${stage.active ? 'bg-purple-500 shadow-md shadow-purple-200' : i === 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    {stage.icon}
                  </div>
                  <span className={`text-[9px] font-semibold ${stage.active ? 'text-purple-600' : 'text-gray-400'}`}>{stage.label}</span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded-full ${i === 0 && videoStatus === 'polling' ? 'bg-purple-400' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex flex-col items-center gap-4">
            {/* 双层旋转动画 */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-100"/>
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-r-transparent animate-spin"/>
              <div className="absolute inset-2 rounded-full border-4 border-b-pink-400 border-l-transparent animate-spin" style={{animationDirection:'reverse', animationDuration:'1.5s'}}/>
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
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(pollCount * 2, 90)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                <span>已用 {pollCount * 5}s</span>
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
    // PUBLISH MANAGER — 发布任务管理
    // ═══════════════════════════════════════════════════════════
    function PublishManager({ schedule, setSchedule, showToast, publishingId, setPublishingId, showPublishGuide, setShowPublishGuide, scheduleDetailId, setScheduleDetailId, setShowAddSchedule }: any) {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()

      // 今日待发布 + 即将发布（未来3天）
      const pendingToday = schedule.filter((s: any) => {
        const d = s.publishDate || s.time?.split(' ')[0] || ''
        return d === today && (s.status === '待发布' || s.status === '计划中')
      })
      const upcoming = schedule.filter((s: any) => {
        const d = s.publishDate || s.time?.split(' ')[0] || ''
        if (!d || d === today) return false
        const diff = (new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return diff > 0 && diff <= 3 && (s.status === '待发布' || s.status === '计划中')
      })

      const PLATFORM_GUIDES: Record<string, { icon: string; color: string; steps: string[]; tips: string[] }> = {
        '抖音': {
          icon: '🎵', color: 'from-gray-800 to-gray-900',
          steps: ['打开抖音 App → 点击底部「+」', '选择视频文件上传', '填写标题（建议30字内）', '添加话题标签（#号开头）', '选择封面图', '设置定时发布时间', '点击「发布」'],
          tips: ['发布时间建议：早7-9点、午12-13点、晚18-22点', '标题前3秒要有钩子', '话题标签选3-5个精准标签', '封面图要清晰有文字']
        },
        '小红书': {
          icon: '📕', color: 'from-red-500 to-rose-600',
          steps: ['打开小红书 App → 点击「+」', '选择视频或图文', '填写标题（建议20字内，含关键词）', '正文描述（500字以内）', '添加话题标签', '选择地点（本地账号必填）', '点击「发布笔记」'],
          tips: ['标题要含搜索关键词', '正文多用换行和emoji', '话题选垂直领域标签', '发布后1小时内积极互动评论']
        },
        'B站': {
          icon: '📺', color: 'from-blue-400 to-cyan-500',
          steps: ['登录B站创作中心', '点击「投稿」→「视频投稿」', '上传视频文件', '填写标题、简介、标签', '选择分区', '设置封面', '提交审核（约2小时）'],
          tips: ['标题含关键词利于搜索', '简介要详细，利于SEO', '分区选择要精准', '审核通过后可设定时发布']
        },
        '视频号': {
          icon: '💬', color: 'from-green-500 to-emerald-600',
          steps: ['打开微信 → 发现 → 视频号', '点击右上角「+」', '选择视频上传', '填写描述文字', '添加话题', '选择封面', '点击「发表」'],
          tips: ['描述要引导转发分享', '可关联公众号文章', '发布后在朋友圈分享扩散', '互动率影响推荐权重']
        },
        '快手': {
          icon: '⚡', color: 'from-orange-400 to-amber-500',
          steps: ['打开快手 App → 点击「+」', '选择视频', '填写描述', '添加话题', '选择封面', '设置发布时间', '点击「发布」'],
          tips: ['快手用户偏好真实接地气内容', '评论区要积极互动', '发布时间建议晚上8-10点', '可开启直播预告功能']
        },
      }

      function markPublished(id: string) {
        const updated = schedule.map((s: any) => s.id === id ? { ...s, status: '已发布', publishedAt: new Date().toLocaleString('zh-CN') } : s)
        setSchedule(updated)
        showToast('✅ 已标记为发布成功')
      }

      function markFailed(id: string) {
        const updated = schedule.map((s: any) => s.id === id ? { ...s, status: '发布失败' } : s)
        setSchedule(updated)
        showToast('已标记为发布失败')
      }

      const guide = showPublishGuide ? PLATFORM_GUIDES[showPublishGuide] : null

      return (
        <div className="space-y-3">
          {/* 发布指引弹窗 */}
          {guide && showPublishGuide && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowPublishGuide(null)}>
              <div className="w-full bg-white rounded-t-3xl p-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${guide.color} flex items-center justify-center text-lg`}>{guide.icon}</div>
                    <div>
                      <div className="font-black text-gray-900">{showPublishGuide} 发布指引</div>
                      <div className="text-xs text-gray-400">按步骤操作，轻松完成发布</div>
                    </div>
                  </div>
                  <button onClick={() => setShowPublishGuide(null)} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="font-bold text-gray-800 text-sm mb-2">📋 发布步骤</div>
                    <div className="space-y-2">
                      {guide.steps.map((step: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${guide.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>{i+1}</div>
                          <div className="text-sm text-gray-700 leading-relaxed">{step}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-3">
                    <div className="font-bold text-amber-700 text-sm mb-2">💡 发布技巧</div>
                    <div className="space-y-1">
                      {guide.tips.map((tip: string, i: number) => (
                        <div key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                          <span className="flex-shrink-0 mt-0.5">•</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 今日发布任务 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-gray-900 text-sm">📤 今日发布任务</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
              </div>
              <button onClick={() => setShowAddSchedule(true)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl active:scale-95">+ 添加</button>
            </div>

            {pendingToday.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">📭</div>
                <div className="text-sm text-gray-500 font-medium">今日暂无待发布任务</div>
                <div className="text-xs text-gray-400 mt-1">点击右上角添加发布计划</div>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingToday.map((item: any) => {
                  const platformGuide = PLATFORM_GUIDES[item.platform]
                  return (
                    <div key={item.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${platformGuide?.color || 'from-gray-400 to-gray-500'} flex items-center justify-center text-lg flex-shrink-0`}>
                          {platformGuide?.icon || '📱'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{item.title}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{item.platform}</span>
                            <span className="text-[10px] text-gray-300">·</span>
                            <span className="text-[10px] text-gray-400">{item.publishTime || item.time?.split(' ')[1] || '待定时间'}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.status === '待发布' ? 'bg-orange-100 text-orange-500' : 'bg-blue-100 text-blue-500'}`}>{item.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 px-3 pb-3">
                        <button
                          onClick={() => setShowPublishGuide(item.platform)}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl active:scale-95"
                        >📋 发布指引</button>
                        <button
                          onClick={() => markPublished(item.id)}
                          className="flex-1 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-xl active:scale-95"
                        >✅ 标记已发</button>
                        <button
                          onClick={() => markFailed(item.id)}
                          className="flex-1 py-2 bg-red-50 text-red-400 text-xs font-bold rounded-xl active:scale-95"
                        >❌ 发布失败</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 即将发布（未来3天） */}
          {upcoming.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">⏰ 即将发布（未来3天）</div>
              <div className="space-y-2">
                {upcoming.map((item: any) => {
                  const d = item.publishDate || item.time?.split(' ')[0] || ''
                  const daysLeft = Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex flex-col items-center justify-center flex-shrink-0">
                        <div className="text-xs font-black text-blue-600">{daysLeft}</div>
                        <div className="text-[9px] text-blue-400">天后</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{item.title}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.platform} · {d} {item.publishTime || ''}</div>
                      </div>
                      <button onClick={() => setShowPublishGuide(item.platform)} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg flex-shrink-0">指引</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 发布统计 */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '本周已发', value: schedule.filter((s: any) => s.status === '已发布').length, icon: '✅', color: 'text-green-600 bg-green-50' },
              { label: '待发布', value: schedule.filter((s: any) => s.status === '待发布' || s.status === '计划中').length, icon: '⏳', color: 'text-orange-500 bg-orange-50' },
              { label: '发布失败', value: schedule.filter((s: any) => s.status === '发布失败').length, icon: '❌', color: 'text-red-500 bg-red-50' },
            ].map((stat, i) => (
              <div key={i} className={`rounded-2xl p-3 text-center ${stat.color}`}>
                <div className="text-lg mb-0.5">{stat.icon}</div>
                <div className="text-xl font-black">{stat.value}</div>
                <div className="text-[10px] font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    // ═══════════════════════════════════════════════════════════
    // REVIEW TAB — 数据复盘模块
    // ═══════════════════════════════════════════════════════════
    function ReviewTab({ acc, videoRecords, reviewData, reviewLoading, fetchReview, reviewPeriod, setReviewPeriod, schedule, savedContents }: any) {
      const PERIODS = ['近7天', '近30天', '近90天', '全部']

      const GRADE_COLORS: Record<string, string> = {
        'S': 'from-yellow-400 to-amber-500', 'A+': 'from-green-400 to-emerald-500',
        'A': 'from-green-400 to-emerald-500', 'B+': 'from-blue-400 to-cyan-500',
        'B': 'from-blue-400 to-cyan-500', 'C': 'from-gray-400 to-gray-500',
      }

      // 本地数据统计（不依赖AI）
      const totalPlays = videoRecords.reduce((s: number, v: any) => s + (v.plays || 0), 0)
      const totalLikes = videoRecords.reduce((s: number, v: any) => s + (v.likes || 0), 0)
      const totalComments = videoRecords.reduce((s: number, v: any) => s + (v.comments || 0), 0)
      const totalCollects = videoRecords.reduce((s: number, v: any) => s + (v.collects || 0), 0)
      const avgCompletion = videoRecords.length > 0
        ? Math.round(videoRecords.reduce((s: number, v: any) => s + (v.completionRate || 0), 0) / videoRecords.length)
        : 0
      const publishedCount = schedule.filter((s: any) => s.status === '已发布').length

      // 平台分布
      const platformDist: Record<string, number> = {}
      videoRecords.forEach((v: any) => {
        const p = v.platform || '未知'
        platformDist[p] = (platformDist[p] || 0) + 1
      })

      // 最佳视频（按播放量排序）
      const topVideos = [...videoRecords].sort((a: any, b: any) => (b.plays || 0) - (a.plays || 0)).slice(0, 3)

      return (
        <div className="space-y-3">
          {/* 周期选择 + 分析按钮 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-gray-900 text-sm">🔍 数据复盘</div>
              <button
                onClick={fetchReview}
                disabled={reviewLoading || videoRecords.length === 0}
                className="text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-pink-400 px-3 py-1.5 rounded-xl active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {reviewLoading ? (
                  <><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />分析中...</>
                ) : '✨ AI深度分析'}
              </button>
            </div>
            <div className="flex gap-2">
              {PERIODS.map(p => (
                <button key={p} onClick={() => setReviewPeriod(p)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${reviewPeriod === p ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {p}
                </button>
              ))}
            </div>
            {videoRecords.length === 0 && (
              <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-xl p-2.5 flex items-center gap-2">
                <span>⚠️</span>
                <span>暂无视频数据，请先在视频页面录入视频数据</span>
              </div>
            )}
          </div>

          {/* 本地数据概览（不依赖AI） */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-900 text-sm mb-3">📊 数据概览</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: '总播放量', value: totalPlays >= 10000 ? (totalPlays/10000).toFixed(1)+'万' : totalPlays.toLocaleString(), icon: '▶️' },
                { label: '总点赞数', value: totalLikes >= 10000 ? (totalLikes/10000).toFixed(1)+'万' : totalLikes.toLocaleString(), icon: '❤️' },
                { label: '总评论数', value: totalComments.toLocaleString(), icon: '💬' },
                { label: '总收藏数', value: totalCollects.toLocaleString(), icon: '⭐' },
                { label: '平均完播率', value: avgCompletion + '%', icon: '🎯' },
                { label: '已发布视频', value: publishedCount + '条', icon: '✅' },
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <div className="text-base mb-0.5">{stat.icon}</div>
                  <div className="text-sm font-black text-gray-900">{stat.value}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* 平台分布 */}
            {Object.keys(platformDist).length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">平台分布</div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(platformDist).map(([platform, count]) => (
                    <div key={platform} className="flex items-center gap-1.5 bg-blue-50 rounded-full px-2.5 py-1">
                      <span className="text-xs font-bold text-blue-600">{platform}</span>
                      <span className="text-[10px] text-blue-400">{count}条</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 最佳视频 */}
          {topVideos.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🏆 播放量 TOP3</div>
              <div className="space-y-2">
                {topVideos.map((v: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-500'}`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-800 truncate">{v.title || '无标题'}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{v.platform} · 播放 {(v.plays||0).toLocaleString()} · 点赞 {(v.likes||0).toLocaleString()}</div>
                    </div>
                    <div className="text-xs font-black text-purple-600 flex-shrink-0">{(v.plays||0) >= 10000 ? ((v.plays||0)/10000).toFixed(1)+'万' : (v.plays||0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 分析结果 */}
          {reviewLoading && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 text-center">
              <div className="relative w-14 h-14 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-[3px] border-purple-200 border-t-purple-500 animate-spin" />
                <div className="absolute inset-2 rounded-full border-[2px] border-pink-200 border-b-pink-400 animate-spin" style={{animationDirection:'reverse',animationDuration:'0.8s'}} />
                <div className="absolute inset-0 flex items-center justify-center text-xl">🔍</div>
              </div>
              <div className="text-sm font-bold text-purple-700">AI 正在深度分析...</div>
              <div className="text-xs text-purple-400 mt-1">分析 {videoRecords.length} 条视频数据，请稍候</div>
            </div>
          )}

          {reviewData && !reviewLoading && (
            <>
              {/* 综合评分 */}
              <div className={`bg-gradient-to-br ${GRADE_COLORS[reviewData.summary?.grade] || 'from-blue-400 to-cyan-500'} rounded-2xl p-5 text-white shadow-md`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white/70 text-xs font-medium">{reviewData.period} 综合评分</div>
                    <div className="text-4xl font-black mt-1">{reviewData.summary?.score || '--'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-black opacity-90">{reviewData.summary?.grade || '--'}</div>
                    <div className="text-white/70 text-xs mt-1">综合等级</div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-green-300 flex-shrink-0">✅</span>
                    <span className="text-xs text-white/90 leading-relaxed">{reviewData.summary?.highlight}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-300 flex-shrink-0">⚠️</span>
                    <span className="text-xs text-white/90 leading-relaxed">{reviewData.summary?.weakness}</span>
                  </div>
                </div>
              </div>

              {/* 内容分析 */}
              {reviewData.contentAnalysis && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="font-bold text-gray-900 text-sm mb-3">📈 内容分析</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '最佳发布时间', value: reviewData.contentAnalysis.bestTime, icon: '⏰' },
                      { label: '最佳平台', value: reviewData.contentAnalysis.bestPlatform, icon: '📱' },
                      { label: '最受欢迎风格', value: reviewData.contentAnalysis.bestStyle, icon: '🎨' },
                      { label: '平均互动率', value: reviewData.contentAnalysis.avgEngagement, icon: '💫' },
                    ].map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3">
                        <div className="text-base mb-1">{item.icon}</div>
                        <div className="text-xs font-bold text-gray-800">{item.value || '--'}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 改进建议 */}
              {reviewData.improvements?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="font-bold text-gray-900 text-sm mb-3">🎯 优化建议</div>
                  <div className="space-y-3">
                    {reviewData.improvements.map((imp: any, i: number) => (
                      <div key={i} className={`rounded-xl p-3 border-l-4 ${imp.priority === '高' ? 'bg-red-50 border-red-400' : imp.priority === '中' ? 'bg-amber-50 border-amber-400' : 'bg-blue-50 border-blue-400'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{imp.icon}</span>
                          <span className="text-xs font-bold text-gray-800">{imp.title}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${imp.priority === '高' ? 'bg-red-100 text-red-500' : imp.priority === '中' ? 'bg-amber-100 text-amber-500' : 'bg-blue-100 text-blue-500'}`}>{imp.priority}优先</span>
                        </div>
                        <div className="text-xs text-gray-600 leading-relaxed">{imp.detail}</div>
                        {imp.action && (
                          <div className="mt-2 text-[11px] font-bold text-purple-600 bg-purple-50 rounded-lg px-2 py-1 inline-block">→ {imp.action}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 下周计划 */}
              {reviewData.nextWeekPlan?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="font-bold text-gray-900 text-sm mb-3">📅 AI 推荐下周计划</div>
                  <div className="space-y-2">
                    {reviewData.nextWeekPlan.map((plan: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex flex-col items-center justify-center flex-shrink-0">
                          <div className="text-[10px] font-black text-blue-600">{plan.day}</div>
                          <div className="text-[9px] text-blue-400">{plan.time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-800">{plan.topic}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{plan.platform}</span>
                            <span className="text-[10px] text-purple-500">{plan.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 洞察 */}
              {reviewData.insights?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="font-bold text-gray-900 text-sm mb-3">💡 AI 洞察</div>
                  <div className="space-y-2">
                    {reviewData.insights.map((ins: any, i: number) => (
                      <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl`} style={{background: ins.type === 'warning' ? '#FFF7ED' : ins.type === 'success' ? '#F0FDF4' : '#EFF6FF'}}>
                        <span className="text-base flex-shrink-0 mt-0.5">{ins.icon || '💡'}</span>
                        <div>
                          <div className="text-xs font-bold text-gray-800 mb-0.5">{ins.title}</div>
                          <div className="text-xs text-gray-500 leading-relaxed">{ins.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!reviewData && !reviewLoading && videoRecords.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center border border-purple-100">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-bold text-gray-800 text-sm mb-1">开始 AI 数据复盘</div>
              <div className="text-xs text-gray-500 mb-4">AI 将分析你的 {videoRecords.length} 条视频数据，生成深度复盘报告</div>
              <button onClick={fetchReview} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white text-sm font-bold rounded-2xl active:scale-95 shadow-md">
                ✨ 开始分析
              </button>
            </div>
          )}
        </div>
      )
    }

    // ═══════════════════════════════════════════════════════════
// CONTENT CALENDAR — 内容日历视图
// ═══════════════════════════════════════════════════════════
function ContentCalendar({ schedule, setSchedule, showToast, setShowAddSchedule, setShowVideoRecord, setQuickRecordData, generateWeekPlan, weekPlanLoading, dragItem, setDragItem, dragOverDate, setDragOverDate, handleDragDrop }: any) {
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
            {generateWeekPlan && (
              <button
                onClick={generateWeekPlan}
                disabled={weekPlanLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-500 to-pink-400 text-white text-[10px] font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-60"
              >
                {weekPlanLoading ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : '✨'}
                {weekPlanLoading ? '生成中...' : '一周计划'}
              </button>
            )}
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
                    onDragOver={(e: any) => {
                      if (day && dragItem) { e.preventDefault(); setDragOverDate && setDragOverDate(`${viewMonth+1}月${day}日`) }
                    }}
                    onDrop={(e: any) => {
                      if (day && dragItem && handleDragDrop) {
                        handleDragDrop(dragItem.id, `${viewMonth+1}月${day}日`)
                      }
                    }}
                    onDragLeave={() => setDragOverDate && setDragOverDate(null)}
                    className={`relative flex flex-col items-center py-1 rounded-xl transition-all active:scale-90 ${!day ? 'pointer-events-none' : ''} ${dragOverDate === `${viewMonth+1}月${day}日` ? 'bg-purple-100 ring-2 ring-purple-400' : isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`text-xs font-semibold leading-tight ${!day ? 'invisible' : dragOverDate === `${viewMonth+1}月${day}日` ? 'text-purple-600' : isSelected ? 'text-white' : isToday ? 'text-blue-500' : isWeekend ? 'text-red-400' : 'text-gray-700'}`}>
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
              <div
                key={s.id}
                draggable={!!handleDragDrop}
                onDragStart={() => setDragItem && setDragItem(s)}
                onDragEnd={() => { setDragItem && setDragItem(null); setDragOverDate && setDragOverDate(null) }}
                className={`flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 animate-fade-in-up cursor-grab active:cursor-grabbing ${dragItem?.id === s.id ? 'opacity-50 ring-2 ring-purple-300' : ''}`}
                style={{animationDelay:`${i*50}ms`}}
              >
                <div className="text-gray-300 text-xs flex-shrink-0 select-none">⠿</div>
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

      {/* 图例 + 拖拽提示 */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(STATUS_COLOR).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`}/>
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
        </div>
        {handleDragDrop && (
          <div className="flex items-center gap-1 text-[10px] text-gray-300">
            <span>⠿</span>
            <span>拖拽可改期</span>
          </div>
        )}
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


// ═══════════════════════════════════════════════════════════
    // STATS TAB — 数据图表（交互升级版）
    // ═══════════════════════════════════════════════════════════
    function StatsTab({ acc, platformStats, statsRange, setStatsRange, showDataBind, setShowDataBind, dataBindTab, setDataBindTab, manualFans, setManualFans, manualPlays, setManualPlays, manualLikes, setManualLikes, statsLoading, fetchPlatformStats, updateManualStats, videoRecords }: any) {
      const [activeChart, setActiveChart] = React.useState<'fans' | 'plays' | 'engagement'>('fans')
      const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null)
      const [chartType, setChartType] = React.useState<'line' | 'bar'>('line')

      const chartConfig: any = {
        fans: {
          label: '粉丝增长',
          data: platformStats.fans,
          color: '#3B82F6',
          unit: '',
          summary: `本周新增 +${(platformStats.fans[6] - platformStats.fans[0]).toLocaleString()}`,
          total: platformStats.totalFans >= 10000 ? (platformStats.totalFans / 10000).toFixed(1) + '万' : platformStats.totalFans.toLocaleString(),
        },
        plays: {
          label: '播放量',
          data: platformStats.plays,
          color: '#8B5CF6',
          unit: '',
          summary: `峰值 ${Math.max(...platformStats.plays).toLocaleString()}`,
          total: platformStats.totalPlays >= 10000 ? (platformStats.totalPlays / 10000).toFixed(1) + '万' : platformStats.totalPlays.toLocaleString(),
        },
        engagement: {
          label: '互动数据',
          data: platformStats.likes,
          color: '#F59E0B',
          unit: '',
          summary: `点赞+评论+收藏`,
          total: (platformStats.likes[6] + platformStats.comments[6] + platformStats.collects[6]).toLocaleString(),
        },
      }

      const cfg = chartConfig[activeChart]
      const data = cfg.data as number[]
      const maxVal = Math.max(...data) * 1.15 || 1
      const minVal = Math.min(...data) * 0.85
      const W = 280, H = 100
      const padL = 8, padR = 8, padT = 10, padB = 20

      function getX(i: number) {
        return padL + (i / (data.length - 1)) * (W - padL - padR)
      }
      function getY(v: number) {
        return padT + (1 - (v - minVal) / Math.max(maxVal - minVal, 1)) * (H - padT - padB)
      }

      const linePath = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ')
      const areaPath = linePath + ` L${getX(data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${getX(0).toFixed(1)},${(H - padB).toFixed(1)} Z`

      const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

      function fmtVal(v: number) {
        if (v >= 10000) return (v / 10000).toFixed(1) + 'w'
        if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
        return v.toString()
      }

      return (
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
                      <div key={r.id} className="bg-gray-50 rounded-xl p-3">
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

          {/* 平台选择 + 数据绑定按钮 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-900">{platformStats.platform} 数据</span>
                {platformStats.lastSync && <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">已同步 {platformStats.lastSync}</span>}
              </div>
              <button
                onClick={() => setShowDataBind(true)}
                className="text-xs text-blue-500 font-semibold bg-blue-50 px-2.5 py-1 rounded-xl active:scale-95 transition-transform"
              >
                📊 录入数据
              </button>
            </div>
            <select
              value={platformStats.platform}
              onChange={(e: any) => {}}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none mb-3"
            >
              {['抖音', '小红书', 'B站', '视频号', '快手'].map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* 核心数据卡片（可点击切换图表） */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '总粉丝数', value: platformStats.totalFans >= 10000 ? (platformStats.totalFans/10000).toFixed(1)+'万' : platformStats.totalFans.toLocaleString(), trend: `+${Math.round((platformStats.fans[6]-platformStats.fans[0])/Math.max(platformStats.fans[0],1)*100)}%`, up: platformStats.fans[6] > platformStats.fans[0], icon: '👥', chartKey: 'fans' },
                { label: '总播放量', value: platformStats.totalPlays >= 10000 ? (platformStats.totalPlays/10000).toFixed(1)+'万' : platformStats.totalPlays.toLocaleString(), trend: `+${Math.round((platformStats.plays[6]-platformStats.plays[0])/Math.max(platformStats.plays[0],1)*100)}%`, up: platformStats.plays[6] > platformStats.plays[0], icon: '▶️', chartKey: 'plays' },
                { label: '本周互动', value: (platformStats.likes[6]+platformStats.comments[6]+platformStats.collects[6]).toLocaleString(), trend: '+12%', up: true, icon: '❤️', chartKey: 'engagement' },
                { label: '平均互动率', value: platformStats.avgEngagement.toFixed(1), unit: '%', trend: '+0.8%', up: true, icon: '📈', chartKey: null },
              ].map((s: any, i: number) => (
                <button
                  key={i}
                  onClick={() => s.chartKey && setActiveChart(s.chartKey)}
                  className={`rounded-2xl p-3 text-left transition-all active:scale-95 ${s.chartKey && activeChart === s.chartKey ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className="text-base">{s.icon}</span>
                  </div>
                  <div className="text-lg font-black text-gray-900">{s.value}{s.unit || ''}</div>
                  <div className={`text-[10px] font-semibold mt-0.5 ${s.up ? 'text-green-500' : 'text-red-400'}`}>
                    {s.up ? '↑' : '↓'} {s.trend}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 交互式图表 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {/* 图表切换 Tab */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                  { key: 'fans', label: '粉丝' },
                  { key: 'plays', label: '播放' },
                  { key: 'engagement', label: '互动' },
                ].map((t: any) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveChart(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChart === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
                  >{t.label}</button>
                ))}
              </div>
              {/* 折线/柱状切换 */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[{ key: 'line', icon: '📈' }, { key: 'bar', icon: '📊' }].map((t: any) => (
                  <button
                    key={t.key}
                    onClick={() => setChartType(t.key)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${chartType === t.key ? 'bg-white shadow-sm' : ''}`}
                  >{t.icon}</button>
                ))}
              </div>
            </div>

            {/* 图表标题 */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-700">{cfg.label} · 近7天</div>
              <div className="text-xs text-gray-400">{cfg.summary}</div>
            </div>

            {/* SVG 图表 */}
            <div className="relative" onMouseLeave={() => setHoveredIdx(null)}>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
                <defs>
                  <linearGradient id={`grad_${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Y轴网格线 */}
                {[0.25, 0.5, 0.75, 1].map((pct: number) => {
                  const y = padT + pct * (H - padT - padB)
                  return <line key={pct} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#F3F4F6" strokeWidth="1" />
                })}

                {chartType === 'line' ? (
                  <>
                    <path d={areaPath} fill={`url(#grad_${activeChart})`} />
                    <path d={linePath} fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {data.map((v: number, i: number) => (
                      <g key={i}>
                        <circle
                          cx={getX(i)} cy={getY(v)} r={hoveredIdx === i ? 5 : 3}
                          fill={hoveredIdx === i ? cfg.color : 'white'}
                          stroke={cfg.color} strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                        />
                        <rect x={getX(i) - 15} y={padT} width={30} height={H - padT - padB} fill="transparent" onMouseEnter={() => setHoveredIdx(i)} />
                      </g>
                    ))}
                  </>
                ) : (
                  data.map((v: number, i: number) => {
                    const barW = (W - padL - padR) / data.length * 0.6
                    const x = getX(i) - barW / 2
                    const barH = Math.max(2, (H - padT - padB) * (v - minVal) / Math.max(maxVal - minVal, 1))
                    const y = H - padB - barH
                    return (
                      <g key={i} onMouseEnter={() => setHoveredIdx(i)} style={{ cursor: 'pointer' }}>
                        <rect x={x} y={y} width={barW} height={barH} rx="3"
                          fill={hoveredIdx === i ? cfg.color : cfg.color + '99'}
                          style={{ transition: 'fill 0.15s' }}
                        />
                      </g>
                    )
                  })
                )}

                {/* Tooltip */}
                {hoveredIdx !== null && (() => {
                  const v = data[hoveredIdx]
                  const tx = getX(hoveredIdx)
                  const ty = getY(v) - 14
                  const label = fmtVal(v)
                  const boxW = label.length * 7 + 12
                  const boxX = Math.min(Math.max(tx - boxW / 2, padL), W - padR - boxW)
                  return (
                    <g>
                      <rect x={boxX} y={ty - 12} width={boxW} height={16} rx="4" fill={cfg.color} />
                      <text x={boxX + boxW / 2} y={ty - 1} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{label}</text>
                    </g>
                  )
                })()}

                {/* X轴标签 */}
                {data.map((_: any, i: number) => (
                  <text key={i} x={getX(i)} y={H - 4} textAnchor="middle"
                    fill={hoveredIdx === i ? cfg.color : '#9CA3AF'}
                    fontSize="8" fontWeight={hoveredIdx === i ? 'bold' : 'normal'}
                  >{DAYS[i]}</text>
                ))}
              </svg>

              {/* Hover 详情卡 */}
              {hoveredIdx !== null && (
                <div className="absolute top-0 right-0 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-md text-xs pointer-events-none">
                  <div className="text-gray-500 mb-0.5">{DAYS[hoveredIdx]}</div>
                  <div className="font-black" style={{ color: cfg.color }}>{fmtVal(data[hoveredIdx])}</div>
                </div>
              )}
            </div>

            {/* 图表底部摘要 */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
              <div className="text-xs text-gray-400">{cfg.summary}</div>
              <div className="text-xs font-bold text-gray-700">总计 {cfg.total}</div>
            </div>
          </div>

          {/* 互动分布 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-900 text-sm mb-3">💬 互动分布</div>
            <div className="space-y-3">
              {[
                { label: '点赞', data: platformStats.likes, color: '#EF4444', icon: '❤️' },
                { label: '评论', data: platformStats.comments, color: '#3B82F6', icon: '💬' },
                { label: '收藏', data: platformStats.collects, color: '#F59E0B', icon: '⭐' },
              ].map((item: any) => {
                const total = item.data.reduce((a: number, b: number) => a + b, 0)
                const maxItem = Math.max(...item.data)
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">本周 {item.data[6].toLocaleString()}</span>
                        <span className="text-xs font-bold text-gray-700">总 {total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 items-end h-8">
                      {item.data.map((v: number, i: number) => {
                        const h = Math.max(4, Math.round((v / Math.max(maxItem, 1)) * 28))
                        return (
                          <div key={i} className="flex-1 rounded-sm transition-all"
                            style={{ height: h, backgroundColor: i === 6 ? item.color : item.color + '40', alignSelf: 'flex-end' }}
                          />
                        )
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      {['一', '二', '三', '四', '五', '六', '日'].map((d: string, i: number) => (
                        <span key={i} className="text-[8px] text-gray-300 flex-1 text-center">{d}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 视频记录列表 */}
          {videoRecords.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-gray-900 text-sm">🎬 视频数据记录</div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{videoRecords.length} 条</span>
              </div>
              <div className="space-y-2">
                {videoRecords.slice(0, 5).map((r: any, i: number) => {
                  const plays = parseInt(r.plays || 0)
                  const likes = parseInt(r.likes || 0)
                  const engRate = plays > 0 ? ((likes / plays) * 100).toFixed(1) : '0'
                  return (
                    <div key={r.id} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-xs font-semibold text-gray-800 flex-1 truncate">{r.title || '未命名视频'}</div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{r.publishDate || r.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium">{r.platform || '抖音'}</span>
                        <span className="text-[10px] text-green-500 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">互动率 {engRate}%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[{label:'播放',val:r.plays,color:'text-blue-500'},{label:'点赞',val:r.likes,color:'text-red-400'},{label:'评论',val:r.comments,color:'text-purple-400'},{label:'收藏',val:r.collects,color:'text-amber-400'}].map((d: any) => (
                          <div key={d.label} className="text-center bg-white rounded-lg py-1.5">
                            <div className={`text-xs font-bold ${d.color}`}>{parseInt(d.val||0)>=10000?(parseInt(d.val)/10000).toFixed(1)+'w':d.val||0}</div>
                            <div className="text-[9px] text-gray-400">{d.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )
    }

    
// ═══════════════════════════════════════════════════════════
    // GOALS TAB — 目标追踪（升级版）
    // ═══════════════════════════════════════════════════════════
    function GoalsTab({ acc, platformStats, schedule, savedContents, videoRecords }: any) {
      const defaultGoals = [
        { id: 'fans', label: '粉丝增长', icon: '👥', current: platformStats.fans[6] - platformStats.fans[0], target: 500, unit: '人', color: 'from-blue-400 to-cyan-400', bgColor: 'bg-blue-50', textColor: 'text-blue-500', desc: '本月新增粉丝目标' },
        { id: 'videos', label: '视频发布', icon: '🎬', current: schedule.filter((s: any) => s.status === '已发布').length, target: 20, unit: '条', color: 'from-purple-400 to-pink-400', bgColor: 'bg-purple-50', textColor: 'text-purple-500', desc: '本月发布视频数量' },
        { id: 'plays', label: '总播放量', icon: '▶️', current: platformStats.totalPlays, target: 50000, unit: '', color: 'from-orange-400 to-amber-400', bgColor: 'bg-orange-50', textColor: 'text-orange-500', desc: '累计播放量目标' },
        { id: 'copy', label: '文案创作', icon: '✍️', current: savedContents.length, target: 30, unit: '条', color: 'from-green-400 to-teal-400', bgColor: 'bg-green-50', textColor: 'text-green-500', desc: '本月文案生产目标' },
      ]

      const [goals, setGoals] = React.useState(defaultGoals)
      const [editingId, setEditingId] = React.useState<string | null>(null)
      const [editValue, setEditValue] = React.useState('')

      const totalFans = platformStats.totalFans
      const phases = [
        { phase: '起步期', desc: '建立账号基础，每周发布3-5条内容', threshold: 0, target: 1000, color: 'bg-blue-400', activeColor: 'from-blue-400 to-cyan-400' },
        { phase: '成长期', desc: '打造爆款内容，粉丝突破1万', threshold: 1000, target: 10000, color: 'bg-purple-400', activeColor: 'from-purple-400 to-pink-400' },
        { phase: '变现期', desc: '商业变现，开通橱窗/接广告', threshold: 10000, target: 100000, color: 'bg-orange-400', activeColor: 'from-orange-400 to-amber-400' },
        { phase: '头部期', desc: '品牌合作，打造个人IP', threshold: 100000, target: 1000000, color: 'bg-green-400', activeColor: 'from-green-400 to-teal-400' },
      ]
      const currentPhaseIdx = Math.max(0, phases.findIndex((p, i) => totalFans >= p.threshold && (i === phases.length - 1 || totalFans < phases[i + 1].threshold)))

      const weekEngagement = platformStats.likes.slice(-7).reduce((a: number, b: number) => a + b, 0) +
        platformStats.comments.slice(-7).reduce((a: number, b: number) => a + b, 0)

      function startEdit(goal: any) {
        setEditingId(goal.id)
        setEditValue(goal.target.toString())
      }

      function saveEdit(id: string) {
        const val = parseInt(editValue)
        if (!isNaN(val) && val > 0) {
          setGoals((prev: any[]) => prev.map((g: any) => g.id === id ? { ...g, target: val } : g))
        }
        setEditingId(null)
      }

      function getPct(current: number, target: number) {
        return Math.min(100, Math.round((current / Math.max(target, 1)) * 100))
      }

      function getStatusLabel(pct: number) {
        if (pct >= 100) return { label: '已完成 🎉', color: 'text-green-500 bg-green-50' }
        if (pct >= 75) return { label: '即将完成', color: 'text-blue-500 bg-blue-50' }
        if (pct >= 50) return { label: '进行中', color: 'text-orange-500 bg-orange-50' }
        return { label: '加油', color: 'text-gray-400 bg-gray-100' }
      }

      return (
        <>
          {/* 本周数据摘要 */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl p-4 text-white shadow-md">
            <div className="text-white/70 text-xs mb-2">本周运营概览</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '新增粉丝', value: (platformStats.fans[6] - platformStats.fans[0]).toLocaleString(), icon: '👥' },
                { label: '本周发布', value: `${schedule.filter((s: any) => s.status === '已发布').length} 条`, icon: '🎬' },
                { label: '互动总量', value: weekEngagement >= 1000 ? (weekEngagement / 1000).toFixed(1) + 'k' : weekEngagement.toString(), icon: '❤️' },
              ].map((item: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="text-lg mb-0.5">{item.icon}</div>
                  <div className="font-black text-base">{item.value}</div>
                  <div className="text-white/70 text-[10px]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 目标进度卡片 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-gray-900 text-sm">🎯 本月目标追踪</div>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {goals.filter((g: any) => getPct(g.current, g.target) >= 100).length}/{goals.length} 完成
              </span>
            </div>
            <div className="space-y-4">
              {goals.map((g: any) => {
                const pct = getPct(g.current, g.target)
                const status = getStatusLabel(pct)
                const isEditing = editingId === g.id
                return (
                  <div key={g.id} className={`rounded-2xl p-3 transition-all ${pct >= 100 ? 'bg-green-50 ring-1 ring-green-200' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm ${g.bgColor}`}>{g.icon}</div>
                        <div>
                          <div className="text-xs font-bold text-gray-800">{g.label}</div>
                          <div className="text-[10px] text-gray-400">{g.desc}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${status.color}`}>{status.label}</span>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-2">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${g.color} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* 数值 + 可编辑目标 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-black ${g.textColor}`}>
                          {g.current >= 10000 ? (g.current / 10000).toFixed(1) + '万' : g.current.toLocaleString()}{g.unit}
                        </span>
                        <span className="text-xs text-gray-400">/</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              value={editValue}
                              onChange={(e: any) => setEditValue(e.target.value)}
                              className="w-20 text-xs border border-blue-300 rounded-lg px-2 py-0.5 outline-none"
                              type="number"
                              autoFocus
                              onBlur={() => saveEdit(g.id)}
                              onKeyDown={(e: any) => e.key === 'Enter' && saveEdit(g.id)}
                            />
                            <span className="text-xs text-gray-400">{g.unit}</span>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(g)} className="text-xs text-gray-400 hover:text-blue-500 transition-colors">
                            {g.target >= 10000 ? (g.target / 10000).toFixed(1) + '万' : g.target.toLocaleString()}{g.unit}
                            <span className="ml-1 text-[9px] text-gray-300">✏️</span>
                          </button>
                        )}
                      </div>
                      <span className={`text-sm font-black ${pct >= 100 ? 'text-green-500' : g.textColor}`}>{pct}%</span>
                    </div>

                    {pct >= 100 && (
                      <div className="mt-2 text-center text-xs text-green-500 font-bold animate-bounce">
                        🎉 目标达成！继续保持！
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 成长阶段 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-gray-900 text-sm">📈 成长阶段</div>
              <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                当前：{phases[currentPhaseIdx]?.phase}
              </span>
            </div>

            {/* 阶段进度条 */}
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                {phases.map((p: any, i: number) => (
                  <div key={i} className={`flex-1 h-2 rounded-full transition-all ${i <= currentPhaseIdx ? `bg-gradient-to-r ${p.activeColor}` : 'bg-gray-100'}`} />
                ))}
              </div>
              <div className="flex justify-between">
                {phases.map((p: any, i: number) => (
                  <span key={i} className={`text-[9px] font-semibold ${i === currentPhaseIdx ? 'text-blue-500' : i < currentPhaseIdx ? 'text-green-400' : 'text-gray-300'}`}>
                    {p.phase}
                  </span>
                ))}
              </div>
            </div>

            {/* 当前阶段详情 */}
            <div className={`bg-gradient-to-r ${phases[currentPhaseIdx]?.activeColor} rounded-2xl p-3 text-white mb-3`}>
              <div className="font-bold text-sm mb-1">{phases[currentPhaseIdx]?.phase}</div>
              <div className="text-white/80 text-xs mb-2">{phases[currentPhaseIdx]?.desc}</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/70">当前粉丝</span>
                <span className="font-bold">{totalFans >= 10000 ? (totalFans / 10000).toFixed(1) + '万' : totalFans.toLocaleString()}</span>
              </div>
              {currentPhaseIdx < phases.length - 1 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70">距下一阶段</span>
                    <span className="font-bold">{(phases[currentPhaseIdx + 1].threshold - totalFans).toLocaleString()} 粉丝</span>
                  </div>
                  <div className="bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5 transition-all"
                      style={{ width: `${Math.min(100, ((totalFans - phases[currentPhaseIdx].threshold) / Math.max(phases[currentPhaseIdx + 1].threshold - phases[currentPhaseIdx].threshold, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 所有阶段列表 */}
            <div className="space-y-2">
              {phases.map((p: any, i: number) => (
                <div key={i} className={`flex gap-3 py-2.5 px-3 rounded-xl transition-all ${i === currentPhaseIdx ? 'bg-blue-50' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i < currentPhaseIdx ? 'bg-green-400' : i === currentPhaseIdx ? p.color : 'bg-gray-200'}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-bold ${i === currentPhaseIdx ? 'text-blue-600' : i < currentPhaseIdx ? 'text-green-500' : 'text-gray-400'}`}>{p.phase}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${i < currentPhaseIdx ? 'bg-green-50 text-green-500' : i === currentPhaseIdx ? 'bg-blue-50 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>
                        {i < currentPhaseIdx ? '✅ 已完成' : i === currentPhaseIdx ? '进行中' : '未开始'}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">{p.desc}</div>
                    <div className="text-[10px] text-gray-300 mt-0.5">目标：{p.target >= 10000 ? (p.target / 10000) + '万' : p.target.toLocaleString()} 粉丝</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 运营诊断 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="font-bold text-gray-900 text-sm mb-3">🤖 AI 运营诊断</div>
            <div className="space-y-2">
              {[
                { type: '优势', icon: '✅', color: 'bg-green-50 text-green-700', content: `互动率 ${platformStats.avgEngagement.toFixed(1)}%，高于行业平均水平` },
                { type: '待改进', icon: '⚠️', color: 'bg-orange-50 text-orange-700', content: `发布频率偏低，建议每周至少发布 3 条内容` },
                { type: '建议', icon: '💡', color: 'bg-blue-50 text-blue-700', content: `${acc.industry}行业最佳发布时间为 19:00-21:00，建议调整排期` },
              ].map((item: any, i: number) => (
                <div key={i} className={`rounded-xl p-3 ${item.color}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0">{item.icon}</span>
                    <div>
                      <span className="text-[10px] font-bold mr-1">{item.type}</span>
                      <span className="text-xs">{item.content}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )
    }

    
function Operations({ acc, opsTab, setOpsTab, schedule, setSchedule, savedContents, showToast, insights, insightsLoading, fetchInsights, showAddSchedule, setShowAddSchedule, newScheduleTitle, setNewScheduleTitle, newSchedulePlatform, setNewSchedulePlatform, addScheduleItem, generateWeekPlan, weekPlanLoading, showWeekPlan, setShowWeekPlan, dragItem, setDragItem, dragOverDate, setDragOverDate, handleDragDrop, platformStats, setPlatformStats, statsRange, setStatsRange, showDataBind, setShowDataBind, dataBindTab, setDataBindTab, manualFans, setManualFans, manualPlays, setManualPlays, manualLikes, setManualLikes, statsLoading, fetchPlatformStats, updateManualStats, setShowAiPanel, videoRecords, showVideoRecord, setShowVideoRecord, recordingVideo, setRecordingVideo, quickRecordData, setQuickRecordData, saveVideoRecord, reviewData, reviewLoading, fetchReview, reviewPeriod, setReviewPeriod, publishingId, setPublishingId, showPublishGuide, setShowPublishGuide, scheduleDetailId, setScheduleDetailId }: any) {
  const TABS = [{ id: 'schedule', label: '📅 排期' }, { id: 'stats', label: '📊 数据' }, { id: 'review', label: '🔍 复盘' }, { id: 'goals', label: '🎯 目标' }]
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
              <input
                value={newScheduleTime}
                onChange={e => setNewScheduleTime(e.target.value)}
                placeholder="发布时间（如：明天 18:30）"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
              />
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-gray-700">🔔 发布提醒</p>
                  <p className="text-xs text-gray-400">提前通知你发布视频</p>
                </div>
                <button onClick={() => setNewScheduleReminder(!newScheduleReminder)} className={`w-12 h-6 rounded-full transition-all relative ${newScheduleReminder ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${newScheduleReminder ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              {newScheduleReminder && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">提前提醒时间</p>
                  <div className="flex gap-2">
                    {[15, 30, 60, 120].map(m => (
                      <button key={m} onClick={() => setNewScheduleReminderMinutes(m)} className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${newScheduleReminderMinutes === m ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{m < 60 ? `${m}分钟` : `${m/60}小时`}</button>
                    ))}
                  </div>
                </div>
              )}
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
            {/* 发布任务管理 */}
            <PublishManager
              schedule={schedule} setSchedule={setSchedule} showToast={showToast}
              publishingId={publishingId} setPublishingId={setPublishingId}
              showPublishGuide={showPublishGuide} setShowPublishGuide={setShowPublishGuide}
              scheduleDetailId={scheduleDetailId} setScheduleDetailId={setScheduleDetailId}
              setShowAddSchedule={setShowAddSchedule}
            />

            <ContentCalendar schedule={schedule} setSchedule={setSchedule} showToast={showToast} setShowAddSchedule={setShowAddSchedule} setShowVideoRecord={setShowVideoRecord} setQuickRecordData={setQuickRecordData} generateWeekPlan={generateWeekPlan} weekPlanLoading={weekPlanLoading} dragItem={dragItem} setDragItem={setDragItem} dragOverDate={dragOverDate} setDragOverDate={setDragOverDate} handleDragDrop={handleDragDrop} />

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
              <StatsTab
                acc={acc}
                platformStats={platformStats}
                statsRange={statsRange}
                setStatsRange={setStatsRange}
                showDataBind={showDataBind}
                setShowDataBind={setShowDataBind}
                dataBindTab={dataBindTab}
                setDataBindTab={setDataBindTab}
                manualFans={manualFans}
                setManualFans={setManualFans}
                manualPlays={manualPlays}
                setManualPlays={setManualPlays}
                manualLikes={manualLikes}
                setManualLikes={setManualLikes}
                statsLoading={statsLoading}
                fetchPlatformStats={fetchPlatformStats}
                updateManualStats={updateManualStats}
                videoRecords={videoRecords}
              />
            )}

            {/* Review Tab — 数据复盘 */}
            {opsTab === 'review' && (
              <ReviewTab
                acc={acc}
                videoRecords={videoRecords}
                reviewData={reviewData}
                reviewLoading={reviewLoading}
                fetchReview={fetchReview}
                reviewPeriod={reviewPeriod}
                setReviewPeriod={setReviewPeriod}
                schedule={schedule}
                savedContents={savedContents}
              />
            )}

            {/* Goals Tab */}
            {opsTab === 'goals' && (
              <GoalsTab
                acc={acc}
                platformStats={platformStats}
                schedule={schedule}
                savedContents={savedContents}
                videoRecords={videoRecords}
              />
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
  saveToLocal, exportTopics, exportContents,
  theme, setTheme,
  accentColor, setAccentColor,
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
              <div className="text-xs text-gray-300 mt-0.5">v10.0.0</div>
            </div>

            {/* 外观设置 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">🎨 外观设置</div>
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2 font-medium">界面模式</div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'light', label: '浅色', icon: '☀️' },
                    { id: 'dark', label: '深色', icon: '🌙' },
                    { id: 'purple', label: '紫色', icon: '💜' },
                    { id: 'green', label: '绿色', icon: '🌿' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${theme === t.id ? 'bg-blue-50 border-2 border-blue-400 text-blue-600' : 'bg-gray-50 border-2 border-transparent text-gray-500'}`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-2 font-medium">主题色</div>
                <div className="flex gap-3 justify-center">
                  {[
                    { id: 'blue', color: '#3B82F6', label: '蓝色' },
                    { id: 'purple', color: '#8B5CF6', label: '紫色' },
                    { id: 'green', color: '#10B981', label: '绿色' },
                    { id: 'orange', color: '#F59E0B', label: '橙色' },
                    { id: 'red', color: '#EF4444', label: '红色' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setAccentColor(c.id)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full transition-all active:scale-90 ${accentColor === c.id ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </div>
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
                { version: 'v9.3', date: '2026-05-19', desc: '深色模式生效、主题色切换、底部安全区、空状态、确认弹窗、数据导出、PWA' },
                { version: 'v9.2', date: '2026-05-18', desc: '字幕字号颜色、视频生成阶段指示器、双层动画' },
                { version: 'v9.1', date: '2026-05-18', desc: '文案模板库、AI风格分析' },
                { version: 'v9.0', date: '2026-05-18', desc: '深色模式框架、主题色切换' },
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

            {/* 数据管理 */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-900 text-sm mb-3">📦 数据管理</div>
              <div className="space-y-2">
                {[
                  { icon: '📥', label: '导出选题库', desc: `共 ${savedTopics?.length || 0} 条选题`, action: exportTopics, color: 'text-blue-500' },
                  { icon: '📄', label: '导出文案库', desc: `共 ${savedContents?.length || 0} 条文案`, action: exportContents, color: 'text-green-500' },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl active:scale-[0.98] transition-all text-left">
                    <span className={`text-xl ${item.color}`}>{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                    <span className="text-xs text-gray-400">CSV →</span>
                  </button>
                ))}
              </div>
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
