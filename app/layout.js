import './globals.css'

export const metadata = {
  title: 'Dev Aposentado',
  description: 'Simulação text-based de um dev que se aposenta e compra uma propriedade rural. Hobby project.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
