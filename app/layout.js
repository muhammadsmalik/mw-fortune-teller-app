import { Inter, Nunito, Caveat, Poppins } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider";
import BackgroundMusic from "@/components/BackgroundMusic";
import { AudioProvider } from '@/contexts/AudioContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '700'],
});

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700', '800'],
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  weight: ['400', '700'],
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Fortune Cookie Lead Gen by Moving Walls',
  description: 'Discover your business future!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable} ${caveat.variable} ${poppins.variable} dark`} suppressHydrationWarning>
      <body className="font-poppins">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* 
            The AudioProvider wraps the entire application to provide a global,
            centralized audio management system. Every component can now access
            the same audio context, ensuring features like global mute work consistently.
          */}
          <AudioProvider>
            {children}
            <BackgroundMusic />
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}