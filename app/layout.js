import './globals.css';
import AppProvider from '@/components/AppProvider';

export const metadata = {
  title: 'PeerPrep',
  description: 'HKUST peer career feedback',
  icons: { icon: '/peerprep_logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><AppProvider>{children}</AppProvider></body>
    </html>
  );
}