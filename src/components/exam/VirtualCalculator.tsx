"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VirtualCalculatorProps {
  onClose: () => void;
}

export function VirtualCalculator({ onClose }: VirtualCalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState<number | null>(null);

  const handleNum = (num: string) => {
    setDisplay((prev) => (prev === "0" ? num : prev + num));
  };

  const handleOp = (op: string) => {
    setDisplay((prev) => prev + " " + op + " ");
  };

  const handleClear = () => {
    setDisplay("0");
  };

  const handleEval = () => {
    try {
      // Safe mathematical expression evaluator
      const sanitized = display.replace(/×/g, "*").replace(/÷/g, "/");
      const result = Function(`"use strict"; return (${sanitized})`)();
      setDisplay(String(result));
    } catch {
      setDisplay("Error");
    }
  };

  return (
    <div className="fixed top-20 right-8 z-50 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 text-white font-mono">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">GATE Scientific Calc</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="my-3 bg-black/60 p-3 rounded-lg text-right text-xl font-mono text-emerald-400 overflow-x-auto">
        {display}
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <Button variant="secondary" onClick={handleClear} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 col-span-2">C</Button>
        <Button variant="secondary" onClick={() => handleOp("÷")} className="bg-slate-800 text-slate-200">÷</Button>
        <Button variant="secondary" onClick={() => handleOp("×")} className="bg-slate-800 text-slate-200">×</Button>

        <Button variant="secondary" onClick={() => handleNum("7")} className="bg-slate-800">7</Button>
        <Button variant="secondary" onClick={() => handleNum("8")} className="bg-slate-800">8</Button>
        <Button variant="secondary" onClick={() => handleNum("9")} className="bg-slate-800">9</Button>
        <Button variant="secondary" onClick={() => handleOp("-")} className="bg-slate-800 text-slate-200">-</Button>

        <Button variant="secondary" onClick={() => handleNum("4")} className="bg-slate-800">4</Button>
        <Button variant="secondary" onClick={() => handleNum("5")} className="bg-slate-800">5</Button>
        <Button variant="secondary" onClick={() => handleNum("6")} className="bg-slate-800">6</Button>
        <Button variant="secondary" onClick={() => handleOp("+")} className="bg-slate-800 text-slate-200">+</Button>

        <Button variant="secondary" onClick={() => handleNum("1")} className="bg-slate-800">1</Button>
        <Button variant="secondary" onClick={() => handleNum("2")} className="bg-slate-800">2</Button>
        <Button variant="secondary" onClick={() => handleNum("3")} className="bg-slate-800">3</Button>
        <Button variant="secondary" onClick={handleEval} className="bg-blue-600 text-white hover:bg-blue-500 row-span-2 flex items-center justify-center font-bold">=</Button>

        <Button variant="secondary" onClick={() => handleNum("0")} className="bg-slate-800 col-span-2">0</Button>
        <Button variant="secondary" onClick={() => handleNum(".")} className="bg-slate-800">.</Button>
      </div>
    </div>
  );
}
