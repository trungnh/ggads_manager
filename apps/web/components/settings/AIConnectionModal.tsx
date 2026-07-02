"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Key, CheckCircle, Loader2 } from "lucide-react";

interface AIConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIConnectionModal({ isOpen, onClose }: AIConnectionModalProps) {
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"loading" | "none" | "active">("loading");

  const fetchStatus = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/settings/ai-connections?provider=${provider}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data.status);
      } else {
        setStatus("none");
      }
    } catch (e) {
      console.error(e);
      setStatus("none");
    }
  }, [provider]);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  const handleSave = async () => {
    if (!apiKey) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/ai-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      if (res.ok) {
        setStatus("active");
        setApiKey("");
        setTimeout(() => onClose(), 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-400" />
            AI Connections
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Provider</label>
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="gemini">Google Gemini (Gemini 2.5 / 3.5 Flash - Tối ưu chi phí)</option>
              <option value="gemini-pro">Google Gemini (Gemini 2.5 Pro - Độ chính xác cao)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">API Key</label>
            <input 
              type="password"
              placeholder="Enter your API Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Keys are encrypted at rest using AES-256.
            </p>
          </div>

          {status === "active" && !apiKey && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              API Key is currently active.
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || !apiKey}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
