import { NextResponse } from 'next/server'

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ 
      error: '缺少 SUPABASE_SERVICE_ROLE_KEY',
      hint: '请在 Vercel 环境变量中添加 SUPABASE_SERVICE_ROLE_KEY'
    }, { status: 500 })
  }

  // 通过 Supabase REST API 执行 SQL（需要 service_role key）
  const sqlStatements = [
    `CREATE TABLE IF NOT EXISTS contents (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id),
      topic text,
      style text,
      content text,
      account_name text,
      created_at timestamptz DEFAULT now()
    )`,
    `ALTER TABLE contents ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "用户只能访问自己的内容" ON contents FOR ALL USING (auth.uid() = user_id)`,
    `CREATE TABLE IF NOT EXISTS positionings (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id),
      industry text,
      product text,
      target_customer text,
      city text,
      advantage text,
      result jsonb,
      created_at timestamptz DEFAULT now()
    )`,
    `ALTER TABLE positionings ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "用户只能访问自己的定位" ON positionings FOR ALL USING (auth.uid() = user_id)`,
  ]

  const results: { sql: string; status: string }[] = []

  for (const sql of sqlStatements) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      })
      const text = await res.text()
      results.push({ sql: sql.slice(0, 50) + '...', status: res.ok ? '✅' : `❌ ${text}` })
    } catch (e: any) {
      results.push({ sql: sql.slice(0, 50) + '...', status: `❌ ${e.message}` })
    }
  }

  return NextResponse.json({ message: '初始化完成', results })
}
