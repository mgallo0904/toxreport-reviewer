import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, Bot, User, Trash2, Paperclip, X, ShieldCheck } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendToxReviewMessage } from './lib/gemini';

type Attachment = {
  name: string;
  mimeType: string;
  data: string;
};

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReset = () => {
    setMessages([]);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64String
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const currentAttachments = [...attachments];
    
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    const newUserMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: userMessage,
      attachments: currentAttachments
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const geminiHistory = updatedMessages.map(msg => {
        const parts: any[] = [];
        if (msg.attachments) {
          msg.attachments.forEach(att => {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data
              }
            });
          });
        }
        if (msg.text) {
          parts.push({ text: msg.text });
        }
        return {
          role: msg.role,
          parts
        };
      });

      const response = await sendToxReviewMessage(geminiHistory);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || 'No response generated.' 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: 'An error occurred while processing your request. Please try again. Note: Very large files might exceed the payload limit.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">ToxReport Reviewer</h1>
            <p className="text-sm text-gray-500">Powered by Gemini 3.1 Pro</p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Reset Chat
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-4">
              <div className="bg-blue-100 p-4 rounded-full mb-2">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Sponsor-Side Toxicology Review</h2>
              <p className="text-gray-600">
                I am an elite AI agent specializing in the scientific review of nonclinical toxicology study reports. 
                Upload your report files (PDF, TXT, CSV) or paste text below to begin the review process.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8 text-left">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-1">Cross-File Verification</h3>
                  <p className="text-sm text-gray-500">Upload protocol and report files to check for consistency.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-medium text-gray-900 mb-1">Data Interpretation</h3>
                  <p className="text-sm text-gray-500">Verify if conclusions are supported by the presented data.</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-200 shadow-sm rounded-tl-sm text-gray-800'
                }`}>
                  {message.role === 'user' ? (
                    <div className="flex flex-col gap-2">
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((att, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-blue-700/50 px-2.5 py-1.5 rounded-md text-sm font-medium">
                              <FileText className="w-4 h-4" />
                              <span className="truncate max-w-[200px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {message.text && <div className="whitespace-pre-wrap">{message.text}</div>}
                    </div>
                  ) : (
                    <div className="markdown-body prose prose-sm max-w-none prose-blue">
                      <Markdown remarkPlugins={[remarkGfm]}>{message.text}</Markdown>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-gray-500">Reviewing document...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="max-w-4xl mx-auto mb-3 flex items-center justify-center gap-2 text-xs text-gray-600 bg-green-50 text-green-800 py-1.5 px-3 rounded-full w-fit border border-green-100">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span><strong>Secure & Private:</strong> Files are processed locally and sent securely to Google Gemini. They are never stored on any public server.</span>
          </div>
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto shadow-sm rounded-xl border border-gray-300 bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200 bg-white rounded-t-xl">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-md text-sm shadow-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="truncate max-w-[200px] text-gray-700 font-medium">{att.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeAttachment(i)}
                      className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end p-2">
              <input 
                type="file" 
                multiple 
                accept=".pdf,text/plain,text/csv,.md" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0 mb-1"
                title="Attach files (PDF, TXT, CSV)"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Paste toxicology report text, or attach PDF/TXT files..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[44px] max-h-[200px] py-3 px-2 text-gray-900 outline-none"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                }}
              />
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-1 ml-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          <p className="text-xs text-center text-gray-400 mt-3">
            Press Enter to send, Shift + Enter for new line. Supports PDF, TXT, CSV.
          </p>
        </div>
      </main>
    </div>
  );
}
