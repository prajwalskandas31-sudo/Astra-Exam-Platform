"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, FlaskConical, Briefcase, Palette, Calculator, Dna, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: (data: { selectedClass: string; selectedStream: string; selectedTrack: string }) => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedClass, setSelectedClass] = useState<string>("Class 12");
  const [selectedStream, setSelectedStream] = useState<string>("Science");
  const [selectedTrack, setSelectedTrack] = useState<string>("PCM (Maths)");

  if (!isOpen) return null;

  const foundationClasses = ["Class 5", "Class 6", "Class 7", "Class 8"];
  const boardClasses = ["Class 9", "Class 10"];
  const seniorClasses = ["Class 11", "Class 12", "12+ / Dropper"];

  const handleNextStep1 = () => {
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (selectedStream === "Science") {
      setStep(3);
    } else {
      onClose({ selectedClass, selectedStream, selectedTrack: selectedStream });
    }
  };

  const handleComplete = () => {
    onClose({ selectedClass, selectedStream, selectedTrack });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {step === 1 && "Select Your Class"}
            {step === 2 && "Select Your Stream"}
            {step === 3 && "Select Science Stream"}
          </h2>
          <p className="text-sm text-slate-400">
            {step === 1 && "This helps us personalize your dashboard and show relevant content."}
            {step === 2 && "Choose between Science, Commerce, or Arts to access the right subjects."}
            {step === 3 && "Choose PCM for Engineering/JEE or PCB for Medical/NEET preparation."}
          </p>
        </div>

        {/* Step Indicator Bar */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 1 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
            1. Class
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 2 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
            2. Stream
          </div>
          {selectedStream === "Science" && (
            <>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <div className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${step === 3 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                3. PCM/PCB
              </div>
            </>
          )}
        </div>

        {/* STEP 1: CLASS SELECTION */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Foundation (Class 5-8)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {foundationClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
                      selectedClass === cls
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Board Exam Prep (Class 9-10)</p>
              <div className="grid grid-cols-2 gap-2">
                {boardClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all ${
                      selectedClass === cls
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Higher Secondary & Competitive</p>
              <div className="grid grid-cols-3 gap-2">
                {seniorClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`py-3.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                      selectedClass === cls
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
              <span>Selected: <strong>{selectedClass}</strong></span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>

            <Button
              onClick={handleNextStep1}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-12 rounded-2xl font-bold shadow-lg shadow-blue-600/30"
            >
              Continue to Stream Selection
            </Button>
          </div>
        )}

        {/* STEP 2: STREAM SELECTION */}
        {step === 2 && (
          <div className="space-y-4">
            {[
              {
                id: "Science",
                title: "Science",
                desc: "Physics, Chemistry, Maths / Biology",
                icon: FlaskConical,
                color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
              },
              {
                id: "Commerce",
                title: "Commerce",
                desc: "Accountancy, Business Studies, Economics",
                icon: Briefcase,
                color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
              },
              {
                id: "Arts/Humanities",
                title: "Arts / Humanities",
                desc: "History, Political Science, Geography",
                icon: Palette,
                color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
              },
            ].map((stream) => {
              const Icon = stream.icon;
              const isSelected = selectedStream === stream.id;
              return (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream.id)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-xl shadow-blue-600/10'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${stream.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-100">{stream.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{stream.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-1/3 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 h-12 rounded-2xl font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNextStep2}
                className="w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-12 rounded-2xl font-bold shadow-lg shadow-blue-600/30"
              >
                {selectedStream === "Science" ? "Continue to PCM/PCB" : "Confirm & Start"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PCM / PCB SELECTION */}
        {step === 3 && (
          <div className="space-y-4">
            {[
              {
                id: "PCM (Maths)",
                title: "PCM (Maths)",
                desc: "Physics, Chemistry, Mathematics - For JEE/Engineering",
                icon: Calculator,
                color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
              },
              {
                id: "PCB (Biology)",
                title: "PCB (Biology)",
                desc: "Physics, Chemistry, Biology - For NEET/Medical",
                icon: Dna,
                color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
              },
            ].map((track) => {
              const Icon = track.icon;
              const isSelected = selectedTrack === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track.id)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-xl shadow-blue-600/10'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${track.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-100">{track.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{track.desc}</p>
                  </div>
                  {isSelected && (
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="w-1/3 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 h-12 rounded-2xl font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleComplete}
                className="w-2/3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-12 rounded-2xl font-bold shadow-lg shadow-blue-600/30"
              >
                Confirm & Start
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
