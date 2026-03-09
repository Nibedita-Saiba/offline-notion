import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Wand2, FileText, Lightbulb, PenLine, MessageSquare, Send, Copy, Check, Loader } from 'lucide-react';
import { aiApi } from '../../utils/api';

const AI_ACTIONS = [
  { id: 'summarize', label: 'Summarize page', icon: <FileText size={14} />, description: 'Get a concise summary' },
  { id: 'ideas', label: 'Generate ideas', icon: <Lightbulb size={14} />, description: 'Brainstorm related ideas' },
  { id: 'rewrite', label: 'Improve writing', icon: <Wand2 size={14} />, description: 'Rewrite selected text' },
  { id: 'continue', label: 'Continue writing', icon: <PenLine size={14} />, description: 'Continue from last paragraph' },
  { id: 'ask', label: 'Ask AI', icon: <MessageSquare size={14} />, description: 'Ask anything about this page' },
];

export default function AIPanel({ pageContent, pageTitle, onClose }) {
  const [status, setStatus] = useState({ available: false, models: [] });
  const [activeAction, setActiveAction] = useState(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    aiApi.status().then((s) => {
      setStatus(s);
      if (s.models?.length > 0) setSelectedModel(s.models[0]);
    }).catch(() => {});
  }, []);

  const handleAction = async (actionId) => {
    if (!status.available) {
      setError('Ollama is not running. Start Ollama and pull a model to use AI features.');
      return;
    }

    setActiveAction(actionId);
    setResult('');
    setError('');
    setLoading(true);

    try {
      let res;
      const model = selectedModel || undefined;

      switch (actionId) {
        case 'summarize':
          const content = `${pageTitle}\n\n${pageContent}`;
          res = await aiApi.summarize(content.trim() || 'Empty page', model);
          break;
        case 'ideas':
          res = await aiApi.ideas(pageTitle || 'this topic', 5, model);
          break;
        case 'rewrite':
          if (!input.trim()) {
            setError('Please enter some text to rewrite.');
            setLoading(false);
            return;
          }
          res = await aiApi.rewrite(input, 'clear and professional', model);
          break;
        case 'continue':
          const lastContent = pageContent.split('\n').filter(Boolean).slice(-3).join('\n');
          res = await aiApi.continue(lastContent || pageTitle, model);
          break;
        case 'ask':
          if (!input.trim()) {
            setError('Please enter a question.');
            setLoading(false);
            return;
          }
          res = await aiApi.ask(input, pageContent, model);
          break;
      }

      setResult(res.result || '');
    } catch (err) {
      setError(err.message || 'AI request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 flex flex-col bg-[#161616] border-l border-notion-border overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-notion-blue" />
          <span className="text-sm font-medium text-notion-text">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-notion-muted hover:text-notion-text">
          <X size={15} />
        </button>
      </div>

      {/* Status */}
      <div className="px-4 py-2 border-b border-notion-border">
        <div className={`flex items-center gap-2 text-xs ${status.available ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${status.available ? 'bg-green-400' : 'bg-red-400'}`} />
          {status.available ? (
            <span>Ollama connected</span>
          ) : (
            <span>Ollama offline</span>
          )}
        </div>
        {status.available && status.models.length > 0 && (
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="mt-1.5 text-xs bg-notion-hover border border-notion-border rounded px-2 py-1 text-notion-muted w-full outline-none"
          >
            {status.models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
      </div>

      {/* Actions */}
      <div className="px-3 py-3 border-b border-notion-border">
        <p className="text-xs font-medium text-notion-muted uppercase tracking-wide mb-2">Actions</p>
        <div className="space-y-0.5">
          {AI_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => {
                setActiveAction(action.id);
                setResult('');
                setError('');
                setInput('');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm w-full text-left transition-colors ${
                activeAction === action.id
                  ? 'bg-notion-hover text-notion-text'
                  : 'text-notion-muted hover:bg-notion-hover/60 hover:text-notion-text'
              }`}
            >
              <span className="text-notion-blue">{action.icon}</span>
              <div>
                <div className="text-xs font-medium">{action.label}</div>
                <div className="text-xs text-notion-muted">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      {activeAction && ['rewrite', 'ask'].includes(activeAction) && (
        <div className="px-3 py-3 border-b border-notion-border">
          <textarea
            ref={textareaRef}
            className="input w-full text-xs resize-none"
            rows={3}
            placeholder={
              activeAction === 'ask'
                ? 'Ask a question about this page...'
                : 'Enter text to rewrite...'
            }
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            onClick={() => handleAction(activeAction)}
            disabled={loading}
            className="btn-primary w-full mt-2 text-xs justify-center"
          >
            {loading ? (
              <><Loader size={12} className="animate-spin" /> Thinking...</>
            ) : (
              <><Send size={12} /> Run</>
            )}
          </button>
        </div>
      )}

      {/* Quick run for non-input actions */}
      {activeAction && !['rewrite', 'ask'].includes(activeAction) && !result && !loading && !error && (
        <div className="px-3 py-3">
          <button
            onClick={() => handleAction(activeAction)}
            disabled={loading || !status.available}
            className="btn-primary w-full text-xs justify-center"
          >
            <Send size={12} /> Run
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-notion-muted text-sm">
          <Loader size={16} className="animate-spin text-notion-blue" />
          Generating...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 my-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
          {!status.available && (
            <div className="mt-2 text-red-300">
              Run: <code className="bg-black/30 px-1 rounded">ollama serve</code>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-notion-muted">Result</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-notion-muted hover:text-notion-text transition-colors"
            >
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
          <div className="bg-notion-hover rounded-lg p-3 text-xs text-notion-text leading-relaxed whitespace-pre-wrap">
            {result}
          </div>
          <button
            onClick={() => handleAction(activeAction)}
            className="btn-ghost w-full text-xs justify-center mt-2"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Footer hint */}
      {!status.available && (
        <div className="px-3 py-3 mt-auto border-t border-notion-border">
          <p className="text-xs text-notion-muted">
            Install Ollama and run a model to enable AI:
          </p>
          <code className="text-xs text-notion-blue mt-1 block">
            ollama pull llama3
          </code>
        </div>
      )}
    </div>
  );
}
