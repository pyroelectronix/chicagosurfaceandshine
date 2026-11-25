import './globals.css';

export const metadata = {
  title: 'Chicago Surface and Shine CRM',
  description: 'Bookings, customers and calendar for Chicago Surface and Shine.Co',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
