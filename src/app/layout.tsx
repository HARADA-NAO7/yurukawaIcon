import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const roundedFont = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-rounded"
});

export const metadata: Metadata = {
  title: "Yurukawa Icon Maker",
  description: "3キーワードからゆるかわ動物アイコンを生成するアプリ"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={roundedFont.variable}>{children}</body>
    </html>
  );
}
