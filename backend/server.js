const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory state orders
let orders = [
  {
    id: 'ORD-1001',
    tableNumber: '12',
    items: [
      { name: 'Nasi Goreng Spesial', qty: 2 },
      { name: 'Es Kopi Susu Gula Aren', qty: 2 }
    ],
    status: 'PENDING_APPROVAL',
    notes: 'Pedas, jangan pakai kerupuk',
    createdAt: Date.now(),
    targetFinishTime: null,
    initialDurationMinutes: null
  },
  {
    id: 'ORD-1002',
    tableNumber: '5',
    items: [
      { name: 'Spaghetti Carbonara', qty: 1 }
    ],
    status: 'APPROVED',
    notes: '',
    createdAt: Date.now(),
    targetFinishTime: null,
    initialDurationMinutes: null
  }
];

// In-memory state users/profiles
let users = {
  admin: { name: 'Admin Utama' },
  dapur: { name: 'Dapur Pusat' }
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Kirim data awal
  socket.emit('initial_orders', orders);
  socket.emit('users_data', users);

  // --- FITUR LOGIN & PROFIL ---
  socket.on('update_user', (data) => {
    const { role, name } = data;
    if (users[role]) {
      users[role].name = name;
      // Broadcast update ke semua layar
      io.emit('users_data', users);
    }
  });

  // --- FITUR PESANAN ---
  // 1. Admin Approval
  socket.on('admin_approve_order', (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'PENDING_APPROVAL') {
      order.status = 'APPROVED';
      io.emit('order_updated', order);
      io.emit('active_queue', getActiveQueue());
    }
  });

  // 2. Dapur Accept Pesanan & Set Estimasi Waktu
  socket.on('kitchen_accept_order', (data) => {
    const { orderId, durationMinutes } = data;
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'APPROVED') {
      order.status = 'IN_KITCHEN';
      order.initialDurationMinutes = durationMinutes;
      order.targetFinishTime = Date.now() + (durationMinutes * 60 * 1000);
      io.emit('order_updated', order);
      io.emit('active_queue', getActiveQueue());
    }
  });

  // 3. Dapur Tambah Waktu (Extend Timer)
  socket.on('kitchen_extend_timer', (data) => {
    const { orderId, extraMinutes } = data;
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'IN_KITCHEN' && order.targetFinishTime) {
      order.targetFinishTime += (extraMinutes * 60 * 1000);
      io.emit('order_updated', order);
      io.emit('active_queue', getActiveQueue());
      
      // Notifikasi khusus ke room pelanggan
      io.emit('order_extended', { orderId, extraMinutes });
    }
  });

  // 4. Dapur Selesai / Siap Saji
  socket.on('kitchen_complete_order', (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'IN_KITCHEN') {
      order.status = 'COMPLETED';
      io.emit('order_updated', order);
      io.emit('active_queue', getActiveQueue());
      
      // Trigger print struk
      io.emit('trigger_print', order);
    }
  });

  // 5. Permintaan Antrean Aktif
  socket.on('get_active_queue', () => {
    socket.emit('active_queue', getActiveQueue());
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper: Ambil antrean dapur yang diurutkan
function getActiveQueue() {
  return orders
    .filter(o => o.status === 'IN_KITCHEN')
    .sort((a, b) => a.targetFinishTime - b.targetFinishTime);
}

// Bind server to 0.0.0.0 so it can be accessed from local network
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Server running on port ${PORT} (Available on Local Network)`);
});
