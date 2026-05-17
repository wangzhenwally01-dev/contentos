import type{Metadata}from'next'
import'./globals.css'
export const metadata:Metadata={title:'ContentOS - AI 内容增长工作台',description:'短视频内容创作 AI 助手'}
export default function RootLayout({children}:{children:React.ReactNode}){return(<html lang='zh-CN'><body>{children}</body></html>)}
