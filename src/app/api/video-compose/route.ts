import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'latentsync', ...params } = body
    if (mode === 'latentsync') return handleLatentSync(params)
    if (mode === 'portrait_tts') return handlePortraitTTS(params)
    if (mode === 'minimax_t2v') return handleMinimaxT2V(params)
    return NextResponse.json({ error: '不支持的合成模式' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function handleLatentSync({ videoUrl, audioUrl, videoBase64, audioBase64, videoFormat = 'mp4', audioFormat = 'mp3' }: any) {
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
  if (!REPLICATE_API_KEY) {
    return NextResponse.json({ mode: 'latentsync', status: 'unconfigured', error: '请配置 REPLICATE_API_KEY 环境变量以启用 LatentSync 换嘴型功能', configured: false }, { status: 503 })
  }
  const videoInput = videoUrl || (videoBase64 ? `data:video/${videoFormat};base64,${videoBase64}` : null)
  const audioInput = audioUrl || (audioBase64 ? `data:audio/${audioFormat};base64,${audioBase64}` : null)
  if (!videoInput || !audioInput) return NextResponse.json({ error: '缺少视频或音频数据' }, { status: 400 })

  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: { 'Authorization': `Token ${REPLICATE_API_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'wait=5' },
    body: JSON.stringify({
      version: 'ad8a00b5fb3bc5286ffbd16cf9d7d85499f5a301416071c15a89bcd81eddfd47',
      input: { video: videoInput, audio: audioInput, guidance_scale: 2.0, inference_steps: 20 }
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `LatentSync 提交失败: ${res.status}`, detail: err.slice(0,300), configured: true }, { status: 500 })
  }
  const data = await res.json()
  if (data.status === 'succeeded' && data.output) {
    return NextResponse.json({ mode: 'latentsync', status: 'done', videoUrl: data.output, taskId: data.id, configured: true })
  }
  return NextResponse.json({ mode: 'latentsync', status: 'pending', taskId: data.id, configured: true })
}

async function handlePortraitTTS({ imageBase64, audioBase64, imageFormat = 'jpg', audioFormat = 'mp3', duration = 6, script = '' }: any) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
  const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ''
  if (!imageBase64 || !audioBase64) return NextResponse.json({ error: '缺少图片或音频数据' }, { status: 400 })
  if (!MINIMAX_API_KEY) {
    return NextResponse.json({ mode: 'portrait_tts', status: 'unconfigured', error: '请配置 MINIMAX_API_KEY 环境变量', configured: false }, { status: 503 })
  }
  const prompt = script ? `一位真实的人物主播，正在讲述：${script.slice(0, 80)}，嘴唇自然运动，表情生动，竖屏视频` : '一位真实的人物主播正在讲话，嘴唇自然运动，表情生动，竖屏视频'
  const apiUrl = MINIMAX_GROUP_ID ? `https://api.minimaxi.com/v1/video_generation?GroupId=${MINIMAX_GROUP_ID}` : `https://api.minimaxi.com/v1/video_generation`
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'I2V-01', prompt, first_frame_image: `data:image/${imageFormat};base64,${imageBase64}`, duration: Math.min(duration, 6), resolution: '1080p' }),
  })
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `I2V 失败: ${res.status}`, detail: err.slice(0,200), configured: true }, { status: 500 })
  }
  const data = await res.json()
  const taskId = data?.task_id || data?.id
  if (!taskId) return NextResponse.json({ error: '未获取到任务ID', detail: JSON.stringify(data).slice(0,200), configured: true }, { status: 500 })
  return NextResponse.json({ mode: 'portrait_tts', status: 'pending', taskId, configured: true, provider: 'minimax_i2v' })
}

async function handleMinimaxT2V({ prompt, duration = 6 }: any) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
  const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ''
  if (!MINIMAX_API_KEY) {
    return NextResponse.json({ mode: 'minimax_t2v', status: 'unconfigured', error: '请配置 MINIMAX_API_KEY 环境变量', configured: false }, { status: 503 })
  }
  const apiUrl = MINIMAX_GROUP_ID ? `https://api.minimaxi.com/v1/video_generation?GroupId=${MINIMAX_GROUP_ID}` : `https://api.minimaxi.com/v1/video_generation`
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MINIMAX_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'T2V-01-Director', prompt, duration, resolution: '1080p' }),
  })
  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `T2V 失败: ${res.status}`, detail: err.slice(0, 200), configured: true }, { status: 500 })
  }
  const data = await res.json()
  return NextResponse.json({ mode: 'minimax_t2v', status: 'pending', taskId: data.task_id || data.id, configured: true })
}
