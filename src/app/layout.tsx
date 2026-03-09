import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./home/globals.css";
import { ContextProvider } from "@/wrappers/MainContext";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { AuthProvider } from "@/wrappers/AuthProvider";
import { AdminContextProvider } from "@/wrappers/AdminContext";
import { NotificationProvider } from "@/wrappers/NotificationContext";
import { ConnectivityBanner } from "@/components/ConnectivityBanner"; // 👈 Импорт


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eTMF",
  description: "Manpremo electronic Trial Master File system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
      <Theme>
        <AuthProvider>
          <NotificationProvider>
            <AdminContextProvider>
              <ContextProvider>
                  <ConnectivityBanner /> 
                  {children}
                
              </ContextProvider>
            </AdminContextProvider>
          </NotificationProvider>  
        </AuthProvider>
      </Theme>
      </body>
    </html>
  );
}
