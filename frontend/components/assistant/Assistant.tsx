import React, { useState } from 'react';
import { Sparkles, LogOut, ArrowRight } from 'lucide-react';
import { generateAssistantResponse } from '../../services/geminiService';

export const Assistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await generateAssistantResponse(prompt);
    setResponse(res);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-72 bg-white rounded-2xl shadow-2xl p-4 border border-sky-100 animate-fade-in">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sky-800 flex items-center gap-2">
              <Sparkles size={16} /> Помощник
            </h4>
            <button onClick={() => setIsOpen(false)}>
              <LogOut size={14} className="rotate-45" />
            </button>
          </div>
          <div className="bg-sky-50 rounded-lg p-3 text-sm text-gray-700 min-h-[60px] mb-3">
            {loading ? (
              <span className="animate-pulse">Думаю...</span>
            ) : (
              response || 'Спроси меня о погоде или попроси придумать комментарий к поездке!'
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 text-sm border-gray-200 rounded-lg px-2 py-1 outline-none border focus:border-sky-300"
              placeholder="Напиши сюда..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              className="bg-sky-500 text-white rounded-lg px-2 hover:bg-sky-600"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        <Sparkles size={24} />
      </button>
    </div>
  );
};
