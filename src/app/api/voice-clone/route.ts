import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || ''
    const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || ''

    if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
      return NextResponse.json({
        error: 'MiniMax API 未配置',
        hint: '请在 Vercel 环境变量中添加 MINIMAX_API_KEY 和 MINIMAX_GROUP_ID',
        configured: false
      }, { status: 503 })
    }

    const body = await req.json()
    const { audioBase64, audioFormat = 'mp3', voiceName = '我的声音' } = body

    if (!audioBase64) {
      return NextResponse.json({ error: '缺少音频数据' }, { status: 400 })
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64')
    const boundary = `----FormBoundary${Date.now()}`
    const CRLF = '\r\n'
    const parts: Buffer[] = []

    const fileHeader = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="voice.${audioFormat}"`,
      `Content-Type: audio/${audioFormat}`,
      '',
      ''
    ].join(CRLF)
    parts.push(Buffer.from(fileHeader, 'utf-8'))
    parts.push(audioBuffer)
    parts.push(Buffer.from(CRLF, 'utf-8'))

    const voiceId = `custom_${Date.now()}`
    const voiceIdField = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="voice_id"`,
      '',
      voiceId
    ].join(CRLF) + CRLF
    parts.push(Buffer.from(voiceIdField, 'utf-8'))
    parts.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf-8'))

    const formData = Buffer.concat(parts)

    const res = await fetch(`https://api.minimax.chat/v1/voice_clone?GroupId=${MINIMAX_GROUP_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formData.length.toString(),
      },
      body: formData,
    })

    const data = await res.json()

    if (!res.ok || data.base_resp?.status_code !== 0) {
      const errMsg = data.base_resp?.status_msg || data.error || `克隆失败 (${res.status})`
      return NextResponse.json({ error: errMsg, configured: true }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      voiceId: data.voice_id || voiceId,
      voiceName,
      configured: true,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, configured: true }, { status: 500 })
  }
}
