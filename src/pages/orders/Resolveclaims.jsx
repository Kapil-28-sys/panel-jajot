import React, { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Gem,
  ImageIcon,
  LifeBuoy,
  UploadCloud,
  Wallet,
} from "lucide-react";

/* ---------- design tokens (same CSS variables as the Dashboard) ---------- */

const serif = { fontFamily: "var(--font-display)" };

const RESPONSE_OPTIONS = [
  {
    key: "accept",
    title: "Accept liability and issue refund",
    sub: "You agree with the claim. The refund amount will be deducted from your account balance.",
  },
  {
    key: "dispute",
    title: "Dispute this claim",
    sub: "You believe this claim is invalid. Provide evidence to support your response.",
  },
  {
    key: "info",
    title: "Request more information",
    sub: "Ask the customer or Amazon for additional details before responding.",
  },
];

const SUMMARY_ITEMS = [
  { label: "Claim type", value: "A-to-z Guarantee claim" },
  { label: "Claim reason", value: "Item not as described" },
  { label: "Amount claimed", value: "₹1,499.00", tone: "amount" },
  { label: "Claim filed on", value: "14 Jul 2026" },
  { label: "Order date", value: "3 Jul 2026" },
  { label: "Order ID", value: "408-1234567-8901234", tone: "link" },
];

const EVIDENCE = ["photo_earbud_defect.jpg", "order_screenshot.png"];

const TIMELINE = [
  { title: "Claim filed by customer", date: "14 Jul 2026, 4:12 PM" },
  { title: "Amazon requested seller response", date: "14 Jul 2026, 4:20 PM" },
  { title: "Awaiting your response", date: "Due 21 Jul 2026", current: true },
];

/* ---------- building blocks (same look as Dashboard) ---------- */

function GoldLine({ className = "inset-x-10" }) {
  return (
    <span
      className={`pointer-events-none absolute top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--brand-line))] to-transparent ${className}`}
    />
  );
}

function Panel({ icon: Icon, title, children, className = "" }) {
  return (
    <section
      className={`relative rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-stone-200 sm:p-7 ${className}`}
    >
      <GoldLine className="inset-x-10" />
      <h2 className="flex items-center gap-3 text-xl font-semibold text-slate-900" style={serif}>
        {Icon && <Icon size={17} strokeWidth={1.6} className="text-[rgb(var(--brand-text))]" />}
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GlanceStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-5 first:pl-0 last:pr-0">
      <Icon size={18} strokeWidth={1.5} className="text-[rgb(var(--brand-text))]" />
      <div>
        <p className="text-2xl font-semibold leading-none text-slate-900" style={serif}>
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function ResolveClaim() {
  const [selectedOption, setSelectedOption] = useState("dispute");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const maxChars = 2000;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <a href="#" className="text-[rgb(var(--brand-text))] hover:underline">
          Orders
        </a>
        <span className="mx-2">›</span>
        <a href="#" className="text-[rgb(var(--brand-text))] hover:underline">
          Claims
        </a>
        <span className="mx-2">›</span>
        <span>Resolve claim</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-[rgb(var(--hero-a))] via-[rgb(var(--hero-b))] to-[rgb(var(--hero-c))] p-7 ring-1 ring-[rgb(var(--brand-line)/0.4)] sm:p-10">
        <GoldLine className="inset-x-16" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--brand-dark))]">
              <Gem size={14} strokeWidth={1.6} />
              Claim resolution
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl" style={serif}>
                Resolve claim
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Action required
              </span>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600">
              Claim ID: AZ-CLM-8842910, Order 408-1234567-8901234
            </p>
          </div>

          <div className="flex divide-x divide-[rgb(var(--brand-line)/0.4)]">
            <GlanceStat icon={Wallet} value="₹1,499" label="amount claimed" />
            <GlanceStat icon={CalendarDays} value="14 Jul" label="claim filed" />
            <GlanceStat icon={Clock} value="21 Jul" label="respond by" />
          </div>
        </div>
      </section>

      {/* Deadline banner */}
      <div
        role="alert"
        className="flex items-start gap-3 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      >
        <AlertTriangle size={18} strokeWidth={1.6} className="mt-0.5 shrink-0" />
        <span>
          <strong className="font-semibold">Respond by 21 Jul 2026, 11:59 PM IST.</strong> If you don't respond in time,
          this claim will be automatically granted in the customer's favor.
        </span>
      </div>

      {submitted && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-control)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} strokeWidth={1.6} className="mt-0.5 shrink-0" />
          Your response has been submitted. Amazon will review it and notify you of the outcome within 2 business days.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <Panel title="Claim summary">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {SUMMARY_ITEMS.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs text-slate-500">{item.label}</dt>
                  <dd
                    className={`mt-1 ${
                      item.tone === "amount"
                        ? "text-2xl font-semibold text-rose-700"
                        : item.tone === "link"
                        ? "cursor-pointer text-sm font-medium text-[rgb(var(--brand-text))] hover:underline"
                        : "text-sm font-medium text-slate-900"
                    }`}
                    style={item.tone === "amount" ? serif : undefined}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex items-start gap-3 border-t border-stone-100 pt-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-stone-200 bg-[rgb(var(--tint-50))] text-slate-400">
                <ImageIcon size={20} strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Wireless Bluetooth Earbuds - Black</p>
                <p className="mt-0.5 text-xs text-slate-500">SKU: WBE-BLK-01, ASIN: B0C9XXXXX3, Qty: 1</p>
              </div>
            </div>
          </Panel>

          <Panel title="Customer's statement">
            <blockquote className="border-l-4 border-[rgb(var(--brand-line))] pl-4 text-sm leading-relaxed text-slate-700">
              "The earbuds I received don't match the listing photos — the color is different and one earbud has no sound
              at all. I want a full refund."
            </blockquote>
          </Panel>

          <Panel title="Evidence provided by customer">
            <ul className="space-y-2">
              {EVIDENCE.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-[var(--radius-control)] border border-stone-200 px-3 py-2.5 text-sm transition-colors hover:bg-stone-50"
                >
                  <FileText size={16} strokeWidth={1.6} className="shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-slate-800">{name}</span>
                  <a href="#" className="text-xs font-medium text-[rgb(var(--brand-text))] hover:underline">
                    View
                  </a>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Your response">
            <fieldset>
              <legend className="sr-only">Choose how to respond</legend>
              <div className="space-y-3">
                {RESPONSE_OPTIONS.map((opt) => {
                  const selected = selectedOption === opt.key;
                  return (
                    <label
                      key={opt.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[rgb(var(--brand-line))] ${
                        selected
                          ? "border-[rgb(var(--brand))] bg-[rgb(var(--tint-50))] ring-1 ring-[rgb(var(--brand))]"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="response"
                        checked={selected}
                        onChange={() => setSelectedOption(opt.key)}
                        className="mt-1 accent-[rgb(var(--brand))]"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{opt.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{opt.sub}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label htmlFor="comment" className="mt-6 block text-sm font-semibold text-slate-900">
              Explain your response
            </label>
            <textarea
              id="comment"
              placeholder="Provide details to support your response. Include tracking numbers, dates, or policy references where relevant."
              value={comment}
              maxLength={maxChars}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 min-h-[110px] w-full resize-y rounded-[var(--radius-control)] border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand-line))]"
            />
            <div className="mt-1 text-right text-xs text-slate-500">
              {comment.length}/{maxChars}
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-900">Upload supporting evidence (optional)</p>
            <div className="mt-2 cursor-pointer rounded-[var(--radius-control)] border-2 border-dashed border-stone-300 px-6 py-7 text-center text-sm text-slate-500 transition-colors hover:border-[rgb(var(--brand-line))] hover:bg-[rgb(var(--tint-50))]">
              <UploadCloud size={26} strokeWidth={1.5} className="mx-auto mb-2 text-slate-400" />
              <div>Drag files here or click to upload</div>
              <div className="mt-0.5 text-xs">PDF, JPG or PNG, max 10MB per file</div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-5">
              <button
                type="button"
                className="rounded-[var(--radius-control)] border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--brand-line))]"
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={comment.trim().length === 0}
                onClick={() => setSubmitted(true)}
                className="rounded-[var(--radius-control)] bg-gradient-to-br from-[rgb(var(--brand))] to-[rgb(var(--brand-dark))] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--brand-line))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit response
              </button>
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <Panel icon={Clock} title="Claim timeline">
            <ol>
              {TIMELINE.map((step, index) => {
                const last = index === TIMELINE.length - 1;
                return (
                  <li key={step.title} className="relative flex gap-3 pb-6 last:pb-0">
                    {!last && <span className="absolute left-[4px] top-4 h-full w-px bg-stone-200" aria-hidden="true" />}
                    <span
                      className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        step.current ? "bg-[rgb(var(--brand))] ring-4 ring-[rgb(var(--tint-200))]" : "bg-slate-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.date}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel icon={LifeBuoy} title="Need help?">
            <p className="text-sm leading-relaxed text-slate-600">
              Review the A-to-z Guarantee policy to understand what qualifies for seller protection before responding to
              this claim.
            </p>
            <div className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
              <a href="#" className="text-[rgb(var(--brand-text))] hover:underline">
                Read A-to-z Guarantee policy →
              </a>
              <a href="#" className="text-[rgb(var(--brand-text))] hover:underline">
                Contact Seller Support →
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}