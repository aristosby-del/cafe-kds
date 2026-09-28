"use client";

import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

type OrderTrackerProps = {
  orderId: string;
};

export default function CustomerOrderTracker({ orderId }: OrderTrackerProps) {
  const [orderState, setOrderState] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    socket.emit("get_active_queue"); // Memicu update awal, atau backend bisa dibuat endpoint fetch specific order

    // Listener global (bisa diperbaiki dg room spesifik di backend, tapi ini pendekatan broadcast umum)
    const onOrderUpdated = (order: any) => {
      if (order.id === orderId) {
        setOrderState(order);
      }
    };

    const onOrderExtended = (data: { orderId: string; extraMinutes: number }) => {
      if (data.orderId === orderId) {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
    };

    // Ini trik untuk nangkep state awal dari get_active_queue
    const onActiveQueue = (queue: any[]) => {
      const myOrder = queue.find(o => o.id === orderId);
      if (myOrder) setOrderState(myOrder);
    };

    socket.on("order_updated", onOrderUpdated);
    socket.on("order_extended", onOrderExtended);
    socket.on("active_queue", onActiveQueue);

    return () => {
      socket.off("order_updated", onOrderUpdated);
      socket.off("order_extended", onOrderExtended);
      socket.off("active_queue", onActiveQueue);
    };
  }, [orderId]);

  useEffect(() => {
    if (!orderState?.targetFinishTime || orderState.status !== "IN_KITCHEN") {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, orderState.targetFinishTime - Date.now());
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [orderState?.targetFinishTime, orderState?.status]);

  if (!orderState) {
    return <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">Memuat status pesanan...</div>;
  }

  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return `${totalMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (orderState.status) {
      case "PENDING_APPROVAL": return "Menunggu Konfirmasi";
      case "APPROVED": return "Pesanan Diterima";
      case "IN_KITCHEN": return "Sedang Dimasak";
      case "COMPLETED": return "Siap Diambil/Diantar";
      default: return orderState.status;
    }
  };

  const progressPercent = orderState.status === "COMPLETED" ? 100 
    : orderState.status === "IN_KITCHEN" ? 50 
    : orderState.status === "APPROVED" ? 25 
    : 10;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-sm w-full mx-auto relative overflow-hidden">
      {/* Toast Notification Top */}
      <div className={`absolute top-0 left-0 w-full bg-yellow-400 text-yellow-900 text-sm font-bold py-2 text-center transition-transform duration-300 ${showNotification ? 'translate-y-0' : '-translate-y-full'}`}>
        Dapur menambahkan waktu pengerjaan. Terima kasih atas kesabaran Anda!
      </div>

      <div className="text-center mb-6 mt-4">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Meja</p>
        <h2 className="text-4xl font-black text-gray-800">{orderState.tableNumber}</h2>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 px-1">
          <span>Terima</span>
          <span>Masak</span>
          <span>Selesai</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-center mt-3 font-bold text-gray-700">{getStatusText()}</p>
      </div>

      {/* Live Timer Section */}
      {orderState.status === "IN_KITCHEN" && timeLeft !== null && (
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <p className="text-sm text-blue-600 font-semibold mb-1">Estimasi Waktu Tunggu</p>
          <div className="text-4xl font-mono font-black text-blue-700 tracking-wider">
            {formatTime(timeLeft)}
          </div>
        </div>
      )}

      {orderState.status === "COMPLETED" && (
        <div className="bg-green-100 text-green-800 rounded-xl p-4 text-center border border-green-200">
          <p className="font-bold text-lg">Hore! Pesanan Anda siap.</p>
          <p className="text-sm mt-1">Silakan ambil di konter atau tunggu pelayan kami mengantar.</p>
        </div>
      )}
    </div>
  );
}
