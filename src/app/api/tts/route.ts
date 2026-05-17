import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, speed = 1.0 } = await req.json()
    if (!text) return NextResponse.json({ error: '缺少文本' }, { status: 400 })

    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
    const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ''

    if (!MINIMAX_API_KEY) {
      return NextResponse.json({ 
        error: 'MiniMax API Key 未配置', 
        hint: '请在 Vercel 环境变量中添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID',
        configured: false
      }, { status: 503 })
    }

    const res = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-02-hd',
        text,
        stream: false,
        voice_setting: {
          voice_id: voiceId || 'male-qn-qingse',
          speed,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `MiniMax API 错误: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const audioBase64 = data?.data?.audio
    if (!audioBase64) {
      return NextResponse.json({ error: '未获取到音频数据', raw: data }, { status: 500 })
    }

    return NextResponse.json({ audio: audioBase64, format: 'mp3', configured: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
