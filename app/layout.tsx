import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "London Tycoon — 伦敦大富翁",
  description: "创建在线房间，邀请朋友在真实伦敦方位的动画地图上一起玩地产与虚构股票策略游戏。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  metadataBase: new URL("https://london-tycoon-game.bububebe1905.chatgpt.site"),
  openGraph: {
    title: "London Tycoon — 伦敦大富翁",
    description: "邀请朋友加入伦敦财富路线：买地产、盖建筑、投资股票并升级双骰。",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "London Tycoon game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "London Tycoon — 伦敦大富翁",
    description: "在线邀请朋友，一起经营伦敦地产与虚构股票。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
