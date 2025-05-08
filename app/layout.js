import { Roboto } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider";

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['400', '500', '700', '900'], // Include weights needed
});

export const metadata = {
  title: 'Fortune Cookie Lead Gen by Moving Walls',
  description: 'Discover your business future!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${roboto.variable} dark`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}