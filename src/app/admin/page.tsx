'use client'
import React, { useState, useEffect, useCallback } from 'react'

const ADMIN_TOKEN = 'contentos_admin_2026'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: '待付款', color: 'bg-gray-100 text-gray-500' },
  reviewing: { label: '待审核', color: 'bg-amber-100 text-amber-600' },
  paid:      { label: '已到账', color: 'bg-green-100 text-green-600' },
  rejected:  { label: '已拒绝', color: 'bg-red-100 text-red-500' },
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/admin-orders${filterStatus ? `?status=${filterStatus}` : ''}`
      const res = await fetch(url, { headers: { 'x-admin-token': ADMIN_TOKEN } })
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
      else showToast('加载失败：' + (data.error || '未知错误'))
    } catch { showToast('网络错误') }
    setLoading(false)
  }, [filterStatus])

  useEffect(() => {
    if (authed) fetchOrders()
  }, [authed, fetchOrders])

  async function handleAction(orderId: string, action: 'approve' | 'reject') {
    setActionLoading(orderId + action)
    try {
      const res = await fetch('/api/admin-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
        body: JSON.stringify({ orderId, action, note: noteMap[orderId] || '' }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(action === 'approve' ? '✅ 已审核通过，积分到账' : '已拒绝订单')
        fetchOrders()
      } else {
        showToast('操作失败：' + (data.error || ''))
      }
    } catch { showToast('网络错误') }
    setActionLoading(null)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg w-80">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔐</div>
            <div className="font-black text-gray-900 text-xl">ContentOS 管理后台</div>
            <div className="text-xs text-gray-400 mt-1">仅限管理员访问</div>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && password === ADMIN_TOKEN && setAuthed(true)}
            placeholder="输入管理员密码"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => {
              if (password === ADMIN_TOKEN) setAuthed(true)
              else alert('密码错误')
            }}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold rounded-xl"
          >进入后台</button>
        </div>
      </div>
    )
  }

  const reviewingCount = orders.filter(o => o.status === 'reviewing').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-2.5 rounded-full z-50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-black text-sm">CO</div>
          <div>
            <div className="font-black text-gray-900">ContentOS 管理后台</div>
            <div className="text-xs text-gray-400">订单审核 · 积分管理</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {reviewingCount > 0 && (
            <span className="bg-amber-100 text-amber-600 text-xs font-bold px-3 py-1 rounded-full">
              {reviewingCount} 条待审核
            </span>
          )}
          <button onClick={fetchOrders} disabled={loading} className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold disabled:opacity-50">
            {loading ? '加载中...' : '🔄 刷新'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: '全部订单', value: orders.length, color: 'from-gray-500 to-gray-600' },
            { label: '待审核', value: orders.filter(o => o.status === 'reviewing').length, color: 'from-amber-400 to-orange-500' },
            { label: '已到账', value: orders.filter(o => o.status === 'paid').length, color: 'from-green-400 to-emerald-500' },
            { label: '已拒绝', value: orders.filter(o => o.status === 'rejected').length, color: 'from-red-400 to-rose-500' },
          ].map((s, i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4 text-white`}>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 mb-4">
          {[
            { value: '', label: '全部' },
            { value: 'reviewing', label: '⏳ 待审核' },
            { value: 'paid', label: '✅ 已到账' },
            { value: 'pending', label: '🕐 待付款' },
            { value: 'rejected', label: '❌ 已拒绝' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === f.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >{f.label}</button>
          ))}
        </div>

        {/* 订单列表 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-500">暂无订单数据</div>
            <div className="text-xs text-gray-400 mt-1">用户充值后订单将显示在这里</div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-500' }
              const isReviewing = order.status === 'reviewing'
              return (
                <div key={order.order_id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${isReviewing ? 'border-amber-200' : 'border-transparent'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-gray-900 text-base">{order.credits?.toLocaleString()} 积分</span>
                        <span className="font-bold text-orange-500">{order.price}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusInfo.color}`}>{statusInfo.label}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{order.order_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{order.pay_method === 'alipay' ? '💙 支付宝' : '💚 微信'}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{new Date(order.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3 bg-gray-50 rounded-xl p-3">
                    <div><span className="text-gray-400">用户ID：</span>{order.user_id}</div>
                    <div><span className="text-gray-400">套餐：</span>{order.package_id || '-'}</div>
                    {order.transfer_no && (
                      <div className="col-span-2">
                        <span className="text-gray-400">转账单号：</span>
                        <span className="font-mono text-gray-700 font-semibold">{order.transfer_no}</span>
                      </div>
                    )}
                    <div><span className="text-gray-400">更新时间：</span>{new Date(order.updated_at).toLocaleString('zh-CN')}</div>
                  </div>

                  {isReviewing && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={noteMap[order.order_id] || ''}
                        onChange={e => setNoteMap(prev => ({ ...prev, [order.order_id]: e.target.value }))}
                        placeholder="备注（可选）"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(order.order_id, 'approve')}
                          disabled={actionLoading === order.order_id + 'approve'}
                          className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-400 text-white text-sm font-bold rounded-xl disabled:opacity-50"
                        >
                          {actionLoading === order.order_id + 'approve' ? '处理中...' : '✅ 审核通过 · 积分到账'}
                        </button>
                        <button
                          onClick={() => handleAction(order.order_id, 'reject')}
                          disabled={actionLoading === order.order_id + 'reject'}
                          className="px-4 py-2.5 bg-red-50 text-red-500 text-sm font-bold rounded-xl disabled:opacity-50"
                        >
                          {actionLoading === order.order_id + 'reject' ? '...' : '❌ 拒绝'}
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === 'paid' && (
                    <div className="bg-green-50 rounded-xl px-3 py-2 text-xs text-green-600 font-semibold">
                      ✅ 已审核通过，积分已到账
                    </div>
                  )}
                  {order.status === 'rejected' && (
                    <div className="bg-red-50 rounded-xl px-3 py-2 text-xs text-red-500">
                      ❌ 已拒绝
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
