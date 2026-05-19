import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const mode = searchParams.get('mode') || 'latentsync'

  if (!taskId) return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })

  // Demo 模式
  if (taskId.includes('demo')) {
    return NextResponse.json({ status: 'demo', message: '演示模式，无真实视频' })
  }

  if (mode === 'latentsync') {
    const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
    if (!REPLICATE_API_KEY) return NextResponse.json({ status: 'demo' })

    const res = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` }
    })
    if (!res.ok) return NextResponse.json({ error: '查询失败' }, { status: 500 })
    const data = await res.json()
    
    if (data.status === 'succeeded') {
      return NextResponse.json({ status: 'Success', videoUrl: data.output })
    } else if (data.status === 'failed') {
      return NextResponse.json({ status: 'Fail', error: data.error })
    } else {
      return NextResponse.json({ status: 'Processing', progress: data.logs })
    }
  }

  if (mode === 'shotstack') {
    const FFMPEG_API_KEY = process.env.FFMPEG_API_KEY || ''
    if (!FFMPEG_API_KEY) return NextResponse.json({ status: 'demo' })

    const res = await fetch(`https://api.shotstack.io/stage/render/${taskId}`, {
      headers: { 'x-api-key': FFMPEG_API_KEY }
    })
    if (!res.ok) return NextResponse.json({ error: '查询失败' }, { status: 500 })
    const data = await res.json()
    const render = data.response

    if (render?.status === 'done') {
      return NextResponse.json({ status: 'Success', videoUrl: render.url })
    } else if (render?.status === 'failed') {
      return NextResponse.json({ status: 'Fail', error: render.error })
    } else {
      return NextResponse.json({ status: 'Processing', progress: render?.progress })
    }
  }

  return NextResponse.json({ error: '不支持的模式' }, { status: 400 })
}
