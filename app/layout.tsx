import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "eAs1nGG-_- / ease2k · 个人手记",
  description: "记录日常，分享算法、C++、Java 与 MySQL 的学习和实践。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.lang=/^zh(?:-|$)/i.test(navigator.language)?"zh-CN":"en";}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
