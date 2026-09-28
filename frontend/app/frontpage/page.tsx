"use client";

import { useEffect, useState } from "react";
import { socket } from "../../lib/socket";

type Order = {
  id: string;
  tableNumber: string;
  items: { name: string; qty: number }[];
  status: string;
  targetFinishTime: number | null;
};

// Komponen Row Antrean
function QueueRow({ order, rank }: { order: Order; rank: number }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!order.targetFinishTime) return;

    const updateTimer = () => {
      const remaining = Math.max(0, order.targetFinishTime! - Date.now());
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.targetFinishTime]);

  const formatTime = (ms: number) => {
    const totalMinutes = Math.ceil(ms / (60 * 1000));
    if (totalMinutes <= 0) return "Selesai Sesaat Lagi";
    return `${totalMinutes} Menit`;
  };

  const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-2xl p-6 flex items-center justify-between border-l-8 border-blue-500 mb-4 transform transition-all duration-500 hover:scale-[1.02]">
      <div className="flex items-center gap-6">
        <div className="bg-blue-100 text-blue-800 w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl shadow-inner">
          #{rank}
        </div>
        <div>
          <h3 className="text-3xl font-bold text-gray-800">Meja {order.tableNumber}</h3>
          <p className="text-gray-500 font-medium">{totalItems} Item • Sedang Dimasak</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Estimasi Selesai</p>
        <p className="text-4xl font-black text-blue-600">
          {timeLeft !== null ? formatTime(timeLeft) : "--"}
        </p>
      </div>
    </div>
  );
}

export default function FrontpageDisplay() {
  const [activeQueue, setActiveQueue] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Clock tick
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    // Initial fetch
    socket.emit("get_active_queue");

    socket.on("active_queue", (queue: Order[]) => {
      setActiveQueue(queue);
    });

    return () => {
      clearInterval(clockInterval);
      socket.off("active_queue");
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-8 font-sans overflow-hidden">
      {/* Header Banner */}
      <header className="flex justify-between items-center mb-12 bg-white/10 p-6 rounded-2xl backdrop-blur-md shadow-xl border border-white/20">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-md">
            Selamat Datang di Senja-Kala!
          </h1>
          <p className="text-xl text-blue-200 mt-2 font-medium">
            Pesanan sedang disiapkan. Harap perhatikan layar ini.
          </p>
        </div>
        <div className="text-right bg-black/30 px-6 py-4 rounded-xl border border-white/10 shadow-inner">
          <p className="text-sm text-blue-200 uppercase font-bold tracking-widest mb-1">Waktu Saat Ini</p>
          <h2 className="text-5xl font-mono font-bold text-white">
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </h2>
        </div>
      </header>

      {/* Main Queue List */}
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-6 px-2">
          <h2 className="text-2xl font-bold text-blue-100 uppercase tracking-widest">Antrean Berjalan ({activeQueue.length})</h2>
        </div>

        <div className="space-y-2">
          {activeQueue.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center backdrop-blur-sm">
              <span className="text-7xl mb-6 block">☕</span>
              <p className="text-2xl font-medium text-blue-200">
                Belum ada antrean di dapur saat ini.<br/>
                Silakan lakukan pemesanan di kasir atau aplikasi!
              </p>
            </div>
          ) : (
            activeQueue.map((order, index) => (
              <QueueRow key={order.id} order={order} rank={index + 1} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
