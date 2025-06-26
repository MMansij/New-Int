import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import { Cinzel } from 'next/font/google'
import { Playfair_Display } from 'next/font/google'

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
})

export const metadata = {
  title: 'Intelliparse',
  description: 'Smart document parsing with parallax UI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cinzel.className} ${playfair.className}`}>{children}</body>
    </html>
  )
}
