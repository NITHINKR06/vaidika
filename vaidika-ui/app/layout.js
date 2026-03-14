import './globals.css'
import { AppProvider } from '@/lib/AppContext'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'VaidikaAI - Speak any language. Receive world-class care.',
  description: 'AI-powered clinical automation for multilingual healthcare.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
