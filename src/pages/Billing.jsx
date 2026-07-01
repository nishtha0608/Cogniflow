import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Zap, Star, Building2, Crown, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Zap,
    color: 'from-slate-500 to-gray-600',
    accent: '#64748b',
    features: [
      '5 research projects',
      '50 AI conversations / month',
      '10 document uploads',
      'Basic gap analysis',
      'Viva preparation (10 sessions)',
      'Patent search (read-only)',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    icon: Star,
    color: 'from-violet-500 to-purple-600',
    accent: '#8b5cf6',
    popular: true,
    features: [
      'Unlimited projects',
      'Unlimited AI conversations',
      '100 document uploads / month',
      'Advanced gap analysis',
      'Unlimited viva sessions',
      'Full patent search & save',
      'Video notes',
      'WhatsApp integration',
      'Priority AI processing',
      'Priority email support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    icon: Building2,
    color: 'from-amber-500 to-orange-600',
    accent: '#f59e0b',
    features: [
      'Everything in Pro',
      'Unlimited document uploads',
      'Custom AI models',
      'Team collaboration (up to 20)',
      'Geo research tools',
      'Dedicated account manager',
      '99.9% SLA uptime guarantee',
      'Custom integrations & API',
      'Phone + WhatsApp support',
    ],
  },
];

export default function Billing() {
  const [billing, setBilling] = useState('monthly');
  const [currentPlan] = useState('free');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const displayPrice = (plan) => {
    if (plan.price === 0) return 'Free';
    const p = billing === 'annual' ? Math.round(plan.price * 0.8) : plan.price;
    return `$${p}/mo`;
  };

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4 shadow-lg">
            <CreditCard size={22} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Plan</h1>
          <p className="text-gray-500 dark:text-slate-400 mb-6">Scale your research capabilities with CogniFlow</p>

          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            {['monthly', 'annual'].map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                  billing === b
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                )}
              >
                {b === 'annual' ? 'Annual (Save 20%)' : 'Monthly'}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'relative bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-sm',
                  plan.popular
                    ? 'border-violet-300 dark:border-violet-700 shadow-violet-100 dark:shadow-violet-900/30 shadow-md'
                    : 'border-gray-200 dark:border-slate-800'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg">
                      <Crown size={10} className="mr-1" /> Most Popular
                    </Badge>
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-md mb-4`}>
                  <Icon size={18} className="text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>

                <div className="mb-4">
                  <span className="text-3xl font-bold" style={{ color: plan.accent }}>
                    {displayPrice(plan)}
                  </span>
                  {plan.price > 0 && billing === 'annual' && (
                    <span className="text-sm text-gray-400 line-through ml-2">${plan.price}/mo</span>
                  )}
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2 text-sm">
                      <Check size={13} className="mt-0.5 shrink-0" style={{ color: plan.accent }} />
                      <span className="text-gray-700 dark:text-slate-300">{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                    Current Plan
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan)}
                    className={cn('w-full rounded-xl text-white font-semibold', `bg-gradient-to-r ${plan.color} hover:opacity-90`)}
                  >
                    {plan.price === 0 ? 'Downgrade' : 'Upgrade Now'}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4 text-sm">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. You can cancel your subscription at any time and keep access until the end of your billing period.' },
              { q: 'Is there a student discount?', a: 'Yes — verify your academic email at checkout for 40% off Pro and Enterprise plans.' },
              { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, and bank transfers for Enterprise.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="font-medium text-gray-800 dark:text-white">{q}</p>
                <p className="text-gray-500 dark:text-slate-400 mt-0.5">{a}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment modal */}
        {showPayment && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upgrade to {selectedPlan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Billed {billing}</p>
                </div>
                <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { label: 'Card Number', placeholder: '4242 4242 4242 4242' },
                  { label: 'Name on Card', placeholder: 'Jane Smith' },
                ].map(({ label, placeholder }) => (
                  <div key={label}>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">{label}</label>
                    <input placeholder={placeholder} className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">Expiry</label>
                    <input placeholder="MM / YY" className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1 block">CVV</label>
                    <input placeholder="123" className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:border-violet-400" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowPayment(false)} variant="outline" className="flex-1 rounded-xl border-gray-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowPayment(false)}
                  className={`flex-1 rounded-xl text-white bg-gradient-to-r ${selectedPlan.color} hover:opacity-90`}
                >
                  Pay {displayPrice(selectedPlan)}
                </Button>
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-3">
                Secured by Stripe · 256-bit SSL encryption
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
