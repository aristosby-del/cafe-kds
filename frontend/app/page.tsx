"use client";
import { useState, useEffect } from "react";
import CustomerOrderTracker from "../components/CustomerOrderTracker";
import { socket } from "../lib/socket";
import Link from "next/link";

export default function Home() {
  const [role, setRole] = useState<string | null>(null);
  const [users, setUsers] = useState({ admin: { name: "" }, dapur: { name: "" } });
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editAdminName, setEditAdminName] = useState("");
  const [editDapurName, setEditDapurName] = useState("");

  useEffect(() => {
    // Cek status login dari LocalStorage
    const storedRole = localStorage.getItem("kds_role");
    if (storedRole) setRole(storedRole);

    socket.on("users_data", (data) => {
      setUsers(data);
      setEditAdminName(data.admin.name);
      setEditDapurName(data.dapur.name);
    });

    return () => {
      socket.off("users_data");
    };
  }, []);

  const login = (r: string) => {
    localStorage.setItem("kds_role", r);
    setRole(r);
  };

  const logout = () => {
    localStorage.removeItem("kds_role");
    setRole(null);
  };

  const openProfile = () => {
    setEditAdminName(users.admin.name);
    setEditDapurName(users.dapur.name);
    setShowProfileModal(true);
  };

  const saveProfile = () => {
    if (role === "admin") {
      socket.emit("update_user", { role: "admin", name: editAdminName });
      socket.emit("update_user", { role: "dapur", name: editDapurName });
    } else if (role === "dapur") {
      socket.emit("update_user", { role: "dapur", name: editDapurName });
    }
    setShowProfileModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar Atas */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="font-black text-2xl text-blue-600 tracking-tight">SENJA-KALA</h1>
        
        <div className="flex gap-4 items-center">
          {!role ? (
            <>
              {/* Login Tanpa Password */}
              <button onClick={() => login("admin")} className="text-sm font-bold text-gray-600 hover:text-blue-600 transition">Login Admin</button>
              <button onClick={() => login("dapur")} className="text-sm font-bold text-gray-600 hover:text-orange-600 transition">Login Dapur</button>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-gray-800">
                Halo, {role === "admin" ? users.admin.name : users.dapur.name}
              </span>
              
              <button onClick={openProfile} className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition font-medium">
                Profil
              </button>
              
              {role === "admin" && (
                <Link href="/frontpage" className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
                  Monitor Display
                </Link>
              )}
              
              {role === "dapur" && (
                <Link href="/kitchen" className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition font-medium">
                  Buka KDS Dapur
                </Link>
              )}

              <button onClick={logout} className="text-sm font-medium text-red-500 hover:text-red-700 ml-2">Logout</button>
            </>
          )}
        </div>
      </header>

      {/* Main Content: Tampilan Tracker Untuk Pengunjung */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full">
          <h2 className="text-center text-xl font-bold text-gray-500 mb-8">Tampilan Tracker Pengunjung</h2>
          <CustomerOrderTracker orderId="ORD-1001" />
        </div>
      </main>

      {/* Modal Edit Profil */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
            <h2 className="text-2xl font-black text-gray-800 mb-6">Pengaturan Akun</h2>
            
            {role === "admin" && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Ubah Nama Admin</label>
                <input 
                  type="text" 
                  value={editAdminName} 
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition"
                  placeholder="Nama Admin"
                />
              </div>
            )}
            
            {(role === "admin" || role === "dapur") && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Ubah Nama Dapur {role === "dapur" && "(Anda)"}
                </label>
                <input 
                  type="text" 
                  value={editDapurName} 
                  onChange={(e) => setEditDapurName(e.target.value)}
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition"
                  placeholder="Nama Dapur"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowProfileModal(false)} 
                className="px-5 py-2.5 font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button 
                onClick={saveProfile} 
                className="px-5 py-2.5 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
