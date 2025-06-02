import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700&family=Figtree:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid grid-rows-[48px_1fr] h-screen font-['Figtree'] text-gray-800 antialiased" style={{ background: "#fdfdfd" }}>
      <header className="bg-white flex items-center px-4 border-b border-gray-300" style={{ fontFamily: "'Unbounded', sans-serif" }}>
          <h1 className="text-lg font-semibold text-gray-800">Blocks on Base</h1>
        </header>
        <main className="grid grid-cols-[250px_1fr] h-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}