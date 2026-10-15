'use client';

import React, { useState, useMemo } from 'react';

// ── 1. GST Calculator ───────────────────────────────────────────────────────
export function GstCalculatorTool() {
  const [amount, setAmount] = useState<number>(10000);
  const [rate, setRate] = useState<number>(18);
  const [isInclusive, setIsInclusive] = useState<boolean>(false);

  const rates = [3, 5, 12, 18, 28];

  const result = useMemo(() => {
    const val = Number(amount) || 0;
    const r = Number(rate) || 0;

    if (isInclusive) {
      // GST is already included in amount
      const base = (val * 100) / (100 + r);
      const gst = val - base;
      return {
        baseAmount: base,
        gstAmount: gst,
        cgst: gst / 2,
        sgst: gst / 2,
        totalAmount: val,
      };
    } else {
      // GST is to be added
      const gst = (val * r) / 100;
      return {
        baseAmount: val,
        gstAmount: gst,
        cgst: gst / 2,
        sgst: gst / 2,
        totalAmount: val + gst,
      };
    }
  }, [amount, rate, isInclusive]);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              Initial Amount (₹ / $)
            </label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-lg font-mono font-bold text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              Calculation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsInclusive(false)}
                className={`py-3 text-xs font-semibold rounded-lg border transition-colors ${
                  !isInclusive
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                GST Exclusive (+ Add GST)
              </button>
              <button
                onClick={() => setIsInclusive(true)}
                className={`py-3 text-xs font-semibold rounded-lg border transition-colors ${
                  isInclusive
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                GST Inclusive (Extract GST)
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Tax Slab Rate (%)
          </label>
          <div className="flex flex-wrap gap-2.5">
            {rates.map(r => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className={`px-4 py-2 text-xs font-mono font-bold rounded-lg border transition-colors ${
                  rate === r
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            Base Net Amount
          </span>
          <span className="text-xl font-mono font-bold text-white">
            ₹{result.baseAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            CGST ({rate / 2}%)
          </span>
          <span className="text-xl font-mono font-bold text-purple-300">
            ₹{result.cgst.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            SGST ({rate / 2}%)
          </span>
          <span className="text-xl font-mono font-bold text-purple-300">
            ₹{result.sgst.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 block mb-1">
            Total Final Price
          </span>
          <span className="text-xl font-mono font-bold text-emerald-400">
            ₹{result.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 2. Loan EMI Calculator ──────────────────────────────────────────────────
export function EmiCalculatorTool() {
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(5);

  const { monthlyEmi, totalInterest, totalPayment } = useMemo(() => {
    const P = Number(loanAmount) || 0;
    const annualRate = Number(interestRate) || 0;
    const r = annualRate / 12 / 100;
    const n = (Number(tenureYears) || 0) * 12;

    if (P <= 0 || r <= 0 || n <= 0) {
      return { monthlyEmi: 0, totalInterest: 0, totalPayment: 0 };
    }

    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;

    return {
      monthlyEmi: emi,
      totalInterest: interest,
      totalPayment: total,
    };
  }, [loanAmount, interestRate, tenureYears]);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Loan Amount (₹)
          </label>
          <input
            type="number"
            min="1000"
            step="10000"
            value={loanAmount}
            onChange={e => setLoanAmount(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Interest Rate (% p.a.)
          </label>
          <input
            type="number"
            min="0.1"
            max="30"
            step="0.1"
            value={interestRate}
            onChange={e => setInterestRate(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Tenure (Years)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={tenureYears}
            onChange={e => setTenureYears(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-300 block mb-1">
            Monthly EMI
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-bold text-white">
            ₹{Math.round(monthlyEmi).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            Total Interest Payable
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-400">
            ₹{Math.round(totalInterest).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            Total Payment (Principal + Int)
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
            ₹{Math.round(totalPayment).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 3. Percentage Calculator ────────────────────────────────────────────────
export function PercentageCalculatorTool() {
  const [valA, setValA] = useState<number>(25);
  const [valB, setValB] = useState<number>(200);

  const [partA, setPartA] = useState<number>(50);
  const [partB, setPartB] = useState<number>(250);

  const [fromVal, setFromVal] = useState<number>(80);
  const [toVal, setToVal] = useState<number>(120);

  const res1 = useMemo(() => ((valA * valB) / 100).toFixed(2), [valA, valB]);
  const res2 = useMemo(() => partB ? ((partA / partB) * 100).toFixed(2) : '0', [partA, partB]);
  const res3 = useMemo(() => {
    if (!fromVal) return '0';
    const diff = toVal - fromVal;
    const pct = (diff / fromVal) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  }, [fromVal, toVal]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mode 1 */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            What is X% of Y?
          </h4>
          <div className="space-y-2">
            <input
              type="number"
              value={valA}
              onChange={e => setValA(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="X %"
            />
            <input
              type="number"
              value={valB}
              onChange={e => setValB(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="Y number"
            />
          </div>
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Result:</span>
            <span className="text-xl font-mono font-bold text-white">{res1}</span>
          </div>
        </div>

        {/* Mode 2 */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-300">
            X is what % of Y?
          </h4>
          <div className="space-y-2">
            <input
              type="number"
              value={partA}
              onChange={e => setPartA(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="X value"
            />
            <input
              type="number"
              value={partB}
              onChange={e => setPartB(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="Y total"
            />
          </div>
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Result:</span>
            <span className="text-xl font-mono font-bold text-white">{res2}%</span>
          </div>
        </div>

        {/* Mode 3 */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Increase / Decrease %
          </h4>
          <div className="space-y-2">
            <input
              type="number"
              value={fromVal}
              onChange={e => setFromVal(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="From value"
            />
            <input
              type="number"
              value={toVal}
              onChange={e => setToVal(Number(e.target.value))}
              className="w-full p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
              placeholder="To value"
            />
          </div>
          <div className="pt-2 border-t border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)] block">Change:</span>
            <span className="text-xl font-mono font-bold text-emerald-400">{res3}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. Discount & Savings Calculator ────────────────────────────────────────
export function DiscountCalculatorTool() {
  const [originalPrice, setOriginalPrice] = useState<number>(2499);
  const [discountPercent, setDiscountPercent] = useState<number>(30);
  const [extraCoupon, setExtraCoupon] = useState<number>(10);

  const { finalPrice, totalSaved, effectivePercent } = useMemo(() => {
    const p = Number(originalPrice) || 0;
    const d1 = Number(discountPercent) || 0;
    const d2 = Number(extraCoupon) || 0;

    const afterFirst = p - (p * d1) / 100;
    const finalVal = afterFirst - (afterFirst * d2) / 100;
    const saved = p - finalVal;
    const eff = p > 0 ? (saved / p) * 100 : 0;

    return {
      finalPrice: Math.max(0, finalVal),
      totalSaved: Math.max(0, saved),
      effectivePercent: eff,
    };
  }, [originalPrice, discountPercent, extraCoupon]);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Original Price (₹)
          </label>
          <input
            type="number"
            min="0"
            value={originalPrice}
            onChange={e => setOriginalPrice(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Primary Discount (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={e => setDiscountPercent(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Extra Coupon Discount (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={extraCoupon}
            onChange={e => setExtraCoupon(Number(e.target.value))}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300 block mb-1">
            You Pay (Final Price)
          </span>
          <span className="text-3xl font-mono font-bold text-white">
            ₹{finalPrice.toFixed(2)}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            You Save
          </span>
          <span className="text-3xl font-mono font-bold text-purple-400">
            ₹{totalSaved.toFixed(2)}
          </span>
        </div>

        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
            Total Discount
          </span>
          <span className="text-3xl font-mono font-bold text-amber-400">
            {effectivePercent.toFixed(1)}% OFF
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 5. Age & Milestone Calculator ───────────────────────────────────────────
export function AgeCalculatorTool() {
  const [birthDate, setBirthDate] = useState('2000-01-15');

  const ageData = useMemo(() => {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    if (isNaN(b.getTime()) || b > now) return null;

    let years = now.getFullYear() - b.getFullYear();
    let months = now.getMonth() - b.getMonth();
    let days = now.getDate() - b.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalDays = Math.floor((now.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
    const totalHours = totalDays * 24;

    // Next birthday calculation
    const nextBirthday = new Date(now.getFullYear(), b.getMonth(), b.getDate());
    if (nextBirthday < now) {
      nextBirthday.setFullYear(now.getFullYear() + 1);
    }
    const daysUntilNext = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      years,
      months,
      days,
      totalDays,
      totalHours,
      daysUntilNext,
    };
  }, [birthDate]);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4 max-w-md mx-auto">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Select Date of Birth
        </label>
        <input
          type="date"
          value={birthDate}
          onChange={e => setBirthDate(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-white focus:outline-none focus:border-purple-500"
        />
      </div>

      {ageData && (
        <div className="space-y-4">
          {/* Exact Age */}
          <div className="p-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 text-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-purple-300 block mb-2">
              Exact Age
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              {ageData.years} <span className="text-sm font-normal text-purple-300 mr-2">years</span>
              {ageData.months} <span className="text-sm font-normal text-purple-300 mr-2">months</span>
              {ageData.days} <span className="text-sm font-normal text-purple-300">days</span>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
                Days Lived
              </span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {ageData.totalDays.toLocaleString()} days
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
                Hours Lived
              </span>
              <span className="text-xl font-mono font-bold text-blue-400">
                ~{ageData.totalHours.toLocaleString()} hrs
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-muted)] block mb-1">
                Next Birthday In
              </span>
              <span className="text-xl font-mono font-bold text-amber-400">
                {ageData.daysUntilNext} days
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
