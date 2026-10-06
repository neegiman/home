import type { Metadata } from 'next'
import { Noto_Sans_KR } from 'next/font/google'

import './globals.css'
import './steps.css'

const notoSansKr = Noto_Sans_KR({
  variable: '--font-noto-sans-kr',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '한끼지도 | 주변 음식점 찾기',
  description: '현재 위치나 주소를 기준으로 가까운 음식점을 찾아보세요.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={notoSansKr.variable}>{children}</body>
    </html>
  )
}
