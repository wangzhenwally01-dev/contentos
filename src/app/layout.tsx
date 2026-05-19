import type{Metadata}from'next'
import'./globals.css'
export const metadata:Metadata={
  title:'ContentOS - AI 内容增长工作台',
  description:'短视频内容创作 AI 助手',
  manifest:'/manifest.json',
  appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'ContentOS'},
  viewport:{width:'device-width',initialScale:1,maximumScale:1,userScalable:false,viewportFit:'cover'},
}
export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang='zh-CN'>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="theme-color" content="#3B82F6"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
