"use client";

import { useEffect, useState } from "react";
import { socket } from "../../lib/socket";

type OrderItem = { name: string; qty: number };
type Order = {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  status: string;
  notes: string;
  createdAt: number;
  targetFinishTime: number | null;
  initialDurationMinutes: number | null;
};

// Komponen Card untuk Dapur
function KitchenOrderCard({ order }: { order: Order }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (order.status !== "IN_KITCHEN" || !order.targetFinishTime) return;

    const updateTimer = () => {
      const remaining = Math.max(0, order.targetFinishTime! - Date.now());
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.targetFinishTime, order.status]);

  const handleAccept = (minutes: number) => {
    socket.emit("kitchen_accept_order", { orderId: order.id, durationMinutes: minutes });
  };

  const handleExtend = (minutes: number) => {
    socket.emit("kitchen_extend_timer", { orderId: order.id, extraMinutes: minutes });
  };

  const handleComplete = () => {
    socket.emit("kitchen_complete_order", order.id);
  };

  // Format Timer (MM:SS)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Warna Timer
  let timerColor = "text-green-500";
  if (timeLeft !== null) {
    if (timeLeft <= 0) timerColor = "text-red-600 animate-pulse font-bold";
    else if (timeLeft <= 300000) timerColor = "text-yellow-500 font-semibold"; // < 5 menit
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
      {/* Header Card */}
      <div className="flex justify-between items-center border-b pb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meja {order.tableNumber}</h2>
          <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wide
          ${order.status === "APPROVED" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}
        `}>
          {order.status === "APPROVED" ? "SIAP DIMASAK" : "SEDANG DIMASAK"}
        </div>
      </div>

      {/* Rincian Pesanan */}
      <ul className="flex-1 space-y-1">
        {order.items.map((item, idx) => (
          <li key={idx} className="flex justify-between text-lg text-gray-700 font-medium">
            <span>{item.name}</span>
            <span>x{item.qty}</span>
          </li>
        ))}
      </ul>

      {/* Catatan Khusus */}
      {order.notes && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded-r-md mt-2">
          <p className="text-yellow-800 text-sm font-semibold">Note: {order.notes}</p>
        </div>
      )}

      {/* Aksi & Timer */}
      <div className="mt-4 pt-4 border-t flex flex-col gap-3">
        {order.status === "APPROVED" && (
          <div>
            <p className="text-sm text-gray-600 mb-2 font-semibold">Set Estimasi & Terima:</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleAccept(10)} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transition">10 Min</button>
              <button onClick={() => handleAccept(15)} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transition">15 Min</button>
              <button onClick={() => handleAccept(20)} className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded font-bold transition">20 Min</button>
            </div>
          </div>
        )}

        {order.status === "IN_KITCHEN" && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-semibold text-lg">Sisa Waktu:</span>
              <span className={`text-3xl tracking-wider font-mono ${timerColor}`}>
                {timeLeft !== null ? formatTime(timeLeft) : "00:00"}
              </span>
            </div>
            
            <div className="flex gap-2 mt-2">
              <button onClick={() => handleExtend(5)} className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-2 rounded border border-yellow-300 transition">+5 Min</button>
              <button onClick={() => handleExtend(10)} className="flex-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold py-2 rounded border border-yellow-300 transition">+10 Min</button>
            </div>

            <button onClick={handleComplete} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 mt-2 rounded-lg text-lg shadow-md transition uppercase tracking-wide">
              Selesai / Siap Saji
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function KitchenKDS() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    socket.on("initial_orders", (data: Order[]) => setOrders(data));
    socket.on("order_updated", (updatedOrder: Order) => {
      setOrders(prev => {
        const existing = prev.find(o => o.id === updatedOrder.id);
        if (existing) {
          return prev.map(o => (o.id === updatedOrder.id ? updatedOrder : o));
        }
        return [...prev, updatedOrder];
      });
    });

    return () => {
      socket.off("initial_orders");
      socket.off("order_updated");
    };
  }, []);

  // Filter hanya pesanan yang disetujui atau sedang dimasak
  const displayOrders = orders.filter(o => o.status === "APPROVED" || o.status === "IN_KITCHEN");

  // Urutkan: APPROVED di atas, kemudian IN_KITCHEN berdasarkan target finish
  displayOrders.sort((a, b) => {
    if (a.status !== b.status) return a.status === "APPROVED" ? -1 : 1;
    if (a.status === "IN_KITCHEN") return (a.targetFinishTime || 0) - (b.targetFinishTime || 0);
    return a.createdAt - b.createdAt;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">KDS Dapur</h1>
          <p className="text-gray-500 font-medium">Sistem Tampilan Dapur Real-time</p>
        </div>
        <div className="text-right">
          {/* Untuk demonstrasi, tombol bypass approval admin */}
          <button onClick={() => socket.emit("admin_approve_order", "ORD-1001")} className="text-sm bg-gray-200 px-3 py-1 rounded text-gray-700 hover:bg-gray-300">
            Simulasikan Admin Approve (ORD-1001)
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {displayOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-medium text-lg">
            Tidak ada antrean pesanan di dapur saat ini.
          </div>
        ) : (
          displayOrders.map(order => <KitchenOrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
