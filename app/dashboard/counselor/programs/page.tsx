'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  GraduationCap,
  Plus,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Program {
  id: string
  name: string
  description: string | null
  term: string | null
  academic_year: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  max_mentees_per_mentor: number
  participants: { count: number }[]
  matches: { count: number }[]
}

export default function ProgramsPage() {
  const { locale } = useI18n()
  const isArabic = locale === 'ar'

  const [programs, setPrograms] = useState<Program[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    term: '',
    academic_year: '',
    max_mentees_per_mentor: 3,
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  async function fetchPrograms() {
    try {
      const response = await fetch('/api/counselor/programs')
      if (response.ok) {
        const json = await response.json()
        setPrograms(json.data || [])
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const response = await fetch('/api/counselor/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setDialogOpen(false)
        setFormData({ name: '', description: '', term: '', academic_year: '', max_mentees_per_mentor: 3 })
        fetchPrograms()
      }
    } catch (error) {
      console.error('Error creating program:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/counselor">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-ms-ink">
              {isArabic ? 'البرامج' : 'Programmes'}
            </h1>
            <p className="text-ms-ink-muted">
              {isArabic ? 'إدارة برامج الإرشاد' : 'Manage mentoring programmes'}
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-ms-ember hover:bg-ms-ember/90">
              <Plus className="size-4 me-2" />
              {isArabic ? 'برنامج جديد' : 'New Programme'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isArabic ? 'إنشاء برنامج جديد' : 'Create New Programme'}</DialogTitle>
              <DialogDescription>
                {isArabic ? 'أضف برنامج إرشاد جديد لمؤسستك' : 'Add a new mentoring programme for your organization'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProgram} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{isArabic ? 'اسم البرنامج' : 'Programme Name'}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{isArabic ? 'الوصف' : 'Description'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="term">{isArabic ? 'الفصل' : 'Term'}</Label>
                  <Input
                    id="term"
                    value={formData.term}
                    onChange={(e) => setFormData(prev => ({ ...prev, term: e.target.value }))}
                    placeholder={isArabic ? 'مثال: خريف 2026' : 'e.g., Fall 2026'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">{isArabic ? 'العام الدراسي' : 'Academic Year'}</Label>
                  <Input
                    id="year"
                    value={formData.academic_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="2026-2027"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">{isArabic ? 'الحد الأقصى للمتعلمين لكل مرشد' : 'Max mentees per mentor'}</Label>
                <Input
                  id="max"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_mentees_per_mentor}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_mentees_per_mentor: parseInt(e.target.value) || 3 }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={isCreating || !formData.name} className="bg-ms-ember hover:bg-ms-ember/90">
                  {isCreating && <Loader2 className="size-4 animate-spin me-2" />}
                  {isArabic ? 'إنشاء' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-ms-ink-subtle" />
        </div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="size-12 mx-auto mb-4 text-ms-ink-subtle" />
            <h3 className="text-lg font-semibold mb-2">
              {isArabic ? 'لا توجد برامج' : 'No programmes yet'}
            </h3>
            <p className="text-ms-ink-muted mb-4">
              {isArabic ? 'أنشئ برنامج الإرشاد الأول' : 'Create your first mentoring programme'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const participantCount = program.participants?.[0]?.count || 0
            const matchCount = program.matches?.[0]?.count || 0

            return (
              <Card key={program.id} className="hover:border-ms-ember/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{program.name}</CardTitle>
                      {(program.term || program.academic_year) && (
                        <CardDescription>
                          {program.term && <span>{program.term}</span>}
                          {program.term && program.academic_year && ' • '}
                          {program.academic_year && <span>{program.academic_year}</span>}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={program.is_active ? 'default' : 'secondary'}>
                      {program.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {program.description && (
                    <p className="text-sm text-ms-ink-muted line-clamp-2">{program.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-ms-ink-muted">
                      <Users className="size-4" />
                      <span>{participantCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-ms-ink-muted">
                      <UserCheck className="size-4" />
                      <span>{matchCount} {isArabic ? 'أزواج' : 'pairs'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/counselor/programs/${program.id}/matches`}>
                        {isArabic ? 'المطابقات' : 'Matches'}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="flex-1">
                      <Link href={`/dashboard/counselor/programs/${program.id}`}>
                        {isArabic ? 'التفاصيل' : 'Details'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
