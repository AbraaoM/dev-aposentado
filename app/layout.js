import './globals.css'

export const metadata = {
  title: 'Dev Aposentado',
  description: 'Simulação de um dev que se aposenta e compra uma propriedade rural. Hobby project.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
