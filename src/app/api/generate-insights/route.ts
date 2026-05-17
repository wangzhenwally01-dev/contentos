import{NextRequest,NextResponse}from'next/server'
    import{deepseek,buildInsightPrompt}from'@/lib/ai'
    export async function POST(req:NextRequest){
      try{
        const{views='12.3万',likes='2341',comments='186',collects='892'}=await req.json()
        const completion=await deepseek.chat.completions.create({model:'deepseek-chat',messages:[{role:'system',content:'只返回JSON格式数据'},{role:'user',content:buildInsightPrompt({views,likes,comments,collects})}],temperature:0.7,max_tokens:1000})
        const raw=completion.choices[0].message.content||'{}'
        const result=JSON.parse(raw.replace(/\`\`\`json\n?/g,'').replace(/\`\`\`\n?/g,'').trim())
        return NextResponse.json({success:true,insights:result.insights})
      }catch(e){return NextResponse.json({error:'生成失败'},{status:500})}
    }