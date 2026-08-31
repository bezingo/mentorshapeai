'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

interface ParseError {
  row: number
  field: string
  message: string
  rawValue?: string
}

interface ParseWarning {
  row: number
  message: string
}

interface ParseStats {
  totalRows: number
  validRows: number
  menteeCount: number
  mentorCount: number
  duplicateEmails: string[]
}

interface ParseResult {
  success: boolean
  participants: Array<{
    email: string
    name: string
    role: string
    year_grade?: string | null
  }>
  errors: ParseError[]
  warnings: ParseWarning[]
  stats: ParseStats
}

interface ImportResult {
  imported: Array<{
    email: string
    name: string
    role: string
    status: string
  }>
  skipped: Array<{
    email: string
    reason: string
  }>
  stats: {
    total_processed: number
    imported_count: number
    skipped_count: number
    active_count: number
    pending_count: number
  }
}

export default function CSVImportPage() {
  const [csvContent, setCsvContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const text = await file.text()
    setCsvContent(text)
    setError(null)

    // Dry run to preview
    await previewCSV(text)
  }

  const previewCSV = async (content: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/counselor/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: content, dry_run: true }),
      })

      const json = await response.json()

      if (response.ok) {
        setParseResult(json.data.parse_result)
        setStep('preview')
      } else {
        setError(json.error?.message || 'Failed to parse CSV')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmImport = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/counselor/csv-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvContent, dry_run: false }),
      })

      const json = await response.json()

      if (response.ok) {
        setImportResult(json.data)
        setStep('complete')
      } else {
        setError(json.error?.message || 'Failed to import')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setIsLoading(false)
    }
  }

  const reset = () => {
    setCsvContent('')
    setFileName('')
    setParseResult(null)
    setImportResult(null)
    setError(null)
    setStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/counselor">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Participants</h1>
          <p className="text-muted-foreground">Upload a CSV file to add members to your organization</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 'upload' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file with participant information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CSV Format</CardTitle>
              <CardDescription>
                Your CSV should have these columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">email</Badge>
                  <span className="text-muted-foreground">Required - participant email</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">name</Badge>
                  <span className="text-muted-foreground">Required - full name</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">role</Badge>
                  <span className="text-muted-foreground">Required - mentee or mentor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">year_grade</Badge>
                  <span className="text-muted-foreground">Optional - grade/year</span>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <a href="/api/counselor/csv-import" download>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{parseResult.stats.totalRows}</div>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{parseResult.stats.validRows}</div>
                <p className="text-sm text-muted-foreground">Valid Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{parseResult.stats.menteeCount}</div>
                <p className="text-sm text-muted-foreground">Mentees</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{parseResult.stats.mentorCount}</div>
                <p className="text-sm text-muted-foreground">Mentors</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {parseResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{parseResult.errors.length} Error(s) Found</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {parseResult.errors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-sm">
                      Row {err.row}: {err.field} - {err.message}
                      {err.rawValue && <span className="text-muted-foreground"> (value: {err.rawValue})</span>}
                    </li>
                  ))}
                  {parseResult.errors.length > 10 && (
                    <li className="text-sm">...and {parseResult.errors.length - 10} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{parseResult.warnings.length} Warning(s)</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {parseResult.warnings.map((warn, i) => (
                    <li key={i} className="text-sm">Row {warn.row}: {warn.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {parseResult.participants.length} participants will be imported
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Email</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Role</th>
                      <th className="px-4 py-2 text-left font-medium">Year/Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parseResult.participants.slice(0, 20).map((p, i) => (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="px-4 py-2">{p.email}</td>
                        <td className="px-4 py-2">{p.name}</td>
                        <td className="px-4 py-2">
                          <Badge variant={p.role === 'mentor' ? 'secondary' : 'outline'}>
                            {p.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{p.year_grade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.participants.length > 20 && (
                  <div className="px-4 py-2 bg-muted text-sm text-muted-foreground">
                    ...and {parseResult.participants.length - 20} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button 
              onClick={confirmImport} 
              disabled={!parseResult.success || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Import ({parseResult.stats.validRows} participants)
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'complete' && importResult && (
        <div className="space-y-6">
          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-100">Import Complete</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-200">
              Successfully imported {importResult.stats.imported_count} participants
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{importResult.stats.total_processed}</div>
                <p className="text-sm text-muted-foreground">Processed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{importResult.stats.imported_count}</div>
                <p className="text-sm text-muted-foreground">Imported</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{importResult.stats.active_count}</div>
                <p className="text-sm text-muted-foreground">Active Now</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{importResult.stats.pending_count}</div>
                <p className="text-sm text-muted-foreground">Pending Invite</p>
              </CardContent>
            </Card>
          </div>

          {importResult.skipped.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skipped ({importResult.skipped.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importResult.skipped.map((s, i) => (
                    <div key={i} className="text-sm flex justify-between">
                      <span>{s.email}</span>
                      <span className="text-muted-foreground">{s.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4">
            <Button variant="outline" onClick={reset}>
              Import More
            </Button>
            <Button asChild>
              <Link href="/dashboard/counselor">
                <FileText className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
