'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { 
  Shield, 
  Eye, 
  Users, 
  Calendar, 
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/lib/i18n'

interface ConsentItem {
  id: string
  icon: typeof Shield
  title: string
  titleAr: string
  description: string
  descriptionAr: string
  required: boolean
}

const consentItems: ConsentItem[] = [
  {
    id: 'participation',
    icon: Users,
    title: 'Mentorship Participation',
    titleAr: 'المشاركة في الإرشاد',
    description: 'I agree to participate in mentorship activities on this platform',
    descriptionAr: 'أوافق على المشاركة في أنشطة الإرشاد على هذه المنصة',
    required: true,
  },
  {
    id: 'safeguarding',
    icon: Shield,
    title: 'Safeguarding',
    titleAr: 'الحماية',
    description: 'I understand that session notes may be reviewed by program administrators for safeguarding purposes',
    descriptionAr: 'أفهم أنه قد يتم مراجعة ملاحظات الجلسات من قبل مسؤولي البرنامج لأغراض الحماية',
    required: true,
  },
  {
    id: 'data',
    icon: Eye,
    title: 'Data Usage',
    titleAr: 'استخدام البيانات',
    description: 'I consent to the collection and processing of my data as described in the privacy policy',
    descriptionAr: 'أوافق على جمع ومعالجة بياناتي كما هو موضح في سياسة الخصوصية',
    required: true,
  },
]

interface ConsentStepProps {
  onSubmit: (data: { 
    consented: boolean
    dateOfBirth?: string
    guardianEmail?: string 
  }) => void
  isMinor?: boolean
  isLoading?: boolean
}

export function ConsentStep({ onSubmit, isMinor = false, isLoading = false }: ConsentStepProps) {
  const { locale, t, isRTL } = useI18n()
  const isArabic = locale === 'ar'

  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')

  const toggleConsent = (id: string) => {
    setConsents(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const allRequiredConsented = consentItems
    .filter(item => item.required)
    .every(item => consents[item.id])

  const handleSubmit = () => {
    onSubmit({
      consented: true,
      dateOfBirth: dateOfBirth || undefined,
      guardianEmail: isMinor ? guardianEmail : undefined,
    })
  }

  const isValid = allRequiredConsented && dateOfBirth && (!isMinor || guardianEmail)

  return (
    <div className="space-y-6">
      {/* Minor notice */}
      {isMinor && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-ms-blush/20 border border-ms-blush"
        >
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-ms-ember flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-ms-ink">
                {isArabic ? 'موافقة ولي الأمر مطلوبة' : 'Guardian Consent Required'}
              </h4>
              <p className="mt-1 text-sm text-ms-ink-muted">
                {isArabic
                  ? 'لأنك تحت سن 18، سنحتاج إلى موافقة ولي أمرك للمتابعة'
                  : 'Since you are under 18, we will need your guardian\'s consent to continue'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Date of birth */}
      <div className="space-y-2">
        <Label htmlFor="dob" className="text-ms-ink-muted">
          {isArabic ? 'تاريخ الميلاد' : 'Date of Birth'}
        </Label>
        <div className="relative">
          <Calendar className={`absolute top-3 h-4 w-4 text-ms-ink-subtle ${isRTL ? 'end-3' : 'start-3'}`} />
          <Input
            id="dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={`${isRTL ? 'pe-9 ps-3' : 'ps-9 pe-3'} bg-ms-surface-000 border-ms-line text-ms-ink focus:border-ms-ember focus:ring-ms-ember`}
            disabled={isLoading}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Guardian email for minors */}
      {isMinor && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <Label htmlFor="guardianEmail" className="text-ms-ink-muted">
            {isArabic ? 'البريد الإلكتروني لولي الأمر' : 'Guardian Email'}
          </Label>
          <Input
            id="guardianEmail"
            type="email"
            placeholder={isArabic ? 'parent@example.com' : 'parent@example.com'}
            value={guardianEmail}
            onChange={(e) => setGuardianEmail(e.target.value)}
            className="bg-ms-surface-000 border-ms-line text-ms-ink placeholder:text-ms-ink-subtle focus:border-ms-ember focus:ring-ms-ember"
            disabled={isLoading}
            dir="ltr"
          />
          <p className="text-xs text-ms-ink-subtle">
            {isArabic
              ? 'سنرسل طلب موافقة إلى ولي أمرك'
              : 'We will send a consent request to your guardian'}
          </p>
        </motion.div>
      )}

      {/* Consent checkboxes */}
      <div className="space-y-3 pt-4 border-t border-ms-line">
        <h3 className="font-semibold text-ms-ink">
          {isArabic ? 'أوافق على ما يلي:' : 'I agree to the following:'}
        </h3>

        {consentItems.map((item) => {
          const Icon = item.icon
          const isChecked = consents[item.id] || false

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleConsent(item.id)}
              className="w-full p-3 rounded-lg border border-ms-line hover:bg-ms-surface-200/50 text-start transition-colors"
              disabled={isLoading}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  flex-shrink-0 mt-0.5 size-5 rounded border-2 flex items-center justify-center transition-all
                  ${isChecked 
                    ? 'border-ms-ember bg-ms-ember' 
                    : 'border-ms-line'
                  }
                `}>
                  {isChecked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <Check className="size-3 text-ms-on-ember" />
                    </motion.div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-ms-ink-muted" />
                    <h4 className="font-medium text-ms-ink text-sm">
                      {isArabic ? item.titleAr : item.title}
                      {item.required && (
                        <span className="text-ms-ember ms-1">*</span>
                      )}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-xs text-ms-ink-muted">
                    {isArabic ? item.descriptionAr : item.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full bg-ms-ember text-ms-on-ember hover:bg-ms-ember/90 font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {isArabic ? 'جارٍ الحفظ...' : 'Saving...'}
          </>
        ) : isMinor ? (
          isArabic ? 'إرسال طلب الموافقة' : 'Send Consent Request'
        ) : (
          t.common.done
        )}
      </Button>
    </div>
  )
}
