import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp, getDoc, addDoc, increment, setDoc } from 'firebase/firestore';
import { Trophy, CheckCircle2, XCircle, Loader2, CreditCard, User, Zap, Bell, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { soundManager } from '../lib/sounds';
import { cn, getWeekNumber } from '../lib/utils';

export default function Admin() {
  const [requests, setRequests] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'memberships' | 'scholarships' | 'contests'>('memberships');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'memberships') {
        const q = query(collection(db, 'membershipRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'scholarships') {
        const week = getWeekNumber(new Date());
        const contestId = `sunday_week_${week}`;
        const q = query(collection(db, 'sundayResults', contestId, 'winners'), orderBy('rank'));
        const snap = await getDocs(q);
        setWinners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        const week = getWeekNumber(new Date());
        const contestId = `sunday_week_${week}`;
        const cSnap = await getDoc(doc(db, 'sundayContests', contestId));
        setContest(cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, activeTab);
    } finally {
      setLoading(false);
    }
  };

  const [contest, setContest] = useState<any>(null);

  const announceResults = async () => {
    if (!contest) return;
    setLoading(true);
    soundManager.play('click');
    try {
      const contestId = contest.id;
      const subsSnap = await getDocs(query(collection(db, 'sundaySubmissions'), where('contestId', '==', contestId)));
      const subs = subsSnap.docs.map(d => d.data());

      // Sort by score (desc), then timeTaken (asc)
      const sorted = subs.sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTaken - b.timeTaken;
      });

      const top10 = sorted.slice(0, 10);
      
      // Config for prizes
      const cfgSnap = await getDoc(doc(db, 'admin', 'config'));
      const config = cfgSnap.data() || {};

      for (let i = 0; i < top10.length; i++) {
        const s = top10[i];
        const uSnap = await getDoc(doc(db, 'users', s.uid));
        const uData = uSnap.data();
        
        let amount = 0;
        if (i === 0) amount = config.sundayPrize1 || 200;
        else if (i === 1) amount = config.sundayPrize2 || 150;
        else amount = 10; // Consolation

        await setDoc(doc(db, 'sundayResults', contestId, 'winners', s.uid), {
          uid: s.uid,
          name: s.name,
          rank: i + 1,
          score: s.score,
          amount,
          upi: uData?.upi || '',
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, 'sundayContests', contestId), {
        status: 'result_announced',
        updatedAt: serverTimestamp()
      });

      toast.success('Results announced successfully!');
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'announceResults');
    } finally {
      setLoading(false);
    }
  };

  const approveMembership = async (req: any) => {
    soundManager.play('click');
    try {
      const userRef = doc(db, 'users', req.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const days = req.plan === '7days' ? 7 : 30;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);

      await updateDoc(userRef, {
        isPrime: true,
        primeExpiry: expiry.toISOString(),
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'membershipRequests', req.id), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      // Referral Reward Logic
      if (userData?.referredBy) {
        const referrerRef = doc(db, 'users', userData.referredBy);
        const referrerSnap = await getDoc(referrerRef);
        if (referrerSnap.exists()) {
          const referrerData = referrerSnap.data();
          let newExpiry = new Date();
          if (referrerData.isPrime && referrerData.primeExpiry) {
            newExpiry = new Date(referrerData.primeExpiry);
          }
          newExpiry.setDate(newExpiry.getDate() + 2);

          await updateDoc(referrerRef, {
            isPrime: true,
            primeExpiry: newExpiry.toISOString(),
            referralCount: increment(1),
            updatedAt: serverTimestamp()
          });

          // Notify Referrer
          await addDoc(collection(db, 'users', userData.referredBy, 'notifications'), {
            title: 'Referral Reward!',
            message: `Your friend ${userData.name} joined Prime. You got 2 days of Prime status!`,
            type: 'reward',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      // Notify User
      await addDoc(collection(db, 'users', req.uid, 'notifications'), {
        title: 'Prime Activated!',
        message: `Your ${req.plan} Prime membership has been activated. Enjoy all benefits!`,
        type: 'prime',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Membership approved!');
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'membershipRequests');
    }
  };

  const approveScholarship = async (winner: any) => {
    soundManager.play('click');
    try {
      const week = getWeekNumber(new Date());
      const contestId = `sunday_week_${week}`;
      
      await updateDoc(doc(db, 'sundayResults', contestId, 'winners', winner.id), {
        status: 'paid',
        paidAt: serverTimestamp()
      });

      // Notify Student
      await addDoc(collection(db, 'users', winner.uid, 'notifications'), {
        title: 'Scholarship Received!',
        message: `Your scholarship reward of ₹${winner.amount} for Sunday Dangal has been sent to your UPI account.`,
        type: 'scholarship',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Scholarship approved and notification sent!');
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'scholarships');
    }
  };

  return (
    <div className="px-4 py-8 space-y-8 bg-bg-0 min-h-screen transition-colors duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-t1">Admin Panel</h1>
        <p className="text-t3 text-sm font-black uppercase tracking-widest">Manage memberships and scholarships</p>
      </div>

      <div className="flex gap-2 bg-bg-1 p-1 rounded-2xl border-2 border-bg-4">
        <button 
          onClick={() => setActiveTab('memberships')}
          className={cn(
            "flex-1 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'memberships' ? "bg-bg-0 text-blue shadow-sm border-2 border-bg-4" : "text-t3"
          )}
        >
          Memberships
        </button>
        <button 
          onClick={() => setActiveTab('scholarships')}
          className={cn(
            "flex-1 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'scholarships' ? "bg-bg-0 text-blue shadow-sm border-2 border-bg-4" : "text-t3"
          )}
        >
          Scholarships
        </button>
        <button 
          onClick={() => setActiveTab('contests')}
          className={cn(
            "flex-1 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'contests' ? "bg-bg-0 text-blue shadow-sm border-2 border-bg-4" : "text-t3"
          )}
        >
          Contests
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue animate-spin" />
        </div>
      ) : activeTab === 'memberships' ? (
        <div className="space-y-4">
          {requests.length > 0 ? (
            requests.map(req => (
              <div key={req.id} className="bg-bg-2 border-2 border-bg-4 rounded-[24px] p-6 space-y-4 shadow-[0_4px_0_var(--bg-4)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-glow rounded-xl flex items-center justify-center text-blue">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-t1">{req.name}</div>
                      <div className="text-[10px] text-t3 font-black uppercase tracking-widest">{req.plan} · ₹{req.amount}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => approveMembership(req)}
                      className="w-10 h-10 bg-green-glow border-2 border-green rounded-xl flex items-center justify-center text-green hover:bg-green hover:text-white transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {req.screenshotUrl && (
                  <img 
                    src={req.screenshotUrl} 
                    alt="Payment Screenshot" 
                    className="w-full rounded-xl border-2 border-bg-4"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-t3 font-bold">No pending requests</div>
          )}
        </div>
      ) : activeTab === 'scholarships' ? (
        <div className="space-y-4">
          {winners.length > 0 ? (
            winners.slice(0, 5).map(w => (
              <div key={w.id} className="bg-bg-2 border-2 border-bg-4 rounded-[24px] p-6 space-y-4 shadow-[0_4px_0_var(--bg-4)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gold-glow rounded-xl flex items-center justify-center text-gold">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-t1">{w.name}</div>
                      <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Rank #{w.rank} · ₹{w.amount}</div>
                    </div>
                  </div>
                  {w.status !== 'paid' && (
                    <button 
                      onClick={() => approveScholarship(w)}
                      className="btn-blue py-2 px-4 text-xs"
                    >
                      Approve
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 p-3 bg-bg-1 rounded-xl border-2 border-bg-4">
                  <CreditCard className="w-4 h-4 text-t3" />
                  <div className="text-sm font-black text-t1">{w.upi || 'No UPI provided'}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-t3 font-bold">No winners announced yet</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {contest ? (
            <div className="bg-bg-2 border-2 border-bg-4 rounded-[24px] p-8 space-y-6 shadow-[0_4px_0_var(--bg-4)]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-glow rounded-[24px] flex items-center justify-center text-blue border-2 border-blue">
                  <Calendar className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-t1">Week {contest.weekNumber} Contest</h3>
                  <p className="text-sm text-t3 font-black uppercase tracking-widest">{contest.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-1 p-4 rounded-2xl border-2 border-bg-4">
                  <div className="text-[10px] text-t3 font-black uppercase tracking-widest mb-1">Participants</div>
                  <div className="text-xl font-black text-t1">{contest.participants || 0}</div>
                </div>
                <div className="bg-bg-1 p-4 rounded-2xl border-2 border-bg-4">
                  <div className="text-[10px] text-t3 font-black uppercase tracking-widest mb-1">Total Pool</div>
                  <div className="text-xl font-black text-green">₹{contest.totalPool || 0}</div>
                </div>
              </div>

              {contest.status !== 'result_announced' && (
                <div className="flex gap-4">
                  {contest.status === 'upcoming' && (
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'sundayContests', contest.id), { status: 'live' });
                        fetchData();
                      }}
                      className="flex-1 btn-primary bg-blue shadow-[0_4px_0_var(--blue-dk)]"
                    >
                      Go Live
                    </button>
                  )}
                  {contest.status === 'live' && (
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'sundayContests', contest.id), { status: 'closed' });
                        fetchData();
                      }}
                      className="flex-1 btn-primary bg-red shadow-[0_4px_0_var(--red-dk)]"
                    >
                      Close Entry
                    </button>
                  )}
                  <button 
                    onClick={announceResults}
                    className="flex-1 btn-primary bg-green shadow-[0_4px_0_var(--green-dk)]"
                  >
                    Announce Results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-t3 font-bold">No active contest found</div>
          )}
        </div>
      )}
    </div>
  );
}
