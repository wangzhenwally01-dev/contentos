import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    const { orderId, transferNo, userId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ success: false, error: '订单ID不能为空' }, { status: 400 })
    }

    // 更新订单状态为待审核
    try {
      await supabase.from('orders').update({
        transfer_no: transferNo || '',
        status: 'reviewing',
        updated_at: new Date().toISOString(),
      }).eq('order_id', orderId)
    } catch (e) {
      console.error('Supabase update failed:', e)
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: 'reviewing',
      message: '已收到您的付款凭证，人工审核通常在1-2小时内完成，审核通过后积分将自动到账。',
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
