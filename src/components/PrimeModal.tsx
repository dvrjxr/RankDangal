import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, Zap, Check, Upload, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { soundManager } from '../lib/sounds';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

interface PrimeModalProps {
  onClose: () => void;
}

export default function PrimeModal({ onClose }: PrimeModalProps) {
  const { userData } = useAuth();
  const [step, setStep] = useState<'plans' | 'payment'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<'7days' | '30days' | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const snap = await getDoc(doc(db, 'admin', 'config'));
      if (snap.exists()) setConfig(snap.data());
    };
    fetchConfig();
  }, []);

  const plans = [
    { id: '7days', name: '7 Days Access', price: 33, duration: '7 days', color: 'blue' },
    { id: '30days', name: '1 Month Access', price: 99, duration: '30 days', color: 'yellow' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'PaymentSS');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/dtoza7a3t/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setScreenshotUrl(data.secure_url);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlan || !screenshotUrl || !userData) return;

    setSubmitting(true);
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      await addDoc(collection(db, 'membershipRequests'), {
        uid: userData.uid,
        name: userData.name,
        plan: selectedPlan,
        amount: plan?.price,
        screenshotUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Payment submitted! Admin will verify and activate your Prime status shortly.');
      onClose();
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Failed to submit request. Please contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (userData?.isPrime) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-bg-0 border-2 border-bg-4 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
        >
          <div className="p-8 text-center">
            <div className="w-24 h-24 bg-gold-glow rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-gold shadow-[0_4px_0_var(--gold)]">
              <Zap className="w-12 h-12 text-gold fill-current animate-pulse" />
            </div>
            <h2 className="text-3xl font-black text-t1 mb-2">Prime Active</h2>
            <p className="text-t3 text-sm font-black uppercase tracking-widest mb-8">
              Expires on {userData.primeExpiry?.toDate ? formatDate(userData.primeExpiry.toDate()) : 'N/A'}
            </p>
            
            <div className="space-y-4 text-left mb-10">
              <div className="flex items-center gap-4 text-base font-bold text-t1">
                <div className="w-6 h-6 bg-green-glow rounded-full flex items-center justify-center flex-shrink-0 border-2 border-green">
                  <Check className="w-4 h-4 text-green" />
                </div>
                Weekly scholarship on your UPI
              </div>
              <div className="flex items-center gap-4 text-base font-bold text-t1">
                <div className="w-6 h-6 bg-green-glow rounded-full flex items-center justify-center flex-shrink-0 border-2 border-green">
                  <Check className="w-4 h-4 text-green" />
                </div>
                Detailed answer explanations
              </div>
              <div className="flex items-center gap-4 text-base font-bold text-t1">
                <div className="w-6 h-6 bg-green-glow rounded-full flex items-center justify-center flex-shrink-0 border-2 border-green">
                  <Check className="w-4 h-4 text-green" />
                </div>
                Ad-free experience
              </div>
            </div>

            <button 
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-bg-0 border-2 border-bg-4 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
      >
        {/* Golden Header */}
        <div className="bg-gradient-to-r from-gold via-gold/80 to-gold p-8 text-center relative overflow-hidden border-b-2 border-gold-dk">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <motion.div 
            animate={{ 
              background: ['linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', 'linear-gradient(45deg, transparent 100%, rgba(255,255,255,0.3) 150%, transparent 200%)'],
              backgroundPosition: ['-200% 0', '200% 0']
            }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="absolute inset-0 z-0"
          />
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="relative z-10 inline-block mb-3"
          >
            <Zap className="w-14 h-14 text-white fill-current drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]" />
          </motion.div>
          <h2 className="text-3xl font-black text-white drop-shadow-md relative z-10 uppercase tracking-tight">
            Rank Dangal Prime
          </h2>
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors z-20"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-8">
          {step === 'plans' ? (
            <div className="space-y-5">
              <div className="bg-gold-glow border-2 border-gold p-4 rounded-2xl mb-6">
                <p className="text-t1 text-xs font-bold leading-relaxed text-center">
                  Unlock <span className="text-gold font-black">Weekly Scholarship</span> on your UPI, 
                  <span className="text-gold font-black"> Unlimited Practice</span>, and 
                  <span className="text-gold font-black"> Ad-Free</span> experience.
                </p>
              </div>

              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    soundManager.play('click');
                    setSelectedPlan(plan.id as any);
                    setStep('payment');
                  }}
                  className="w-full group relative bg-bg-0 hover:bg-bg-1 border-2 border-bg-4 hover:border-gold p-6 rounded-[24px] transition-all text-left shadow-[0_4px_0_var(--bg-4)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--bg-4)]"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black text-xl text-t1">{plan.name}</span>
                    <span className="text-2xl font-black text-gold">₹{plan.price}</span>
                  </div>
                  <span className="text-[11px] text-t3 uppercase tracking-widest font-black">Valid for {plan.duration}</span>
                  <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-gold text-white p-1 rounded-full">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                onClick={() => setStep('plans')}
                className="text-blue text-[11px] font-black uppercase tracking-widest flex items-center gap-1 mb-2"
              >
                ← Back to plans
              </button>

              <div className="bg-bg-1 p-6 rounded-[24px] flex flex-col items-center justify-center border-2 border-bg-4">
                {config ? (
                  <img 
                    src={selectedPlan === '7days' ? config.qr33 : config.qr99} 
                    alt="Payment QR" 
                    className="w-48 h-48 object-contain mix-blend-multiply dark:brightness-90 dark:contrast-125"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-t3">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                )}
                <div className="mt-4 text-t1 font-black text-sm flex items-center gap-2 uppercase tracking-widest">
                  <QrCode className="w-5 h-5" />
                  Scan to Pay ₹{plans.find(p => p.id === selectedPlan)?.price}
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Upload Screenshot</span>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="screenshot-upload"
                    />
                    <label 
                      htmlFor="screenshot-upload"
                      className={cn(
                        "w-full flex items-center justify-center gap-3 border-2 border-dashed rounded-[24px] p-5 cursor-pointer transition-all",
                        screenshotUrl ? "border-green bg-green-glow text-green" : "border-bg-4 hover:border-blue text-t3"
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : screenshotUrl ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                      <span className="font-black text-sm uppercase tracking-widest">
                        {uploading ? 'Uploading...' : screenshotUrl ? 'Uploaded' : 'Choose File'}
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  disabled={!screenshotUrl || submitting}
                  onClick={handleSubmit}
                  className="btn-primary"
                >
                  {submitting && <Loader2 className="w-6 h-6 animate-spin mr-2" />}
                  Submit Request
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
