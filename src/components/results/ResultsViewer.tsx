
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  RefreshCw,
  CheckCircle,
  MessageCircle
} from 'lucide-react';
import SecurityChatbot from '@/components/security/SecurityChatbot';

interface ResultsViewerProps {
  results: any;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ results }) => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const downloadFinalSecurityReport = async () => {
    try {
      console.log('Attempting to download final security report...');
      
      // Create a direct link to download the file
      const link = document.createElement('a');
      link.href = 'http://localhost:3001/api/download-final-report';
      link.download = `final_security_report_${new Date().toISOString().split('T')[0]}.md`;
      
      // Append to body temporarily and trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download triggered successfully');
      
    } catch (error) {
      console.error('Error downloading final security report:', error);
      // Fallback to generated report on error
      downloadFallbackReport();
    }
  };

  const downloadFallbackReport = () => {
    const markdown = `# Cloud Security Assessment Report

## Executive Summary
${results.executiveSummary || 'Security assessment completed successfully.'}

## Summary Statistics
- **Total Findings:** ${results.summary?.totalFindings || 'N/A'}
- **Critical:** ${results.summary?.critical || 0}
- **High:** ${results.summary?.high || 0}
- **Medium:** ${results.summary?.medium || 0}
- **Low:** ${results.summary?.low || 0}

## Analysis Sources
- **Gemini AI Analysis:** Enhanced ChromaDB-powered security scanner
- **Prowler Security Findings:** Automated compliance and vulnerability scanner
- **Consolidation:** One-shot LLM analysis combining both sources

## Scan Output

\`\`\`
${results.rawOutput || results.output || 'Security scan completed successfully.'}
\`\`\`

---
*Fallback report generated on ${new Date().toISOString()}*
*For the complete consolidated analysis, please ensure the scan completed successfully.*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-assessment-fallback-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runNewAssessment = () => {
    // Clear localStorage (same as resetWorkflow in Index.tsx)
    localStorage.removeItem('cloudSecurityStep');
    localStorage.removeItem('cloudSecurityProvider');
    localStorage.removeItem('cloudSecurityAuth');
    localStorage.removeItem('cloudSecurityExportData');
    localStorage.removeItem('cloudSecurityScanResults');
    
    // Reload to reset the application state
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <span>Security Assessment Complete</span>
          </CardTitle>
          <CardDescription className="text-lg">
            Your comprehensive security analysis has been completed successfully. The consolidated report combines AI-powered analysis with automated compliance checking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 max-w-md mx-auto">
            <Button 
              onClick={downloadFinalSecurityReport}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Download className="h-5 w-5 mr-3" />
              Download Final Security Report
            </Button>
            <Button 
              onClick={() => setIsChatbotOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Chat with Security Assistant
            </Button>
            <Button 
              onClick={runNewAssessment}
              variant="outline" 
              className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
              size="lg"
            >
              <RefreshCw className="h-5 w-5 mr-3" />
              Run New Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Chatbot Modal */}
      <SecurityChatbot 
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        scanResults={results}
      />
    </div>
  );
};

export default ResultsViewer;
