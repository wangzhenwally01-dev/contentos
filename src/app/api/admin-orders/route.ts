import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'contentos_admin_2026'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

function checkAuth(req: NextRequest) {
  const token = req.headers.get('x-admin-token') || req.nextUrl.searchParams.get('token')
  return token === ADMIN_TOKEN
}

// GET: 获取订单列表
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') || ''
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data || [], total: data?.length || 0 })
}

// POST: 审核订单（通过/拒绝）
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, action, note } = await req.json()
  if (!orderId || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const newStatus = action === 'approve' ? 'paid' : 'rejected'

  const { error } = await supabase.from('orders').update({
    status: newStatus,
    updated_at: new Date().toISOString(),
    transfer_no: note || undefined,
  }).eq('order_id', orderId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, orderId, status: newStatus })
}
