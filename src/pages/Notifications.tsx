import React, { useEffect, useState } from 'react';
import { Bell, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';
import { motion } from 'motion/react';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'users', user.uid, 'notifications'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        // Mark all as read
        const unread = snap.docs.filter(d => !d.data().read);
        if (unread.length > 0) {
          const batch = writeBatch(db);
          unread.forEach(d => {
            batch.update(doc(db, 'users', user.uid, 'notifications', d.id), { read: true });
          });
          await batch.commit();
          // Also update user meta
          await updateDoc(doc(db, 'users', user.uid), { hasUnread: false });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/notifications`);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [user]);

  const handleDeleteAll = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'users', user.uid, 'notifications', n.id));
      });
      await batch.commit();
      setNotifications([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/notifications`);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-bg-0">
      <Loader2 className="w-12 h-12 text-blue animate-spin mb-4" />
      <h2 className="text-xl font-black text-t1">Loading Notifications</h2>
    </div>
  );

  return (
    <div className="px-4 py-8 space-y-8 bg-bg-0 min-h-screen transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-glow rounded-2xl flex items-center justify-center border-2 border-blue">
            <Bell className="w-7 h-7 text-blue" />
          </div>
          <h1 className="text-3xl font-black text-t1 tracking-tight">Notifications</h1>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={handleDeleteAll}
            className="p-3 text-t3 hover:text-red transition-colors"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length > 0 ? notifications.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "bg-bg-2 border-2 border-bg-4 p-6 rounded-[32px] flex gap-5 shadow-[0_4px_0_var(--bg-4)]",
              !n.read && "border-blue bg-blue-glow shadow-[0_4px_0_var(--blue-dk)]"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border-2",
              n.type === 'success' ? "bg-green-glow border-green text-green" :
              n.type === 'info' ? "bg-blue-glow border-blue text-blue" :
              "bg-gold-glow border-gold text-gold"
            )}>
              {n.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <div className="text-lg font-black text-t1">{n.title}</div>
              <p className="text-t2 text-sm font-bold mt-1 leading-relaxed">{n.message}</p>
              <div className="text-[10px] text-t3 font-black uppercase tracking-widest mt-3">
                {n.createdAt?.toDate ? formatDate(n.createdAt.toDate()) : 'Recently'}
              </div>
            </div>
          </motion.div>
        )) : (
          <div className="p-16 text-center space-y-6 bg-bg-1 rounded-[40px] border-4 border-dashed border-bg-4">
            <div className="w-20 h-20 bg-bg-0 rounded-full flex items-center justify-center mx-auto border-2 border-bg-4">
              <Bell className="w-10 h-10 text-t3" />
            </div>
            <div className="space-y-2">
              <p className="text-t1 text-xl font-black">All Caught Up!</p>
              <p className="text-t3 text-sm font-bold uppercase tracking-widest">No new notifications for you.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
