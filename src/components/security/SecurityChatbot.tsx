import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Upload, 
  FileText, 
  Shield, 
  Brain,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Paperclip
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  scanResults?: any;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  isTyping?: boolean;
}

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

const SecurityChatbot: React.FC<SecurityChatbotProps> = ({ isOpen, onClose, scanResults }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([{
        id: '1',
        type: 'assistant',
        content: `👋 Hi! I'm your security analysis assistant. I have access to your security scan results and can help you understand findings, provide remediation guidance, and answer questions about your infrastructure security.

**What I can help with:**
• Explain security vulnerabilities found in your scan
• Provide specific remediation steps
• Answer questions about compliance requirements  
• Analyze uploaded documents for security concerns
• Compare findings across different security tools

You can also upload additional documents (policies, configurations, etc.) for me to analyze alongside your security scan results.

How can I help you today?`,
        timestamp: new Date(),
        sources: ['Security Knowledge Base']
      }]);
    }
  }, [isOpen, messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // Validate file type and size
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          toast({
            title: "File Too Large",
            description: `${file.name} is larger than 10MB limit.`,
            variant: "destructive"
          });
          continue;
        }

        const allowedTypes = [
          'text/plain', 'text/markdown', 'application/pdf',
          'application/json', 'text/yaml', 'text/x-yaml',
          'application/x-yaml', 'text/csv'
        ];
        
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|pdf|json|yaml|yml|csv|tf|hcl|py|js|ts|sh)$/i)) {
          toast({
            title: "Unsupported File Type",
            description: `${file.name} is not a supported file type.`,
            variant: "destructive"
          });
          continue;
        }

        // Create FormData for upload
        const formData = new FormData();
        formData.append('document', file);
        formData.append('geminiApiKey', geminiApiKey);

        const response = await fetch('/api/upload-document', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          const newDoc: UploadedDocument = {
            id: result.id || Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date()
          };
          
          setUploadedDocs(prev => [...prev, newDoc]);
          
          toast({
            title: "Document Uploaded",
            description: `${file.name} has been processed and added to the knowledge base.`,
          });
        } else {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload documents. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (!isApiKeySet) {
      toast({
        title: "API Key Required",
        description: "Please enter your Gemini API key to start chatting.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const response = await fetch('/api/security-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          geminiApiKey: geminiApiKey,
          uploadedDocuments: uploadedDocs.map(doc => doc.id),
          scanResults: scanResults
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Remove typing indicator and add response
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        return [...withoutTyping, {
          id: Date.now().toString(),
          type: 'assistant',
          content: result.response,
          timestamp: new Date(),
          sources: result.sources || []
        }];
      });

    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove typing indicator and add error message
      setMessages(prev => {
        const withoutTyping = prev.filter(msg => msg.id !== 'typing');
        return [...withoutTyping, {
          id: Date.now().toString(),
          type: 'assistant',
          content: "I'm sorry, I encountered an error processing your request. Please check your API key and try again.",
          timestamp: new Date()
        }];
      });

      toast({
        title: "Chat Error",
        description: "Failed to get response. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeDocument = (docId: string) => {
    setUploadedDocs(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "Document Removed",
      description: "Document removed from knowledge base.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>Security Analysis Assistant</span>
          </DialogTitle>
          <DialogDescription>
            AI-powered assistant for security analysis and remediation guidance
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex space-x-4 min-h-0">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* API Key Setup */}
            {!isApiKeySet && (
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      type="password"
                      placeholder="Enter Gemini API Key..."
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => setIsApiKeySet(true)}
                      disabled={!geminiApiKey.trim()}
                      size="sm"
                    >
                      Set API Key
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.isTyping ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing...</span>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-300 opacity-75">
                              <div className="text-xs">
                                <strong>Sources:</strong> {message.sources.join(', ')}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="mt-4 space-y-2">
              <div className="flex space-x-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your security findings, request remediation steps, or upload documents for analysis..."
                  className="flex-1 min-h-[60px] max-h-32"
                  disabled={!isApiKeySet}
                />
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading || !isApiKeySet}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !isApiKeySet}
                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.md,.pdf,.json,.yaml,.yml,.csv,.tf,.hcl,.py,.js,.ts,.sh"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l pl-4 space-y-4">
            {/* Knowledge Base Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Security Scan Results</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Loaded
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Prowler Findings</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Loaded
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Final Report</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Loaded
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Uploaded Documents</CardTitle>
                <CardDescription className="text-xs">
                  Additional documents for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {uploadedDocs.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uploadedDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{doc.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(doc.size)}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setInputMessage("What are the most critical security issues found in my scan?")}
                  disabled={!isApiKeySet}
                >
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Critical Issues
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setInputMessage("Provide remediation steps for all high-severity findings.")}
                  disabled={!isApiKeySet}
                >
                  <Shield className="h-3 w-3 mr-2" />
                  Remediation Guide
                </Button>
                <Button
                  variant="outline"
                  size="sm" 
                  className="w-full justify-start text-xs"
                  onClick={() => setInputMessage("Explain the compliance implications of these security findings.")}
                  disabled={!isApiKeySet}
                >
                  <FileText className="h-3 w-3 mr-2" />
                  Compliance Impact
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecurityChatbot;