import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./home/globals.css";
import { ContextProvider } from "@/wrappers/MainContext";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { AuthProvider } from "@/wrappers/AuthProvider";
import { AdminContextProvider } from "@/wrappers/AdminContext";
import { NotificationProvider } from "@/wrappers/NotificationContext";
import { ConnectivityBanner } from "@/components/ConnectivityBanner"; 
import { UploadProvider } from "@/wrappers/UploadContext";
import { LocaleProvider } from "@/wrappers/LocaleProvider";
import QueryProvider from "@/wrappers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExploreTMF",
  description: "Electronic Trial Master File system",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/x-icon' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Тема оформления Radix */}
        <Theme>
          {/* Локали next-intl */}
          <LocaleProvider> 
            {/* Поиск документов */}
            <QueryProvider>
              {/* Основной контекст */}
              <ContextProvider>
                {/* Авторизация */}
                <AuthProvider>
                  {/* Всплывающие уведомления */}
                  <NotificationProvider>
                    {/* Контекст для управления системой */}
                    <AdminContextProvider>
                      {/* Контекст для загрузки документов */}
                      <UploadProvider>
                      
                        <ConnectivityBanner />
                        {children}
                      
                      </UploadProvider>
                    </AdminContextProvider>
                  </NotificationProvider>
                </AuthProvider>
              </ContextProvider>
            </QueryProvider>
          </LocaleProvider>
        </Theme>
      </body>
    </html>
  );
}
