
import React, { useState } from 'react';
import { Crown, X, CheckCircle2, Key, Loader2, Sparkles, Clock, AlertCircle, ArrowRight, Heart } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onStartTrial: () => void;
  trialStatus: 'available' | 'active' | 'expired';
}

// ==========================================
// 🔐 核心验证区域 (请确保与生成器保持一致)
// ==========================================

// 1. 你的私有密钥 (Salt)
const SECRET_SALT = "INKFLOW_STUDIO_2024_SECRET_KEY";

// 2. 哈希算法 (DJB2)
const simpleHash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).slice(-4).toUpperCase().padStart(4, '0');
};

// 3. 验证函数
const verifyLicenseKey = (input: string): boolean => {
  const cleanKey = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const parts = cleanKey.split('-');
  
  if (parts.length !== 3) return false;
  if (parts[0] !== 'INK') return false; 

  const payload = parts[1];
  const signature = parts[2];

  if (!payload || !signature) return false;

  const expectedSignature = simpleHash(payload + SECRET_SALT);
  return signature === expectedSignature;
};

// ==========================================

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess, onStartTrial, trialStatus }) => {
  const [loading, setLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleActivate = () => {
    setErrorMsg('');
    const code = activationCode.trim().toUpperCase();

    // 1. Check if used locally
    const usedCodes = JSON.parse(localStorage.getItem('inkflow_used_codes') || '[]');
    if (usedCodes.includes(code)) {
        setErrorMsg('该赞助码已在本设备使用过');
        return;
    }

    setLoading(true);

    setTimeout(() => {
      const isValid = verifyLicenseKey(code);
      
      if (isValid) {
        localStorage.setItem('inkflow_used_codes', JSON.stringify([...usedCodes, code]));
        onSuccess(); 
      } else {
        setErrorMsg('赞助码无效，请检查输入或联系客服');
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm md:max-w-md rounded-[2rem] shadow-2xl overflow-hidden relative border border-white/20">
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors z-10"
        >
            <X size={18} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] p-8 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />
            <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 relative z-10">
                <Heart size={32} className="text-white fill-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2 relative z-10">成为赞助者</h2>
            <p className="text-amber-200/80 text-xs font-medium uppercase tracking-widest relative z-10">支持独立开发 · 解锁 Pro 功能</p>
        </div>

        <div className="p-6">
            {/* 1. Trial Section */}
            {trialStatus === 'available' && (
                <div className="mb-6 p-1 bg-amber-50 rounded-2xl border border-amber-100">
                    <button 
                        onClick={onStartTrial}
                        className="w-full py-3 bg-white rounded-xl shadow-sm text-amber-700 font-bold text-sm hover:bg-amber-50 transition-colors flex items-center justify-center space-x-2 border border-amber-100"
                    >
                        <Clock size={16} />
                        <span>免费试用 Pro 功能 15 分钟</span>
                    </button>
                </div>
            )}
            
            {trialStatus === 'active' && (
                <div className="text-center mb-6 p-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-xs font-bold text-green-700 flex items-center justify-center">
                        <Sparkles size={12} className="mr-1.5" />
                        试用进行中，喜欢请考虑赞助
                    </p>
                </div>
            )}

            {trialStatus === 'expired' && (
                <div className="mb-6 p-1 bg-gray-50 rounded-2xl border border-gray-100 opacity-60">
                    <button 
                        disabled
                        className="w-full py-3 bg-gray-100 rounded-xl shadow-none text-gray-400 font-bold text-sm flex items-center justify-center space-x-2 border border-gray-200 cursor-not-allowed"
                    >
                        <Clock size={16} />
                        <span>试用已结束</span>
                    </button>
                </div>
            )}

            {/* Features List - Synced with SettingsView */}
            <div className="space-y-3 mb-8 px-2">
                {[
                    '沉浸式白噪音 (风声/雨声/机械键盘)',
                    '高级导出 (EPUB/PDF)',
                    '多端云同步 (即将上线)',
                    '无限制版本回溯'
                ].map((item, i) => (
                    <div key={i} className="flex items-center space-x-3">
                        <CheckCircle2 size={16} className="text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-gray-600">{item}</span>
                    </div>
                ))}
            </div>

            <div className="h-px bg-gray-100 w-full mb-6" />

            {/* 2. Activation Code Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">输入赞助码</label>
                </div>

                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Key size={16} />
                    </div>
                    <input 
                        type="text"
                        value={activationCode}
                        onChange={(e) => {
                            setActivationCode(e.target.value.toUpperCase());
                            setErrorMsg('');
                        }}
                        placeholder="INK-XXXX-XXXX"
                        className={`w-full bg-gray-50 border ${errorMsg ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'} rounded-xl py-3.5 pl-10 pr-4 text-sm font-mono uppercase tracking-wider focus:outline-none transition-all`}
                    />
                </div>
                
                {errorMsg && (
                    <div className="flex items-center text-xs text-red-500 font-medium px-1 animate-in slide-in-from-top-1">
                        <AlertCircle size={12} className="mr-1.5" />
                        {errorMsg}
                    </div>
                )}

                <button 
                    onClick={handleActivate}
                    disabled={loading || activationCode.length < 10}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-base shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center space-x-2"
                >
                    {loading ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <span>验证并激活</span>
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
                
                <p className="text-center text-[10px] text-gray-400 pt-2">
                    ¥6.00 / 永久赞助 · 感谢支持独立开发
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
