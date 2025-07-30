
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface ResultsViewerProps {
  results: any;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ results }) => {

  const generateMarkdownReport = () => {
    const markdown = `# Cloud Security Assessment Report

## Executive Summary
${results.executiveSummary || 'Security assessment completed successfully.'}

## Summary Statistics
- **Total Findings:** ${results.summary.totalFindings}
- **Critical:** ${results.summary.critical}
- **High:** ${results.summary.high}
- **Medium:** ${results.summary.medium}
- **Low:** ${results.summary.low}

## Analysis Sources
- **Gemini AI Findings:** ${results.summary.geminiFindings || 0}
- **Prowler Security Findings:** ${results.summary.prowlerFindings || 0}
- **Overlapping Findings:** ${results.summary.overlappingFindings || 0}

## Detailed Findings

${results.findings.map((finding: any, index: number) => `
### Finding ${index + 1}: ${finding.title}

- **Severity:** ${finding.severity}
- **Source:** ${finding.source}
- **Description:** ${finding.description}
- **Affected Resources:** ${finding.affectedResources?.join(', ') || 'N/A'}
- **Remediation:** ${finding.remediation}

---
`).join('')}

## Raw Scan Output

\`\`\`
${results.rawOutput || 'No raw output available'}
\`\`\`

---
*Report generated on ${new Date().toISOString()}*
`;

    return markdown;
  };

  const downloadMarkdownReport = () => {
    const markdown = generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-assessment-${new Date().toISOString().split('T')[0]}.md`;
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
            Your cloud security assessment has been completed successfully. You can now download the consolidated report or run a new assessment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 max-w-md mx-auto">
            <Button 
              onClick={downloadMarkdownReport}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Download className="h-5 w-5 mr-3" />
              Download Markdown Report
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
    </div>
  );
};

export default ResultsViewer;
