import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt, model = 'T2V-01', duration = 6 } = await req.json()
    if (!prompt) return NextResponse.json({ error: '缺少视频描述' }, { status: 400 })

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''

    if (!MINIMAX_API_KEY || MINIMAX_API_KEY === 'your_minimax_api_key_here') {
      return NextResponse.json({
        taskId: `demo_${Date.now()}`,
        status: 'demo',
        message: 'MiniMax API 未配置，当前为演示模式',
        configured: false,
      })
    }

    const res = await fetch('https://api.minimaxi.com/v1/video_generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, duration, resolution: '1080p' }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `视频生成失败: ${res.status}`, detail: errText.slice(0, 200) }, { status: 500 })
    }

    const data = await res.json()
    const taskId = data?.task_id || data?.id
    if (!taskId) return NextResponse.json({ error: '未获取到任务ID' }, { status: 500 })

    return NextResponse.json({ taskId, status: 'pending', configured: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
