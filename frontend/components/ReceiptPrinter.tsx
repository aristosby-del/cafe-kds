"use client";

import { useEffect, useState } from "react";
import { socket } from "../lib/socket";
import './receipt.css'; // Custom CSS for print media

export default function ReceiptPrinter() {
  const [printData, setPrintData] = useState<any>(null);

  useEffect(() => {
    socket.on("trigger_print", (order: any) => {
      setPrintData(order);
      // Tunggu DOM render, lalu cetak
      setTimeout(() => {
        window.print();
        setPrintData(null); // Reset setelah print
      }, 500);
    });

    return () => {
      socket.off("trigger_print");
    };
  }, []);

  if (!printData) return null; // Sembunyikan saat tidak nge-print

  const copies = [1, 2, 3]; // 3 Rangkap: Pengunjung, Admin, Dapur
  const copyLabels = ["CUSTOMER COPY", "ADMIN COPY", "KITCHEN COPY"];

  return (
    <div className="print-container">
      {copies.map((copyNum, index) => (
        <div key={copyNum} className="thermal-receipt">
          {/* Header */}
          <div className="text-center pb-2 border-b-dashed">
            <h1 className="font-bold text-xl uppercase">SENJA-KALA</h1>
            <p className="text-xs">Jl. Sukamaju No.42, Jakarta</p>
            <p className="text-xs font-bold mt-1">{copyLabels[index]}</p>
          </div>

          {/* Info Order */}
          <div className="py-2 border-b-dashed text-sm">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(printData.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{new Date(printData.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between font-bold mt-1">
              <span>Order ID:</span>
              <span>{printData.id}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-1">
              <span>Meja:</span>
              <span>{printData.tableNumber}</span>
            </div>
          </div>

          {/* Rincian Item */}
          <div className="py-2 border-b-dashed">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-dotted">
                  <th className="text-left font-normal pb-1">Item</th>
                  <th className="text-right font-normal pb-1 w-10">Qty</th>
                </tr>
              </thead>
              <tbody>
                {printData.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1 break-words font-semibold">{item.name}</td>
                    <td className="text-right py-1 font-semibold">{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {printData.notes && (
              <div className="mt-2 text-xs border border-dashed border-gray-400 p-1">
                <strong>Catatan:</strong> {printData.notes}
              </div>
            )}
          </div>

          {/* Footer Customer Copy Khusus */}
          <div className="text-center pt-3 text-xs flex flex-col gap-2">
            {index === 0 ? (
              <>
                <p className="font-bold">Terima kasih atas kunjungan Anda!</p>
                <p>Bantu kami berbenah dengan menyampaikan kritik & saran Anda.</p>
                <div className="border border-black p-4 inline-block mt-1 mb-1">
                  [ QR CODE MOCKUP ]
                </div>
                <p>Scan untuk Review</p>
              </>
            ) : (
              <p className="font-bold mt-2">- END OF TICKET -</p>
            )}
          </div>
          
          {/* Page break handler */}
          {index < 2 && <div className="page-break" />}
        </div>
      ))}
    </div>
  );
}
