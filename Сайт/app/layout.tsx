export const metadata = {
  title: "AI Trading Signals",
  description: "TradingView screenshot analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
