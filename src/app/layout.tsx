import type { Metadata } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "./library.css";

export const metadata: Metadata = {
  title: "NextGame — 70.000+ Game. Satu Library. Terus Bertambah.",
  description:
    "Jelajahi 70.000+ game Steam yang didukung, aktifkan akses, dan kelola personal library melalui satu desktop app. Request Game dan Support Center melalui Discord. EA, Ubisoft, dan Denuvo coming soon.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "NextGame — 70.000+ Game. Satu Library. Terus Bertambah.",
    description:
      "Cari. Aktifkan. Tambahkan ke Library. Mainkan. Satu aplikasi untuk katalog dan personal library, dengan request dan support melalui Discord.",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
