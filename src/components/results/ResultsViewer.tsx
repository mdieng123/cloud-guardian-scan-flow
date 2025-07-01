
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface ResultsViewerProps {
  results: any;
}

const ResultsViewer: React.FC<ResultsViewerProps> = ({ results }) => {
  const [selectedFinding, setSelectedFinding] = useState<any>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertCircle className="h-4 w-4" />;
      case 'LOW': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'gemini': return <Badge variant="outline" className="text-xs">Gemini AI</Badge>;
      case 'prowler': return <Badge variant="outline" className="text-xs">Prowler</Badge>;
      case 'both': return <Badge className="text-xs bg-purple-100 text-purple-800">Both Tools</Badge>;
      default: return <Badge variant="secondary" className="text-xs">{source}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Security Assessment Results</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Comprehensive security analysis of your cloud infrastructure
        </p>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Executive Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm leading-relaxed">
              {results.executiveSummary}
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{results.summary.totalFindings}</div>
              <div className="text-sm text-gray-600">Total Findings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{results.summary.critical}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{results.summary.high}</div>
              <div className="text-sm text-gray-600">High</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{results.summary.medium}</div>
              <div className="text-sm text-gray-600">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{results.summary.low}</div>
              <div className="text-sm text-gray-600">Low</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Findings */}
      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="critical" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>Critical ({results.summary.critical})</span>
          </TabsTrigger>
          <TabsTrigger value="high" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>High ({results.summary.high})</span>
          </TabsTrigger>
          <TabsTrigger value="medium" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Medium ({results.summary.medium})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>All Findings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical" className="space-y-4">
          {results.findings
            .filter((f: any) => f.severity === 'CRITICAL')
            .map((finding: any) => (
              <FindingCard key={finding.id} finding={finding} getSeverityColor={getSeverityColor} getSeverityIcon={getSeverityIcon} getSourceBadge={getSourceBadge} />
            ))}
        </TabsContent>

        <TabsContent value="high" className="space-y-4">
          {results.findings
            .filter((f: any) => f.severity === 'HIGH')
            .map((finding: any) => (
              <FindingCard key={finding.id} finding={finding} getSeverityColor={getSeverityColor} getSeverityIcon={getSeverityIcon} getSourceBadge={getSourceBadge} />
            ))}
        </TabsContent>

        <TabsContent value="medium" className="space-y-4">
          {results.findings
            .filter((f: any) => f.severity === 'MEDIUM')
            .map((finding: any) => (
              <FindingCard key={finding.id} finding={finding} getSeverityColor={getSeverityColor} getSeverityIcon={getSeverityIcon} getSourceBadge={getSourceBadge} />
            ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {results.findings.map((finding: any) => (
            <FindingCard key={finding.id} finding={finding} getSeverityColor={getSeverityColor} getSeverityIcon={getSeverityIcon} getSourceBadge={getSourceBadge} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 pt-6">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report (PDF)
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report (JSON)
        </Button>
        <Button onClick={() => window.location.reload()}>
          Run New Assessment
        </Button>
      </div>
    </div>
  );
};

const FindingCard: React.FC<{
  finding: any;
  getSeverityColor: (severity: string) => string;
  getSeverityIcon: (severity: string) => React.ReactNode;
  getSourceBadge: (source: string) => React.ReactNode;
}> = ({ finding, getSeverityColor, getSeverityIcon, getSourceBadge }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <Badge className={`${getSeverityColor(finding.severity)} border`}>
                <div className="flex items-center space-x-1">
                  {getSeverityIcon(finding.severity)}
                  <span>{finding.severity}</span>
                </div>
              </Badge>
              {getSourceBadge(finding.source)}
            </div>
            <CardTitle className="text-lg">{finding.title}</CardTitle>
            <CardDescription className="mt-1">{finding.description}</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Affected Resources</h4>
              <div className="flex flex-wrap gap-2">
                {finding.affectedResources.map((resource: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {resource}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Remediation</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">{finding.remediation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ResultsViewer;
