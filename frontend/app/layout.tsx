import "./globals.css";
import ReceiptPrinter from "../components/ReceiptPrinter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {/* Receipt Printer diletakkan di root layout agar selalu siap menerima event print */}
        <ReceiptPrinter />
      </body>
    </html>
  );
}
