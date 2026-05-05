"use client";

import { motion } from "framer-motion";

export default function DashboardMockup() {
  return (
    <div className="relative w-full">
      {/* Ambient glows */}
      <div className="absolute -top-16 -right-16 w-72 h-72 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-indigo-700/20 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-64 bg-blue-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating top-right badge */}
      <motion.div
        initial={{ opacity: 0, y: -20, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="absolute -top-4 -right-4 lg:-right-8 z-20 hidden sm:block"
      >
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/15 border border-green-500/30 backdrop-blur-sm shadow-lg">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-green-400" style={{animationDelay:`${i*0.2}s`}} />
            ))}
          </div>
          <span className="text-xs font-semibold text-green-400">All systems live</span>
        </div>
      </motion.div>

      {/* Floating bottom-left card */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="absolute -bottom-6 -left-4 lg:-left-10 z-20 hidden sm:block"
      >
        <div className="p-3 rounded-xl bg-[#0d1540]/95 border border-white/15 shadow-2xl backdrop-blur-sm w-48">
          <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">CliqPOS Active</div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-300">3 branches synced</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
          <div className="flex gap-1">
            {["Accra", "Kumasi", "Takoradi"].map(b => (
              <span key={b} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/20">{b}</span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Floating automation card */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.7, delay: 0.9 }}
        className="absolute top-1/3 -right-2 lg:-right-10 z-20 hidden lg:block"
      >
        <div className="p-3 rounded-xl bg-[#0d1540]/95 border border-white/15 shadow-2xl backdrop-blur-sm w-44">
          <div className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Automations</div>
          {["Invoice Auto", "WhatsApp Bot", "Report Gen"].map((item, i) => (
            <div key={item} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" style={{animationDelay:`${i*0.3}s`}} />
              <span className="text-[11px] text-gray-300">{item}</span>
              <span className="ml-auto text-[9px] text-green-400 font-medium">ON</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Dashboard Window */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/12 shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] bg-[#080d28]"
        style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 120px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.07)" }}
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-[#060920]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white/6 border border-white/8">
              <div className="w-2 h-2 rounded-full bg-green-500/80" />
              <span className="text-[11px] text-gray-400 font-medium">app.ravesoft.io/dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/20 border border-blue-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-blue-400">LIVE</span>
          </div>
        </div>

        {/* Dashboard body */}
        <div className="p-4 lg:p-5">
          {/* Top header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Business Overview</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">May 2026 · Real-time</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1 rounded-md text-[10px] font-medium text-gray-400 bg-white/5 border border-white/8">Daily</button>
              <button className="px-2.5 py-1 rounded-md text-[10px] font-semibold text-blue-400 bg-blue-600/15 border border-blue-500/25">Weekly</button>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: "Total Revenue", value: "GH₵ 84,200", change: "+12.4%", up: true, color: "blue" },
              { label: "Orders Today", value: "1,284", change: "+8.1%", up: true, color: "green" },
              { label: "Inventory", value: "3,420", change: "-2.3%", up: false, color: "amber" },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl border"
                style={{
                  background: stat.color === "blue" ? "rgba(59,130,246,0.07)" : stat.color === "green" ? "rgba(34,197,94,0.07)" : "rgba(255,178,0,0.07)",
                  borderColor: stat.color === "blue" ? "rgba(59,130,246,0.2)" : stat.color === "green" ? "rgba(34,197,94,0.2)" : "rgba(255,178,0,0.2)"
                }}
              >
                <div className="text-[10px] text-gray-400 mb-1 font-medium">{stat.label}</div>
                <div className="text-sm font-bold text-white mb-0.5">{stat.value}</div>
                <div className={`text-[10px] font-semibold ${stat.up ? "text-green-400" : "text-red-400"}`}>{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="p-3.5 rounded-xl bg-white/4 border border-white/8 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gray-300">Revenue Trend</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] text-gray-500">Revenue</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] text-gray-500">Orders</span>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-20 mb-1">
              {[38, 52, 44, 68, 55, 82, 72, 90, 76, 95, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
                  <div className="rounded-sm w-full transition-all"
                    style={{
                      height: `${h * 0.7}%`,
                      background: i === 11
                        ? "linear-gradient(to top, #3B82F6, #60A5FA)"
                        : i >= 9
                        ? "rgba(59,130,246,0.45)"
                        : "rgba(59,130,246,0.2)"
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                <span key={i} className="flex-1 text-center text-[8px] text-gray-600 font-medium">{m}</span>
              ))}
            </div>
          </div>

          {/* Bottom two columns */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Recent transactions */}
            <div className="p-3 rounded-xl bg-white/4 border border-white/8">
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Recent Sales</div>
              {[
                { name: "Kofi Acheampong", amt: "GH₵ 420", time: "2m ago" },
                { name: "FreshMart Ltd", amt: "GH₵ 1,240", time: "8m ago" },
                { name: "Metro Store", amt: "GH₵ 680", time: "15m ago" },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-[10px] font-medium text-white leading-tight">{tx.name}</div>
                    <div className="text-[9px] text-gray-600">{tx.time}</div>
                  </div>
                  <span className="text-[10px] font-bold text-green-400">{tx.amt}</span>
                </div>
              ))}
            </div>

            {/* Inventory + status */}
            <div className="flex flex-col gap-2">
              <div className="flex-1 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <div className="text-[10px] text-amber-400 font-semibold mb-1">Low Stock Alert</div>
                <div className="text-base font-bold text-white">12 items</div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
                </div>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-green-500/8 border border-green-500/20">
                <div className="text-[10px] text-green-400 font-semibold mb-1">Revenue Today</div>
                <div className="text-base font-bold text-white">GH₵ 3,840</div>
                <div className="text-[10px] text-green-400 mt-0.5">↑ +18% vs yesterday</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

