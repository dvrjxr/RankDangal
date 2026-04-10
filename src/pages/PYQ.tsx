import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronRight, FileText, Loader2, ExternalLink } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { cn } from '../lib/utils';

const SUBJECTS = ['Math', 'Science', 'SST', 'Hindi'];

export default function PYQ() {
  const [pyqs, setPyqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    const fetchPYQs = async () => {
      try {
        const q = query(collection(db, 'pyq'), orderBy('uploadedAt', 'desc'));
        const snap = await getDocs(q);
        setPyqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'pyq');
      } finally {
        setLoading(false);
      }
    };
    fetchPYQs();
  }, []);

  const filteredPyqs = selectedSubject 
    ? pyqs.filter(p => p.subject === selectedSubject)
    : pyqs;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-bg-0">
        <Loader2 className="w-12 h-12 text-blue animate-spin mb-4" />
        <h2 className="text-xl font-black text-t1">Loading Papers</h2>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8 bg-bg-0 min-h-screen transition-colors duration-300">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 bg-blue-glow rounded-[32px] flex items-center justify-center mx-auto mb-4 border-2 border-blue shadow-xl shadow-blue/5">
          <BookOpen className="w-10 h-10 text-blue" />
        </div>
        <h1 className="text-3xl font-black text-t1 tracking-tight">Previous Year Papers</h1>
        <p className="text-t3 text-base font-bold">Practice with real board exam questions</p>
      </div>

      {/* Subject Filter */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setSelectedSubject(null)}
          className={cn(
            "px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex-shrink-0 border-2 active:translate-y-[2px] active:shadow-none",
            !selectedSubject 
              ? "bg-blue border-blue text-white shadow-[0_4px_0_var(--blue-dk)]" 
              : "bg-bg-2 border-bg-4 text-t3 hover:text-t1 shadow-[0_4px_0_var(--bg-4)]"
          )}
        >
          All
        </button>
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s)}
            className={cn(
              "px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex-shrink-0 border-2 active:translate-y-[2px] active:shadow-none",
              selectedSubject === s 
                ? "bg-blue border-blue text-white shadow-[0_4px_0_var(--blue-dk)]" 
                : "bg-bg-2 border-bg-4 text-t3 hover:text-t1 shadow-[0_4px_0_var(--bg-4)]"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredPyqs.length > 0 ? filteredPyqs.map((p) => (
          <a
            key={p.id}
            href={p.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-bg-2 border-2 border-bg-4 p-6 rounded-[32px] hover:border-blue transition-all group shadow-[0_8px_0_var(--bg-4)] active:translate-y-[4px] active:shadow-none"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-bg-1 rounded-2xl flex items-center justify-center group-hover:bg-blue-glow transition-colors border-2 border-bg-4 group-hover:border-blue">
                <FileText className="w-7 h-7 text-t3 group-hover:text-blue transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-black text-t1 group-hover:text-blue transition-colors">{p.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-black text-blue uppercase tracking-widest bg-blue-glow px-2 py-1 rounded-lg border border-blue/20">{p.subject}</span>
                  <span className="text-[10px] text-t3 font-black uppercase tracking-widest">Uploaded {new Date(p.uploadedAt?.toDate()).toLocaleDateString()}</span>
                </div>
              </div>
              <ExternalLink className="w-6 h-6 text-t3 group-hover:text-blue transition-colors" />
            </div>
          </a>
        )) : (
          <div className="p-16 text-center space-y-6 bg-bg-1 rounded-[40px] border-4 border-dashed border-bg-4">
            <div className="w-20 h-20 bg-bg-2 rounded-full flex items-center justify-center mx-auto border-2 border-bg-4">
              <FileText className="w-10 h-10 text-t3" />
            </div>
            <p className="text-t3 text-lg font-black uppercase tracking-widest">No papers found for this subject.</p>
          </div>
        )}
      </div>
    </div>
  );
}
