import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Eye, MapPin, Users } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useCreateLead, useLeads } from '@/hooks/useLeads';
import { useStatuses } from '@/hooks/useStatuses';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useNavigate } from 'react-router-dom';

// Database field definitions with length limits
const DB_FIELDS = {
  book_title: { label: 'Book Title', required: true, type: 'text', maxLength: 255 },
  first_name: { label: 'First Name', required: false, type: 'text', maxLength: 100 },
  last_name: { label: 'Last Name', required: false, type: 'text', maxLength: 100 },
  author_name: { label: 'Author Name', required: false, type: 'text', maxLength: 255 },
  amazon_link: { label: 'Amazon Link', required: false, type: 'url', maxLength: null }, // No limit
  phone_number_1: { label: 'Primary Phone', required: false, type: 'phone', maxLength: 20 },
  phone_number_2: { label: 'Secondary Phone', required: false, type: 'phone', maxLength: 20 },
  primary_email: { label: 'Primary Email', required: false, type: 'email', maxLength: 255 },
  secondary_email: { label: 'Secondary Email', required: false, type: 'email', maxLength: 255 },
  author_bio: { label: 'Author Bio', required: false, type: 'text', maxLength: null }, // TEXT field, no limit
  publisher: { label: 'Publisher', required: false, type: 'text', maxLength: 255 },
  website: { label: 'Website', required: false, type: 'url', maxLength: 500 },
  state: { label: 'State', required: false, type: 'text', maxLength: 100 },
  country: { label: 'Country', required: false, type: 'text', maxLength: 100 },
  status_id: { label: 'Status', required: false, type: 'select', maxLength: null },
};

interface ParsedData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

interface FieldMapping {
  [csvColumn: string]: string;
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
  matchedWith?: string;
  matchedRow?: number;
}

// Helper function to truncate field values
const truncateField = (value: string, maxLength: number | null): string => {
  if (!value || maxLength === null) return value;
  if (value.length <= maxLength) return value;
  return value.substring(0, maxLength - 3) + '...';
};

const ImportLeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'upload' | 'mapping' | 'duplicates' | 'preview' | 'importing' | 'complete'>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState<number[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: number; skipped: number }>({ success: 0, errors: 0, skipped: 0 });
  const [skipValidation, setSkipValidation] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [assignedUserId, setAssignedUserId] = useState<string>('');

  const { user } = useAuth();
  const { data: statuses } = useStatuses();
  const { data: existingLeadsData } = useLeads({}, 1, 1000);
  const { users = [] } = useUsers();
  const createLead = useCreateLead();

  // Set default status when statuses are loaded
  useEffect(() => {
    if (statuses?.length && !selectedStatusId) {
      const defaultStatus = statuses.find(s => s.order_index === 1);
      if (defaultStatus) {
        setSelectedStatusId(defaultStatus.id);
      }
    }
  }, [statuses, selectedStatusId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      try {
        let parsed: ParsedData;

        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const result = Papa.parse(data as string, {
            header: false,
            skipEmptyLines: true,
          });
          
          parsed = {
            headers: result.data[0] as string[],
            rows: result.data.slice(1) as any[][],
            fileName: file.name,
          };
        } else {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          parsed = {
            headers: jsonData[0] as string[],
            rows: jsonData.slice(1) as any[][],
            fileName: file.name,
          };
        }

        setParsedData(parsed);
        setStep('mapping');
        
        // Auto-map fields
        const autoMapping: FieldMapping = {};
        parsed.headers.forEach((header) => {
          const normalizedHeader = header.toLowerCase().trim();
          
          // Direct field matches
          Object.entries(DB_FIELDS).forEach(([field, config]) => {
            if (normalizedHeader === config.label.toLowerCase() || normalizedHeader === field.toLowerCase()) {
              autoMapping[header] = field;
            }
          });
          
          // Special handling for first/last name fields
          if (normalizedHeader.includes('first') && normalizedHeader.includes('name')) {
            autoMapping[header] = 'first_name';
          }
          if (normalizedHeader.includes('last') && normalizedHeader.includes('name')) {
            autoMapping[header] = 'last_name';
          }
          if (normalizedHeader === 'name' || normalizedHeader === 'full name') {
            // Try to find additional first/last name columns before using as author_name
            const hasFirstName = parsed.headers.some(h => 
              h.toLowerCase().includes('first') && h.toLowerCase().includes('name')
            );
            const hasLastName = parsed.headers.some(h => 
              h.toLowerCase().includes('last') && h.toLowerCase().includes('name')
            );
            
            if (!hasFirstName && !hasLastName) {
              autoMapping[header] = 'author_name';
            }
          }
        });
        
        setFieldMapping(autoMapping);
      } catch (error) {
        console.error('Error parsing file:', error);
        // TODO: Show error message to user
      }
    };

    reader.readAsBinaryString(file);
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

  const validateData = () => {
    if (!parsedData) return false;

    const errors: ValidationError[] = [];
    
    // Check if either author_name OR (first_name AND last_name) are mapped
    const hasAuthorName = Object.values(fieldMapping).includes('author_name');
    const hasFirstName = Object.values(fieldMapping).includes('first_name');
    const hasLastName = Object.values(fieldMapping).includes('last_name');

    if (!hasAuthorName && (!hasFirstName || !hasLastName)) {
      errors.push({
        row: -1,
        field: 'author_name',
        message: 'Either "Author Name" or both "First Name" and "Last Name" must be mapped',
        value: null,
      });
    }

    // Check required book_title field
    const hasBookTitle = Object.values(fieldMapping).includes('book_title');
    if (!hasBookTitle) {
      errors.push({
        row: -1,
        field: 'book_title',
        message: 'Book Title is required',
        value: null,
      });
    }

    // Validate data in rows
    if (parsedData.rows.length > 0) {
      parsedData.rows.forEach((row, rowIndex) => {
        // Special handling for author name fields
        if (!hasAuthorName && hasFirstName && hasLastName) {
          const firstNameCol = Object.entries(fieldMapping).find(([_, val]) => val === 'first_name')?.[0];
          const lastNameCol = Object.entries(fieldMapping).find(([_, val]) => val === 'last_name')?.[0];
          
          if (firstNameCol && lastNameCol) {
            const firstName = row[parsedData.headers.indexOf(firstNameCol)];
            const lastName = row[parsedData.headers.indexOf(lastNameCol)];
            
            if (!firstName || !lastName) {
              errors.push({
                row: rowIndex + 1,
                field: 'name',
                message: 'Both First Name and Last Name are required',
                value: `${firstName || ''} ${lastName || ''}`.trim(),
              });
            }
          }
        }

        // Check book_title in each row
        if (hasBookTitle) {
          const bookTitleCol = Object.entries(fieldMapping).find(([_, val]) => val === 'book_title')?.[0];
          if (bookTitleCol) {
            const bookTitle = row[parsedData.headers.indexOf(bookTitleCol)];
            if (!bookTitle || bookTitle.toString().trim() === '') {
              errors.push({
                row: rowIndex + 1,
                field: 'book_title',
                message: 'Book Title is required',
                value: bookTitle,
              });
            }
          }
        }

        // Validate other fields
        Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
          const columnIndex = parsedData.headers.indexOf(csvColumn);
          const value = row[columnIndex];
          const fieldConfig = DB_FIELDS[dbField as keyof typeof DB_FIELDS];

          if (value && value.toString().trim() !== '') {
            const stringValue = value.toString().trim();
            
            // Check field length limits
            if (fieldConfig.maxLength && stringValue.length > fieldConfig.maxLength) {
              errors.push({
                row: rowIndex + 1,
                field: dbField,
                message: `${fieldConfig.label} exceeds ${fieldConfig.maxLength} characters (${stringValue.length} chars) - will be truncated`,
                value: stringValue.substring(0, 50) + (stringValue.length > 50 ? '...' : ''),
              });
            }

            if (fieldConfig.type === 'email' && !isValidEmail(stringValue)) {
              errors.push({
                row: rowIndex + 1,
                field: dbField,
                message: `Invalid email format`,
                value: stringValue,
              });
            }

            if (fieldConfig.type === 'url' && !isValidUrl(stringValue)) {
              errors.push({
                row: rowIndex + 1,
                field: dbField,
                message: `Invalid URL format`,
                value: stringValue,
              });
            }
          }
        });
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
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

      // Combine first_name and last_name into author_name if needed
      if (!mappedRow.author_name && mappedRow.first_name && mappedRow.last_name) {
        mappedRow.author_name = `${mappedRow.first_name} ${mappedRow.last_name}`.trim();
      }
      
      return mappedRow;
    });

    // Check for internal duplicates first
    for (let i = 0; i < mappedRows.length; i++) {
      for (let j = i + 1; j < mappedRows.length; j++) {
        const row1 = mappedRows[i];
        const row2 = mappedRows[j];
        const matchingFields: string[] = [];

        if (row1.author_name && row2.author_name && normalizeValue(row1.author_name) === normalizeValue(row2.author_name)) {
          matchingFields.push('Author Name');
        }
        if (row1.book_title && row2.book_title && normalizeValue(row1.book_title) === normalizeValue(row2.book_title)) {
          matchingFields.push('Book Title');
        }
        if (row1.phone_number_1 && row2.phone_number_1 && normalizeValue(row1.phone_number_1) === normalizeValue(row2.phone_number_1)) {
          matchingFields.push('Phone Number');
        }
        if (row1.primary_email && row2.primary_email && normalizeValue(row1.primary_email) === normalizeValue(row2.primary_email)) {
          matchingFields.push('Email');
        }

        if (matchingFields.length >= 2) {
          duplicatesList.push({
            row: row1._rowIndex,
            matchingFields,
            matchType: 'internal',
            matchedRow: row2._rowIndex,
          });
        }
      }
    }

    // Check against existing leads
    mappedRows.forEach((row) => {
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

        if (matchingFields.length >= 2) {
          duplicatesList.push({
            row: row._rowIndex,
            matchingFields,
            matchType: 'existing',
            matchedWith: `${existingLead.author_name} - ${existingLead.book_title}`,
          });
        }
      });
    });

    return duplicatesList;
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
    const isValid = validateData();
    
    if (!isValid && !skipValidation) {
      // If there are validation errors and skip is not enabled, stay on mapping step
      return;
    }

    const foundDuplicates = checkDuplicates();
    setDuplicates(foundDuplicates);
    setStep('duplicates');
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

  const getMappedPreviewData = () => {
    if (!parsedData) return [];
    
    return parsedData.rows.slice(0, 5).map((row, rowIndex) => {
      const mappedRow: any = { _rowIndex: rowIndex + 1 };
      
      Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
        const columnIndex = parsedData.headers.indexOf(csvColumn);
        mappedRow[dbField] = row[columnIndex] || '';
      });

      // Combine first_name and last_name into author_name if needed
      if (!mappedRow.author_name && mappedRow.first_name && mappedRow.last_name) {
        mappedRow.author_name = `${mappedRow.first_name} ${mappedRow.last_name}`.trim();
      }
      
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

    // Combine first_name and last_name into author_name if needed
    if (!mappedRow.author_name && mappedRow.first_name && mappedRow.last_name) {
      mappedRow.author_name = `${mappedRow.first_name} ${mappedRow.last_name}`.trim();
    }
    
    return mappedRow;
  };

  const handleImport = async () => {
    if (!parsedData || !user) return;

    setStep('importing');
    setImportProgress(0);

    // Use selected status or find default
    let statusToUse = selectedStatusId;
    if (!statusToUse && statuses?.length) {
      const defaultStatus = statuses.find(s => s.order_index === 1);
      statusToUse = defaultStatus?.id || '';
    }

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
          status_id: statusToUse,
        };

        // Add assigned user if selected
        if (assignedUserId && assignedUserId !== 'none') {
          leadData.assigned_to = assignedUserId;
        } else if (user?.role === 'sales') {
          // Auto-assign to sales agent if they are importing and no specific assignment
          leadData.assigned_to = user.id;
        }

        // Map the data
        Object.entries(fieldMapping).forEach(([csvColumn, dbField]) => {
          const columnIndex = parsedData.headers.indexOf(csvColumn);
          const value = row[columnIndex];
          
          if (value && value.toString().trim() !== '') {
            // Special handling for status field if it's mapped
            if (dbField === 'status_id') {
              // Try to find status by name
              const matchingStatus = statuses?.find(
                s => s.name.toLowerCase() === value.toString().toLowerCase().trim()
              );
              if (matchingStatus) {
                leadData[dbField] = matchingStatus.id;
              } else {
                // If no matching status found, use selected or default
                leadData[dbField] = statusToUse;
              }
            } else if (dbField === 'multiple_titles') {
              leadData[dbField] = value.toString().toLowerCase() === 'true';
            } else {
              leadData[dbField] = truncateField(value.toString().trim(), DB_FIELDS[dbField as keyof typeof DB_FIELDS].maxLength);
            }
          }
        });

        // Handle first_name and last_name
        if (!leadData.author_name && leadData.first_name && leadData.last_name) {
          leadData.author_name = `${leadData.first_name} ${leadData.last_name}`.trim();
        }

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

  const handleComplete = () => {
    navigate('/leads');
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Import Leads</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
      </div>
      
      <Tabs value={step} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload" disabled={step !== 'upload'}>Upload</TabsTrigger>
          <TabsTrigger value="mapping" disabled={step !== 'mapping'}>Mapping</TabsTrigger>
          <TabsTrigger value="duplicates" disabled={step !== 'duplicates'}>Duplicates</TabsTrigger>
          <TabsTrigger value="preview" disabled={step !== 'preview'}>Preview</TabsTrigger>
          <TabsTrigger value="importing" disabled={step !== 'importing' && step !== 'complete'}>Import</TabsTrigger>
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
                <CardTitle>Map Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parsedData.headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{header}</div>
                        <div className="text-sm text-gray-500">
                          Sample: {parsedData.rows[0]?.[index] || '-'}
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
                  <div className="space-y-4 mt-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="font-medium mb-2">Mapping Issues:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationErrors.map((error, index) => {
                            const isWarning = error.message.includes('will be truncated');
                            return (
                              <li key={index} className={`text-sm ${isWarning ? 'text-orange-700' : ''}`}>
                                {isWarning && '⚠️ '}
                                {error.row === -1 ? (
                                  error.message
                                ) : (
                                  `Row ${error.row}: ${error.message} (${error.value || 'empty'})`
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {validationErrors.some(e => e.message.includes('will be truncated')) && (
                          <div className="mt-2 text-sm text-orange-700">
                            ⚠️ Fields marked with warning will be automatically truncated to fit database limits.
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-center space-x-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Checkbox
                        id="skipValidation"
                        checked={skipValidation}
                        onCheckedChange={(checked) => setSkipValidation(checked as boolean)}
                      />
                      <label
                        htmlFor="skipValidation"
                        className="text-sm text-yellow-800 font-medium cursor-pointer"
                      >
                        Skip validation and proceed with import anyway
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <Button variant="outline" onClick={() => setStep('upload')}>
                    Back
                  </Button>
                  <Button onClick={handleCheckDuplicates}>
                    {skipValidation ? 'Proceed with Import' : 'Check for Duplicates'}
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
                                  <div className="font-medium">Author: {rowData.author_name}</div>
                                  <div className="text-gray-600">Book: {rowData.book_title}</div>
                                </div>
                                <div>
                                  <div className="text-gray-600">Email: {rowData.primary_email}</div>
                                  <div className="text-gray-600">Phone: {rowData.phone_number_1}</div>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Matching Fields:</span>{' '}
                                {duplicate.matchingFields.join(', ')}
                              </div>

                              {duplicate.matchType === 'existing' && (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Matches with:</span>{' '}
                                  {duplicate.matchedWith}
                                </div>
                              )}
                              {duplicate.matchType === 'internal' && (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">Matches with row:</span>{' '}
                                  {duplicate.matchedRow}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center">
                              <Checkbox
                                checked={isSkipped}
                                onCheckedChange={(checked) => handleSkipDuplicate(duplicate.row, checked as boolean)}
                              />
                              <label className="ml-2 text-sm font-medium">
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
              <CardTitle>Preview Import Data</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Import Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Status <span className="text-red-500">*</span>
                  </label>
                  <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status for imported leads" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses?.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to User <span className="text-gray-400">(Optional)</span>
                  </label>
                  <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user to assign leads to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No assignment</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                            {dbField === 'book_title' && row[dbField] ? (
                              <span title={row[dbField]}>
                                {row[dbField].length > 24 ? row[dbField].slice(0, 24) + '…' : row[dbField]}
                              </span>
                            ) : (
                              row[dbField] || '-'
                            )}
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

              {validationErrors.length > 0 && !skipValidation && (
                <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    There are validation issues with your data. You can go back to fix them or enable "Skip Validation" to proceed anyway.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep('duplicates')}>
                  Back to Duplicates
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!selectedStatusId}
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
    </div>
  );
};

export default ImportLeadsPage; 