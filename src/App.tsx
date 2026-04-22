/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType } from './types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { GoogleGenAI } from '@google/genai';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { twMerge } from "tailwind-merge";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = {
  expense: ['Housing', 'Food', 'Transportation', 'Utilities', 'Insurance', 'Medical', 'Savings', 'Personal', 'Entertainment', 'Other'],
  income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other']
};

const COLORS = ['#fb7185', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#fcd34d', '#f472b6', '#38bdf8', '#818cf8', '#2dd4bf'];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  
  const [aiTips, setAiTips] = useState<string | null>(null);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('transactions');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Update default category when type changes
  useEffect(() => {
    setCategory(CATEGORIES[type][0]);
  }, [type]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type,
      amount: Number(amount),
      category,
      date,
      description
    };

    setTransactions(prev => [newTransaction, ...prev]);
    setAmount('');
    setDescription('');
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp
    };
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const generateAiTips = async () => {
    if (transactions.length === 0) {
      setAiTips("Add some transactions first so I can analyze your spending!");
      return;
    }

    setIsGeneratingTips(true);
    setAiTips(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        As an expert financial advisor, analyze the following monthly transaction summary and provide 3 concise, actionable tips to improve savings.
        Address the user directly. Keep it short and supportive. Format as a bulleted list.

        Total Income: ₹${totalIncome}
        Total Expenses: ₹${totalExpense}
        Net Savings: ₹${netSavings}

        Expenses by Category:
        ${expensesByCategory.map(c => `- ${c.name}: ₹${c.value}`).join('\n')}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiTips(response.text || "I couldn't generate tips right now. Try again later.");
    } catch (error) {
      console.error("Error generating tips:", error);
      setAiTips("An error occurred while generating tips. Please make sure your Gemini API key is configured correctly.");
    } finally {
      setIsGeneratingTips(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 flex flex-col font-sans">
      <div className="mx-auto w-full max-w-6xl flex flex-col flex-grow">
        
        {/* App Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Savvy Track <span className="text-emerald-400">v1.0</span></h1>
            <p className="text-slate-400 text-sm">Monthly Financial Overview • {format(new Date(), 'MMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-4 py-2 rounded-full border border-slate-800 text-xs font-medium">
              Live App
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white border-2 border-slate-800 shadow-lg">
              ST
            </div>
          </div>
        </header>

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 flex-grow pb-8">
          
          {/* Main Summary Card */}
          <div className="md:col-span-8 md:row-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-1">Net Savings</p>
                <h2 className={cn("text-5xl md:text-6xl font-black", netSavings >= 0 ? "text-white" : "text-rose-400")}>
                  ₹{netSavings.toFixed(2)}
                </h2>
              </div>
              <div className="flex gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-slate-500 text-[10px] font-bold">INCOME</p>
                  <p className="text-xl md:text-lg font-bold text-emerald-400">₹{totalIncome.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-[10px] font-bold">EXPENSES</p>
                  <p className="text-xl md:text-lg font-bold text-rose-400">₹{totalExpense.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-end gap-2 h-24 mt-8 opacity-70">
              {/* Decorative data bars mapping to the original aesthetic */}
              <div className="flex-grow h-[40%] bg-slate-800 rounded-t-lg"></div>
              <div className="flex-grow h-[60%] bg-slate-800 rounded-t-lg"></div>
              <div className="flex-grow h-[55%] bg-slate-800 rounded-t-lg"></div>
              <div className="flex-grow h-[80%] bg-slate-800 rounded-t-lg"></div>
              <div className={cn("flex-grow h-[95%] rounded-t-lg", netSavings >= 0 ? "bg-emerald-500" : "bg-rose-500")}></div>
              <div className="flex-grow h-[70%] bg-slate-800 rounded-t-lg"></div>
              <div className="flex-grow h-[65%] bg-slate-800 rounded-t-lg"></div>
            </div>
          </div>

          {/* Analytics Pie Chart Card */}
          <div className="md:col-span-4 md:row-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col relative min-h-[300px]">
            <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-4">Expense Distribution</p>
            <div className="flex-grow flex items-center justify-center">
              {expensesByCategory.length === 0 ? (
                <div className="text-sm text-slate-500 text-center">Add expenses to see analytics.</div>
              ) : (
                <div className="h-full w-full min-h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `₹${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Form Card */}
          <div className="md:col-span-4 md:row-span-3 bg-indigo-600 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Quick Add Transaction</h3>
              <form onSubmit={handleAddTransaction} className="space-y-3">
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-indigo-200 focus:outline-none focus:border-indigo-300 transition-colors"
                />
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="₹0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-1/2 bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-indigo-200 focus:outline-none focus:border-indigo-300 transition-colors"
                  />
                  <select
                    className="w-1/2 bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-300 transition-colors"
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                  >
                    <option value="expense" className="bg-indigo-700">Expense</option>
                    <option value="income" className="bg-indigo-700">Income</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <select
                    className="w-1/2 bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-300 transition-colors"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES[type].map(cat => (
                      <option key={cat} value={cat} className="bg-indigo-700">{cat}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-1/2 bg-indigo-500/50 border border-indigo-400/30 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-300 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </div>

                <button type="submit" className="w-full mt-4 bg-white text-indigo-600 font-bold py-3.5 rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" /> Log Transaction
                </button>
              </form>
            </div>
          </div>

          {/* Recent Transactions Card */}
          <div className="md:col-span-5 md:row-span-3 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col min-h-[300px]">
            <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-4">Recent Activity</p>
            <div className="space-y-3 flex-grow overflow-y-auto max-h-[300px] md:max-h-full pr-1">
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No transactions yet. Add some!
                </div>
              ) : (
                transactions.slice(0, 50).map(t => (
                  <div key={t.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-2xl border border-slate-800 group hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm", t.type === 'expense' ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                        {t.type === 'expense' ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">{t.category}</p>
                        <p className="text-[10px] text-slate-500">{format(new Date(t.date), 'MMM dd')} • {t.description || 'No description'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={cn("text-sm font-bold", t.type === 'expense' ? 'text-rose-400' : 'text-emerald-400')}>
                        {t.type === 'expense' ? '-' : '+'}₹{t.amount.toFixed(2)}
                      </p>
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Savings Tip Card */}
          <div className="md:col-span-3 md:row-span-3 bg-slate-800 border border-slate-700 rounded-3xl p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px]">✨</div>
                <p className="text-slate-200 text-xs font-bold uppercase tracking-tight">Wealth AI Tip</p>
              </div>
              
              <div className="text-sm leading-relaxed mb-4 flex-grow overflow-y-auto pr-1">
                {!aiTips && !isGeneratingTips ? (
                  <p className="italic text-slate-400 mt-2">Generate personalized advice based on your spending patterns.</p>
                ) : isGeneratingTips ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-8 text-emerald-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs font-medium">Analyzing patterns...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-invert text-slate-300">
                    {aiTips?.split('\n').filter(line => line.trim()).map((line, i) => {
                      const content = line.replace(/^\*\s*/, '• ').replace(/\*\*/g, '');
                      return <p key={i} className="mb-3 text-[13px]">{content}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={generateAiTips} 
              disabled={isGeneratingTips}
              className="mt-4 text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors w-full text-left flex items-center group disabled:opacity-50"
            >
              {aiTips ? "Review another tip" : "Analyze My Spending"} 
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
