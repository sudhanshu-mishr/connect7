import './globals.css';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'CONNECT — Find people who get you',description:'Less scrolling. More meaningful connections.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
