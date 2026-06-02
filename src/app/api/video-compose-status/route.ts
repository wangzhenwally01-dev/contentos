import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const mode = searchParams.get('mode') || 'latentsync'
  const provider = searchParams.get('provider') || ''

  if (!taskId) return NextResponse.json({ error: '缺少 taskId' }, { status: 400 })

  if (mode === 'latentsync' || mode === 'face_swap') {
    const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
    if (!REPLICATE_API_KEY) return NextResponse.json({ status: 'unconfigured' })
    const res = await fetch(`https://api.replicate.com/v1/predictions/${taskId}`, {
      headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` }
    })
    if (!res.ok) return NextResponse.json({ error: '查询失败' }, { status: 500 })
    const data = await res.json()
    if (data.status === 'succeeded') return NextResponse.json({ status: 'Success', videoUrl: data.output, imageUrl: data.output })
    if (data.status === 'failed') return NextResponse.json({ status: 'Fail', error: data.error })
    return NextResponse.json({ status: 'Processing', progress: data.logs?.slice(-200) || '' })
  }

  if (mode === 'minimax_t2v' || mode === 'portrait_tts' || provider === 'minimax_i2v') {
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
    const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ''
    if (!MINIMAX_API_KEY) return NextResponse.json({ status: 'unconfigured' })
    const queryUrl = MINIMAX_GROUP_ID
      ? `https://api.minimaxi.com/v1/query/video_generation?task_id=${taskId}&GroupId=${MINIMAX_GROUP_ID}`
      : `https://api.minimaxi.com/v1/query/video_generation?task_id=${taskId}`
    const res = await fetch(queryUrl, { headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` } })
    if (!res.ok) return NextResponse.json({ error: `查询失败: ${res.status}` }, { status: 500 })
    const data = await res.json()
    const status = data?.status || data?.task_status
    const fileId = data?.file_id
    let videoUrl = null
    if (fileId) {
      const fileQueryUrl = MINIMAX_GROUP_ID
        ? `https://api.minimaxi.com/v1/files/retrieve?file_id=${fileId}&GroupId=${MINIMAX_GROUP_ID}`
        : `https://api.minimaxi.com/v1/files/retrieve?file_id=${fileId}`
      const fileRes = await fetch(fileQueryUrl, { headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}` } })
      if (fileRes.ok) { const fd = await fileRes.json(); videoUrl = fd?.file?.download_url || null }
    }
    if (['Success', 'success', 'Finished'].includes(status)) return NextResponse.json({ status: 'Success', videoUrl, taskId })
    if (['Fail', 'fail', 'Failed'].includes(status)) return NextResponse.json({ status: 'Fail', error: data.message || '生成失败' })
    return NextResponse.json({ status: 'Processing', progress: data.progress || 0 })
  }

  return NextResponse.json({ error: '不支持的模式' }, { status: 400 })
}
