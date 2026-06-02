import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'portrait_save', sourceImageBase64, targetImageBase64, imageFormat = 'jpg', avatarName = '我的形象' } = body

    if (mode === 'portrait_save') {
      if (!sourceImageBase64) return NextResponse.json({ error: '缺少图片数据' }, { status: 400 })
      const avatarId = `avatar_${Date.now()}`
      return NextResponse.json({ success: true, avatarId, avatarName, mode: 'portrait_save' })
    }

    if (mode === 'face_swap') {
      const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
      if (!REPLICATE_API_KEY) {
        return NextResponse.json({
          error: 'Replicate API 未配置',
          hint: '请在 Vercel 环境变量中添加 REPLICATE_API_KEY',
          configured: false
        }, { status: 503 })
      }
      if (!sourceImageBase64 || !targetImageBase64) {
        return NextResponse.json({ error: '缺少源图片或目标图片' }, { status: 400 })
      }
      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${REPLICATE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'cff87316e31787df12002c9e20a78a017a36cb31fde9862d8dedd15ab29b7288',
          input: {
            swap_image: `data:image/${imageFormat};base64,${sourceImageBase64}`,
            target_image: `data:image/${imageFormat};base64,${targetImageBase64}`,
          }
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `换脸失败: ${res.status}`, detail: err.slice(0,200), configured: true }, { status: 500 })
      }
      const data = await res.json()
      return NextResponse.json({ success: true, taskId: data.id, status: 'pending', configured: true, mode: 'face_swap' })
    }

    return NextResponse.json({ error: '不支持的模式' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })
    const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
    if (!REPLICATE_API_KEY) return NextResponse.json({ error: 'API 未配置' }, { status: 503 })
    const res = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` }
    })
    if (!res.ok) return NextResponse.json({ error: '查询失败' }, { status: 500 })
    const data = await res.json()
    if (data.status === 'succeeded') return NextResponse.json({ status: 'done', imageUrl: data.output })
    if (data.status === 'failed') return NextResponse.json({ status: 'error', error: data.error })
    return NextResponse.json({ status: 'processing', logs: data.logs })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
