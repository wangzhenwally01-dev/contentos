import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    const { packageId, credits, price, payMethod, userId } = await req.json()

    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const orderId = `CO${timestamp}${random}`

    const expireAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // 写入 Supabase（失败不影响主流程）
    try {
      await supabase.from('orders').insert({
        order_id: orderId,
        user_id: userId || 'anonymous',
        package_id: packageId,
        credits: credits,
        price: price,
        pay_method: payMethod || 'wechat',
        status: 'pending',
      })
    } catch (e) {
      console.error('Supabase insert failed:', e)
    }

    const qrUrl = payMethod === 'alipay'
      ? '/pay/alipay-qr.svg'
      : '/pay/wechat-qr.svg'

    return NextResponse.json({
      success: true,
      orderId,
      qrUrl,
      expireAt,
      credits,
      price,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
