import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Scholarship Hub | โอกาสที่ใช่ เริ่มได้ที่นี่', description: 'ค้นหาทุน บันทึกโอกาส และเตรียมเอกสารสมัครทุนให้พร้อม — Platform Development Group 15', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) { return <html lang="th"><body>{children}</body></html>; }
