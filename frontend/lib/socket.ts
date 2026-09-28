import { io } from 'socket.io-client';

const isBrowser = typeof window !== 'undefined';

// Gunakan hostname dinamis dari browser. 
// Ini akan memperbaiki isu koneksi via smartphone di WiFi yang sama.
// Jadi jika PC Anda 192.168.1.5, smartphone otomatis akan konek ke 192.168.1.5:3001.
const defaultUrl = isBrowser ? `http://${window.location.hostname}:3001` : 'http://localhost:3001';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || defaultUrl;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});
