import { NextRequest, NextResponse } from 'next/server'

/**
 * 视频合成 API
 * 支持三种模式：
 * 1. latentsync — 上传人物视频 + 音频 → LatentSync 换嘴型
 * 2. ffmpeg_simple — 静态图片 + 音频 → FFmpeg 合成视频
 * 3. minimax_t2v — 文字描述 → MiniMax T2V 生成视频
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode = 'ffmpeg_simple', ...params } = body

    if (mode === 'latentsync') {
      return handleLatentSync(params)
    } else if (mode === 'ffmpeg_simple') {
      return handleFFmpegSimple(params)
    } else if (mode === 'minimax_t2v') {
      return handleMinimaxT2V(params)
    } else {
      return NextResponse.json({ error: '不支持的合成模式' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ─── LatentSync 换嘴型 ────────────────────────────────────
async function handleLatentSync({ videoBase64, audioBase64, videoFormat = 'mp4', audioFormat = 'mp3' }: any) {
  // LatentSync 使用 Replicate API 托管
  const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY || ''
  
  if (!REPLICATE_API_KEY) {
    // 无 API Key 时返回演示模式
    return NextResponse.json({
      mode: 'latentsync',
      status: 'demo',
      message: '请配置 REPLICATE_API_KEY 环境变量以启用 LatentSync 换嘴型功能',
      configured: false,
      demoTaskId: `latentsync_demo_${Date.now()}`,
    })
  }

  if (!videoBase64 || !audioBase64) {
    return NextResponse.json({ error: '缺少视频或音频数据' }, { status: 400 })
  }

  // 调用 Replicate LatentSync API
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'fdb5c4b7c4e2e5b5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5', // LatentSync model version
      input: {
        video: `data:video/${videoFormat};base64,${videoBase64}`,
        audio: `data:audio/${audioFormat};base64,${audioBase64}`,
      }
    })
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `LatentSync 调用失败: ${res.status}`, detail: err.slice(0, 200) }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({
    mode: 'latentsync',
    status: 'pending',
    taskId: data.id,
    configured: true,
  })
}

// ─── FFmpeg 简单合成（图片+音频→视频）────────────────────
async function handleFFmpegSimple({ imageBase64, audioBase64, imageFormat = 'jpg', audioFormat = 'mp3', duration = 30, subtitles = [] }: any) {
  // 服务端 FFmpeg 合成需要服务器环境，Vercel 无法直接运行 FFmpeg
  // 这里返回合成参数，由前端使用 ffmpeg.wasm 处理
  // 或者调用第三方 FFmpeg API 服务
  
  const FFMPEG_API_KEY = process.env.FFMPEG_API_KEY || ''
  
  if (!imageBase64 || !audioBase64) {
    return NextResponse.json({ error: '缺少图片或音频数据' }, { status: 400 })
  }

  // 如果有第三方 FFmpeg API（如 Bannerbear、Shotstack 等）
  if (FFMPEG_API_KEY) {
    // Shotstack API 示例
    const res = await fetch('https://api.shotstack.io/stage/render', {
      method: 'POST',
      headers: {
        'x-api-key': FFMPEG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeline: {
          tracks: [
            {
              clips: [{
                asset: { type: 'image', src: `data:image/${imageFormat};base64,${imageBase64}` },
                start: 0, length: duration,
              }]
            },
            {
              clips: [{
                asset: { type: 'audio', src: `data:audio/${audioFormat};base64,${audioBase64}` },
                start: 0, length: duration,
              }]
            }
          ]
        },
        output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16' }
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        mode: 'ffmpeg_simple',
        status: 'pending',
        taskId: data.response?.id,
        configured: true,
      })
    }
  }

  // 无 API 时，返回前端 ffmpeg.wasm 所需参数
  return NextResponse.json({
    mode: 'ffmpeg_simple',
    status: 'client_side',
    message: '请使用前端 FFmpeg 合成',
    imageBase64,
    audioBase64,
    imageFormat,
    audioFormat,
    duration,
    subtitles,
    configured: false,
  })
}

// ─── MiniMax T2V ─────────────────────────────────────────
async function handleMinimaxT2V({ prompt, duration = 6 }: any) {
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
  
  if (!MINIMAX_API_KEY) {
    return NextResponse.json({
      mode: 'minimax_t2v',
      status: 'demo',
      message: '请配置 MINIMAX_API_KEY 环境变量',
      configured: false,
      demoTaskId: `t2v_demo_${Date.now()}`,
    })
  }

  const res = await fetch('https://api.minimaxi.com/v1/video_generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'T2V-01', prompt, duration, resolution: '1080p' }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `T2V 失败: ${res.status}`, detail: err.slice(0, 200) }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json({
    mode: 'minimax_t2v',
    status: 'pending',
    taskId: data.task_id || data.id,
    configured: true,
  })
}
