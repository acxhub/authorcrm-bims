import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Eye, MapPin, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useDropzone } from 'react-dropzone';
import readXlsxFile from 'read-excel-file';
import Papa from 'papaparse';
import { useCreateLead, useLeads } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/hooks/useAuth';
import { getLeadDisplayName, getLeadBookTitleDisplay } from '@/lib/lead-display';

interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to DB field
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

interface DuplicateInfo {
  row: number;
  matchingFields: string[];
  matchType: 'existing' | 'internal';
  matchedWith?: string; // For existing leads
  matchedRow?: number; // For internal duplicates
}

// Database field definitions
const DB_FIELDS = {
  book_title: { label: 'Book Title', required: false, type: 'text' },
  author_name: { label: 'Author Name', required: true, type: 'text' },
  pen_name: { label: 'Pen Name', required: false, type: 'text' },
  amazon_link: { label: 'Amazon Link', required: false, type: 'url' },
  phone_number_1: { label: 'Home Phone', required: false, type: 'phone' },
  phone_number_2: { label: 'Mobile Phone', required: false, type: 'phone' },
  primary_email: { label: 'Primary Email', required: false, type: 'email' },
  secondary_email: { label: 'Secondary Email', required: false, type: 'email' },
  author_bio: { label: 'Author Bio', required: false, type: 'text' },
  publisher: { label: 'Publisher', required: false, type: 'text' },
  website: { label: 'Website', required: false, type: 'url' },
  state: { label: 'State', required: false, type: 'text' },
  country: { label: 'Country', required: false, type: 'text' },
  status_id: { label: 'Status', required: true, type: 'select' },
};

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  open,
  onOpenChange,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'duplicates' | 'preview' | 'importing' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState<number[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; skipped: number }>({ success: 0, errors: 0, skipped: 0 });

  const { user } = useAuth();
  const { data: statuses } = useStatuses();
  const { data: existingLeadsData } = useLeads({}, 1, 1000); // Get existing leads for duplicate checking
  const createLead = useCreateLead();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      let parsed: ParsedData;

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
        });

        parsed = {
          headers: result.data[0] as string[],
          rows: result.data.slice(1) as any[][],
          fileName: file.name,
        };
      } else {
        // Parse Excel using read-excel-file
        const rows = await readXlsxFile(file);
        const stringRows = rows.map(row => row.map(cell => cell != null ? String(cell) : ''));

        parsed = {
          headers: stringRows[0] as string[],
          rows: stringRows.slice(1) as any[][],
          fileName: file.name,
        };
      }

      setParsedData(parsed);
      setStep('mapping');

      // Auto-map obvious fields
      const autoMapping: FieldMapping = {};
      parsed.headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim();

        // Auto-mapping logic
        if (lowerHeader.includes('book') && lowerHeader.includes('title')) {
          autoMapping[header] = 'book_title';
        } else if (
          (lowerHeader.includes('pen') && lowerHeader.includes('name')) ||
          lowerHeader === 'pseudonym' ||
          lowerHeader === 'pen_name' ||
          lowerHeader === 'alias'
        ) {
          autoMapping[header] = 'pen_name';
        } else if (lowerHeader.includes('author') && lowerHeader.includes('name')) {
          autoMapping[header] = 'author_name';
        } else if (lowerHeader.includes('email') && lowerHeader.includes('primary')) {
          autoMapping[header] = 'primary_email';
        } else if (lowerHeader.includes('email') && !lowerHeader.includes('secondary')) {
          autoMapping[header] = 'primary_email';
        } else if (lowerHeader.includes('phone') && lowerHeader.includes('primary')) {
          autoMapping[header] = 'phone_number_1';
        } else if (lowerHeader.includes('phone') && !lowerHeader.includes('secondary')) {
          autoMapping[header] = 'phone_number_1';
        } else if (lowerHeader.includes('amazon')) {
          autoMapping[header] = 'amazon_link';
        } else if (lowerHeader.includes('website')) {
          autoMapping[header] = 'website';
        } else if (lowerHeader.includes('publisher')) {
          autoMapping[header] = 'publisher';
        } else if (lowerHeader.includes('bio')) {
          autoMapping[header] = 'author_bio';
        } else if (lowerHeader.includes('state')) {
          autoMapping[header] = 'state';
        } else if (lowerHeader.includes('country')) {
          autoMapping[header] = 'country';
        }
      });

      setFieldMapping(autoMapping);
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format and try again.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const normalizeValue = (value: any): string => {
    if (!value) return '';
    return value.toString().toLowerCase().trim();
  };

  const checkDuplicates = () => {
    if (!parsedData || !existingLeadsData?.data) return [];

    const duplicatesList: DuplicateInfo[] = [];
    const existingLeads = existingLeadsData.data;

    // Get mapped data for duplicate checking
    const mappedRows = parsedData.rows.map((row, rowIndex) => {
      const mappedRow: any = { _rowIndex: rowIndex + 1 };
      
      Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
        const columnIndex = parsedData.headers.indexOf(csvColumn);
        mappedRow[dbField] = row[columnIndex] || '';
      });
      
      return mappedRow;
    });

    // Check against existing leads in database
    mappedRows.forEach((row, index) => {
      const rowData = {
        author_name: normalizeValue(row.author_name),
        book_title: normalizeValue(row.book_title),
        phone: normalizeValue(row.phone_number_1),
        email: normalizeValue(row.primary_email),
      };

      existingLeads.forEach((existingLead) => {
        const existingData = {
          author_name: normalizeValue(existingLead.author_name),
          book_title: normalizeValue(existingLead.book_title),
          phone: normalizeValue(existingLead.phone_number_1),
          email: normalizeValue(existingLead.primary_email),
        };

        const matchingFields: string[] = [];
        
        if (rowData.author_name && existingData.author_name && rowData.author_name === existingData.author_name) {
          matchingFields.push('Author Name');
        }
        if (rowData.book_title && existingData.book_title && rowData.book_title === existingData.book_title) {
          matchingFields.push('Book Title');
        }
        if (rowData.phone && existingData.phone && rowData.phone === existingData.phone) {
          matchingFields.push('Phone Number');
        }
        if (rowData.email && existingData.email && rowData.email === existingData.email) {
          matchingFields.push('Email');
        }

        // If 2 or more fields match, it's a duplicate
        if (matchingFields.length >= 2) {
          duplicatesList.push({
            row: index + 1,
            matchingFields,
            matchType: 'existing',
            matchedWith: `${getLeadDisplayName(existingLead)} - ${getLeadBookTitleDisplay(existingLead.book_title)}`,
          });
        }
      });
    });

    // Check for internal duplicates within the import file
    for (let i = 0; i < mappedRows.length; i++) {
      for (let j = i + 1; j < mappedRows.length; j++) {
        const row1Data = {
          author_name: normalizeValue(mappedRows[i].author_name),
          book_title: normalizeValue(mappedRows[i].book_title),
          phone: normalizeValue(mappedRows[i].phone_number_1),
          email: normalizeValue(mappedRows[i].primary_email),
        };

        const row2Data = {
          author_name: normalizeValue(mappedRows[j].author_name),
          book_title: normalizeValue(mappedRows[j].book_title),
          phone: normalizeValue(mappedRows[j].phone_number_1),
          email: normalizeValue(mappedRows[j].primary_email),
        };

        const matchingFields: string[] = [];
        
        if (row1Data.author_name && row2Data.author_name && row1Data.author_name === row2Data.author_name) {
          matchingFields.push('Author Name');
        }
        if (row1Data.book_title && row2Data.book_title && row1Data.book_title === row2Data.book_title) {
          matchingFields.push('Book Title');
        }
        if (row1Data.phone && row2Data.phone && row1Data.phone === row2Data.phone) {
          matchingFields.push('Phone Number');
        }
        if (row1Data.email && row2Data.email && row1Data.email === row2Data.email) {
          matchingFields.push('Email');
        }

        // If 2 or more fields match, both rows are duplicates
        if (matchingFields.length >= 2) {
          // Add duplicate info for both rows
          duplicatesList.push({
            row: i + 1,
            matchingFields,
            matchType: 'internal',
            matchedRow: j + 1,
          });
          duplicatesList.push({
            row: j + 1,
            matchingFields,
            matchType: 'internal',
            matchedRow: i + 1,
          });
        }
      }
    }

    // Remove duplicate entries (same row reported multiple times)
    const uniqueDuplicates = duplicatesList.filter((dup, index, arr) => 
      arr.findIndex(d => d.row === dup.row && d.matchType === dup.matchType) === index
    );

    return uniqueDuplicates;
  };

  const validateData = () => {
    if (!parsedData) return false;

    const errors: ValidationError[] = [];
    const requiredFields = Object.entries(DB_FIELDS).filter(([_, config]) => config.required);
    
    // Check if required fields are mapped
    for (const [field, config] of requiredFields) {
      const isMapped = Object.values(fieldMapping).includes(field);
      if (!isMapped) {
        errors.push({
          row: -1,
          field,
          message: `Required field "${config.label}" is not mapped`,
          value: null,
        });
      }
    }

    // Validate data in rows
    parsedData.rows.forEach((row, rowIndex) => {
      Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
        const columnIndex = parsedData.headers.indexOf(csvColumn);
        const value = row[columnIndex];
        const fieldConfig = DB_FIELDS[dbField as keyof typeof DB_FIELDS];

        if (fieldConfig.required && (!value || value.toString().trim() === '')) {
          errors.push({
            row: rowIndex + 1,
            field: dbField,
            message: `${fieldConfig.label} is required`,
            value,
          });
        }

        if (value && fieldConfig.type === 'email' && !isValidEmail(value.toString())) {
          errors.push({
            row: rowIndex + 1,
            field: dbField,
            message: `Invalid email format`,
            value,
          });
        }

        if (value && fieldConfig.type === 'url' && !isValidUrl(value.toString())) {
          errors.push({
            row: rowIndex + 1,
            field: dbField,
            message: `Invalid URL format`,
            value,
          });
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleCheckDuplicates = () => {
    if (validateData()) {
      const foundDuplicates = checkDuplicates();
      setDuplicates(foundDuplicates);
      setStep('duplicates');
    }
  };

  const handleSkipDuplicate = (rowNumber: number, skip: boolean) => {
    if (skip) {
      setSkipDuplicates(prev => [...prev, rowNumber]);
    } else {
      setSkipDuplicates(prev => prev.filter(r => r !== rowNumber));
    }
  };

  const handlePreview = () => {
    setStep('preview');
  };

  const handleImport = async () => {
    if (!parsedData || !user) return;

    setStep('importing');
    setImportProgress(0);

    const defaultStatus = statuses?.find(s => s.order_index === 1);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < parsedData.rows.length; i++) {
      const row = parsedData.rows[i];
      const rowNumber = i + 1;
      
      // Skip if marked as duplicate
      if (skipDuplicates.includes(rowNumber)) {
        skippedCount++;
        setImportProgress(((i + 1) / parsedData.rows.length) * 100);
        continue;
      }
      
      try {
        const leadData: any = {
          created_by: user.id,
          status_id: defaultStatus?.id || '',
        };

        // Map the data
        Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
          const columnIndex = parsedData.headers.indexOf(csvColumn);
          const value = row[columnIndex];
          
          if (value && value.toString().trim() !== '') {
            if (dbField === 'multiple_titles') {
              leadData[dbField] = value.toString().toLowerCase() === 'true';
            } else {
              leadData[dbField] = value.toString().trim();
            }
          }
        });

        await createLead.mutateAsync(leadData);
        successCount++;
      } catch (error) {
        console.error(`Error importing row ${i + 1}:`, error);
        errorCount++;
      }

      setImportProgress(((i + 1) / parsedData.rows.length) * 100);
    }

    setImportResults({ success: successCount, errors: errorCount, skipped: skippedCount });
    setStep('complete');
  };

  const handleClose = () => {
    setStep('upload');
    setParsedData(null);
    setFieldMapping({});
    setValidationErrors([]);
    setDuplicates([]);
    setSkipDuplicates([]);
    setImportProgress(0);
    setImportResults({ success: 0, errors: 0, skipped: 0 });
    onOpenChange(false);
  };

  const handleComplete = () => {
    handleClose();
    onImportComplete?.();
  };

  const getMappedPreviewData = () => {
    if (!parsedData) return [];
    
    return parsedData.rows.slice(0, 5).map((row, rowIndex) => {
      const mappedRow: any = { _rowIndex: rowIndex + 1 };
      
      Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
        const columnIndex = parsedData.headers.indexOf(csvColumn);
        mappedRow[dbField] = row[columnIndex] || '';
      });
      
      return mappedRow;
    });
  };

  const getRowData = (rowIndex: number) => {
    if (!parsedData) return {};
    
    const row = parsedData.rows[rowIndex - 1];
    const mappedRow: any = {};
    
    Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
      const columnIndex = parsedData.headers.indexOf(csvColumn);
      mappedRow[dbField] = row[columnIndex] || '';
    });
    
    return mappedRow;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads
          </DialogTitle>
        </DialogHeader>

        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" disabled={step !== 'upload'}>Upload</TabsTrigger>
            <TabsTrigger value="mapping" disabled={step !== 'mapping'}>Mapping</TabsTrigger>
            <TabsTrigger value="duplicates" disabled={step !== 'duplicates'}>Duplicates</TabsTrigger>
            <TabsTrigger value="preview" disabled={step !== 'preview'}>Preview</TabsTrigger>
            <TabsTrigger value="importing" disabled={step !== 'importing'}>Import</TabsTrigger>
            <TabsTrigger value="complete" disabled={step !== 'complete'}>Complete</TabsTrigger>
          </TabsList>

          {/* Upload Step */}
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV or Excel File</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  {isDragActive ? (
                    <p className="text-blue-600">Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">Drag & drop your file here</p>
                      <p className="text-gray-500 mb-4">or click to browse</p>
                      <p className="text-sm text-gray-400">Supports CSV, XLS, XLSX files</p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-2">Supported Fields:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(DB_FIELDS).map(([field, config]) => (
                      <Badge key={field} variant={config.required ? 'default' : 'secondary'}>
                        {config.label} {config.required && '*'}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">* Required fields</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mapping Step */}
          <TabsContent value="mapping" className="space-y-4">
            {parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Map Columns - {parsedData.fileName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {parsedData.headers.map((header, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{header}</div>
                          <div className="text-sm text-gray-500">
                            Sample: {parsedData.rows[0]?.[index] || 'No data'}
                          </div>
                        </div>
                        <div className="w-64">
                          <Select
                            value={fieldMapping[header] || ''}
                            onValueChange={(value) => {
                              setFieldMapping(prev => ({
                                ...prev,
                                [header]: value === 'none' ? '' : value,
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Don't import</SelectItem>
                              {Object.entries(DB_FIELDS).map(([field, config]) => (
                                <SelectItem key={field} value={field}>
                                  {config.label} {config.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {validationErrors.length > 0 && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Mapping Issues:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.filter(e => e.row === -1).map((error, index) => (
                            <li key={index} className="text-sm">{error.message}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      Back
                    </Button>
                    <Button onClick={handleCheckDuplicates}>
                      Check for Duplicates
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Duplicates Step */}
          <TabsContent value="duplicates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Duplicate Check Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {duplicates.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <div className="text-lg font-medium text-green-700 mb-2">
                      No Duplicates Found!
                    </div>
                    <div className="text-sm text-gray-500">
                      All {parsedData?.rows.length || 0} leads are unique and ready to import.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">
                          {duplicates.length} potential duplicate(s) found
                        </div>
                        <div className="text-sm">
                          Duplicates are identified when 2 or more fields match: Author Name, Book Title, Phone Number, or Email.
                          You can choose to skip these rows during import.
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      {duplicates.map((duplicate, index) => {
                        const rowData = getRowData(duplicate.row);
                        const isSkipped = skipDuplicates.includes(duplicate.row);
                        
                        return (
                          <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="destructive">Row {duplicate.row}</Badge>
                                  <Badge variant="outline">
                                    {duplicate.matchType === 'existing' ? 'Existing Lead' : 'Internal Duplicate'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <div className="font-medium">Author: {getLeadDisplayName(rowData)}</div>
                                    <div className="text-gray-600">
                                      Book: {getLeadBookTitleDisplay(rowData.book_title)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-600">Email: {rowData.primary_email}</div>
                                    <div className="text-gray-600">Phone: {rowData.phone_number_1}</div>
                                  </div>
                                </div>

                                <div className="mb-2">
                                  <div className="text-sm font-medium text-red-700">
                                    Matching Fields: {duplicate.matchingFields.join(', ')}
                                  </div>
                                  {duplicate.matchType === 'existing' && duplicate.matchedWith && (
                                    <div className="text-sm text-gray-600">
                                      Matches existing lead: {duplicate.matchedWith}
                                    </div>
                                  )}
                                  {duplicate.matchType === 'internal' && duplicate.matchedRow && (
                                    <div className="text-sm text-gray-600">
                                      Matches row {duplicate.matchedRow} in this import
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSkipped}
                                  onCheckedChange={(checked) => 
                                    handleSkipDuplicate(duplicate.row, checked as boolean)
                                  }
                                />
                                <label className="text-sm font-medium">
                                  Skip this row
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{skipDuplicates.length}</span> of{' '}
                        <span className="font-medium">{duplicates.length}</span> duplicates will be skipped
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSkipDuplicates(duplicates.map(d => d.row))}
                        >
                          Skip All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSkipDuplicates([])}
                        >
                          Import All
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    Back to Mapping
                  </Button>
                  <Button onClick={handlePreview}>
                    Continue to Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Step */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview Import Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">
                        {validationErrors.length} validation error(s) found:
                      </div>
                      <div className="max-h-32 overflow-y-auto">
                        {validationErrors.slice(0, 10).map((error, index) => (
                          <div key={index} className="text-sm">
                            Row {error.row}: {error.message}
                          </div>
                        ))}
                        {validationErrors.length > 10 && (
                          <div className="text-sm text-gray-500">
                            ...and {validationErrors.length - 10} more errors
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        {Object.entries(fieldMapping).map(([csvColumn, dbField]) => (
                          <TableHead key={csvColumn}>
                            {DB_FIELDS[dbField as keyof typeof DB_FIELDS]?.label || dbField}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMappedPreviewData().map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row._rowIndex}</TableCell>
                          {Object.entries(fieldMapping).map(([csvColumn, dbField]) => (
                            <TableCell key={csvColumn}>
                              {row[dbField] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-sm text-gray-500 mt-2">
                  Showing first 5 rows of {parsedData?.rows.length || 0} total rows
                  {skipDuplicates.length > 0 && (
                    <span className="text-orange-600">
                      {' '}({skipDuplicates.length} duplicates will be skipped)
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep('duplicates')}>
                    Back to Duplicates
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={validationErrors.length > 0}
                  >
                    Import {(parsedData?.rows.length || 0) - skipDuplicates.length} Leads
                    {skipDuplicates.length > 0 && (
                      <span className="text-xs ml-1">
                        (Skip {skipDuplicates.length})
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Importing Step */}
          <TabsContent value="importing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importing Leads...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={importProgress} className="w-full" />
                  <div className="text-center">
                    <div className="text-lg font-medium">
                      {Math.round(importProgress)}% Complete
                    </div>
                    <div className="text-sm text-gray-500">
                      Processing {(parsedData?.rows.length || 0) - skipDuplicates.length} leads...
                      {skipDuplicates.length > 0 && (
                        <span className="text-orange-600">
                          {' '}(Skipping {skipDuplicates.length} duplicates)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complete Step */}
          <TabsContent value="complete" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {importResults.success}
                      </div>
                      <div className="text-sm text-green-700">Successfully Imported</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {importResults.skipped}
                      </div>
                      <div className="text-sm text-orange-700">Skipped (Duplicates)</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {importResults.errors}
                      </div>
                      <div className="text-sm text-red-700">Errors</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleComplete} className="flex-1">
                      Done
                    </Button>
                    <Button variant="outline" onClick={() => setStep('upload')}>
                      Import More
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}; 