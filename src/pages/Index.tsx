
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Cloud, Search, FileText, AlertTriangle, CheckCircle, Clock, Play } from 'lucide-react';
import AuthenticationCheck from '@/components/authentication/AuthenticationCheck';
import CloudProviderSelector from '@/components/cloud/CloudProviderSelector';
import ResourceExporter from '@/components/export/ResourceExporter';
import SecurityScanner from '@/components/security/SecurityScanner';
import ResultsViewer from '@/components/results/ResultsViewer';

export type CloudProvider = 'GCP' | 'AZURE' | null;
export type WorkflowStep = 'auth' | 'provider' | 'export' | 'scan' | 'results';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('auth');
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any>(null);

  const steps = [
    { id: 'auth', label: 'Authentication', icon: Shield, description: 'Verify cloud credentials' },
    { id: 'provider', label: 'Cloud Provider', icon: Cloud, description: 'Select GCP or Azure' },
    { id: 'export', label: 'Export Resources', icon: FileText, description: 'Export Terraform configuration' },
    { id: 'scan', label: 'Security Scan', icon: Search, description: 'Run Gemini & Prowler scans' },
    { id: 'results', label: 'Results', icon: AlertTriangle, description: 'View consolidated report' }
  ];

  const getStepStatus = (stepId: WorkflowStep) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const handleStepComplete = (step: WorkflowStep, data?: any) => {
    console.log(`Step ${step} completed with data:`, data);
    
    switch (step) {
      case 'auth':
        setIsAuthenticated(true);
        setCurrentStep('provider');
        break;
      case 'provider':
        setCloudProvider(data.provider);
        setCurrentStep('export');
        break;
      case 'export':
        setExportData(data);
        setCurrentStep('scan');
        break;
      case 'scan':
        setScanResults(data);
        setCurrentStep('results');
        break;
    }
  };

  const resetWorkflow = () => {
    setCurrentStep('auth');
    setCloudProvider(null);
    setIsAuthenticated(false);
    setExportData(null);
    setScanResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cloud Security Assessment</h1>
                <p className="text-gray-600">Terraform Export & Security Analysis Tool v1.0</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetWorkflow}>
              Reset Workflow
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Workflow Progress</CardTitle>
            <CardDescription>Follow these steps to complete your security assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id as WorkflowStep);
                const IconComponent = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`
                        relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors
                        ${status === 'completed' ? 'bg-green-100 border-green-500 text-green-600' : ''}
                        ${status === 'current' ? 'bg-blue-100 border-blue-500 text-blue-600 animate-pulse' : ''}
                        ${status === 'pending' ? 'bg-gray-100 border-gray-300 text-gray-400' : ''}
                      `}>
                        {status === 'completed' ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : status === 'current' ? (
                          <Play className="h-5 w-5" />
                        ) : (
                          <IconComponent className="h-5 w-5" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className={`text-sm font-medium ${
                          status === 'current' ? 'text-blue-600' : status === 'completed' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-400">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        getStepStatus(steps[index + 1].id as WorkflowStep) !== 'pending' ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <Card className="min-h-[600px]">
              <CardContent className="p-6">
                {currentStep === 'auth' && (
                  <AuthenticationCheck onComplete={(data) => handleStepComplete('auth', data)} />
                )}
                
                {currentStep === 'provider' && (
                  <CloudProviderSelector onComplete={(data) => handleStepComplete('provider', data)} />
                )}
                
                {currentStep === 'export' && cloudProvider && (
                  <ResourceExporter 
                    provider={cloudProvider} 
                    onComplete={(data) => handleStepComplete('export', data)} 
                  />
                )}
                
                {currentStep === 'scan' && exportData && (
                  <SecurityScanner 
                    exportData={exportData}
                    provider={cloudProvider}
                    onComplete={(data) => handleStepComplete('scan', data)} 
                  />
                )}
                
                {currentStep === 'results' && scanResults && (
                  <ResultsViewer results={scanResults} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Current Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Authentication</span>
                    <Badge variant={isAuthenticated ? "default" : "secondary"}>
                      {isAuthenticated ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cloud Provider</span>
                    <Badge variant={cloudProvider ? "default" : "secondary"}>
                      {cloudProvider || "Not Selected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Export Status</span>
                    <Badge variant={exportData ? "default" : "secondary"}>
                      {exportData ? "Complete" : "Pending"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Security Scan</span>
                    <Badge variant={scanResults ? "default" : "secondary"}>
                      {scanResults ? "Complete" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://cloud.google.com/sdk/docs/install', '_blank')}
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Install GCP CLI
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://docs.microsoft.com/en-us/cli/azure/install-azure-cli', '_blank')}
                  >
                    <Cloud className="h-4 w-4 mr-2" />
                    Install Azure CLI
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open('https://github.com/prowler-cloud/prowler', '_blank')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Install Prowler
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help & Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Help & Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">
                    This tool automates cloud security assessments by exporting Terraform configurations 
                    and running comprehensive security scans using Gemini AI and Prowler.
                  </p>
                  <div className="pt-2">
                    <h4 className="font-medium text-gray-900 mb-2">Key Features:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• GCP & Azure Terraform export</li>
                      <li>• Gemini AI security analysis</li>
                      <li>• Prowler security scanning</li>
                      <li>• Consolidated vulnerability reports</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
