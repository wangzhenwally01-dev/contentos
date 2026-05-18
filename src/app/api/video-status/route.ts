import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })

    if (taskId.startsWith('demo_')) {
      return NextResponse.json({ status: 'demo', message: '演示模式，无真实视频' })
    }

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
    if (!MINIMAX_API_KEY) return NextResponse.json({ error: 'API 未配置' }, { status: 503 })

    const res = await fetch(`https://api.minimaxi.com/v1/query/video_generation?task_id=${taskId}`, {
      headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
    })

    if (!res.ok) return NextResponse.json({ error: `查询失败: ${res.status}` }, { status: 500 })

    const data = await res.json()
    const status = data?.status || data?.task_status
    const fileId = data?.file_id
    let videoUrl = null

    if (fileId) {
      const fileRes = await fetch(`https://api.minimaxi.com/v1/files/retrieve?file_id=${fileId}`, {
        headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` },
      })
      if (fileRes.ok) {
        const fileData = await fileRes.json()
        videoUrl = fileData?.file?.download_url || null
      }
    }

    return NextResponse.json({ status, videoUrl, taskId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
