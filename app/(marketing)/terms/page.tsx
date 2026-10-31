'use client'

import { useI18n } from '@/lib/i18n'
import { Card } from '@/components/ui/card'

export default function TermsPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-center">
            {isRTL ? 'شروط الخدمة' : 'Terms of Service'}
          </h1>
          <Card className="p-8 prose prose-slate max-w-none">
            <p className="text-ms-ink-muted mb-6">
              {isRTL 
                ? 'آخر تحديث: أكتوبر 2025' 
                : 'Last updated: October 2025'}
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '1. قبول الشروط' : '1. Acceptance of Terms'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'باستخدام Mentorshape، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا.'
                : 'By using Mentorshape, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '2. وصف الخدمة' : '2. Service Description'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'Mentorshape هي منصة إرشاد مدعومة بالذكاء الاصطناعي مصممة للمدارس والجامعات. نحن نوفر أدوات لتحديد الأهداف، جدولة الجلسات، تتبع التقدم، وإدارة برامج الإرشاد.'
                : 'Mentorshape is an AI-powered mentorship platform designed for schools and universities. We provide tools for goal setting, session scheduling, progress tracking, and mentorship program management.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '3. أهلية المستخدم' : '3. User Eligibility'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'Mentorshape متاح فقط من خلال برامج الإرشاد المدرسية والجامعية. لا يتوفر تسجيل فردي للمستهلكين. يجب أن يكون المستخدمون:'
                : 'Mentorshape is available only through school and university mentorship programs. Individual consumer registration is not available. Users must be:'}
            </p>
            <ul className="list-disc list-inside text-ms-ink-muted mb-4 space-y-2">
              <li>{isRTL ? 'مدعوون من مؤسسة تعليمية مشاركة' : 'Invited by a participating educational institution'}</li>
              <li>{isRTL ? 'في السن القانوني أو لديهم موافقة ولي الأمر' : 'Of legal age or have guardian consent'}</li>
              <li>{isRTL ? 'قادرين على الالتزام بهذه الشروط' : 'Able to comply with these terms'}</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '4. سلوك المستخدم' : '4. User Conduct'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'يوافق المستخدمون على:'
                : 'Users agree to:'}
            </p>
            <ul className="list-disc list-inside text-ms-ink-muted mb-4 space-y-2">
              <li>{isRTL ? 'استخدام المنصة لأغراض الإرشاد المشروعة فقط' : 'Use the platform only for legitimate mentorship purposes'}</li>
              <li>{isRTL ? 'احترام خصوصية وحدود المستخدمين الآخرين' : 'Respect the privacy and boundaries of other users'}</li>
              <li>{isRTL ? 'الإبلاغ عن أي مخاوف تتعلق بالسلامة فوراً' : 'Report any safety concerns immediately'}</li>
              <li>{isRTL ? 'عدم إساءة استخدام ميزات المنصة' : 'Not misuse platform features'}</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '5. الحماية والسلامة' : '5. Safeguarding & Safety'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'نأخذ سلامة الطلاب على محمل الجد. قد يكون لدى المستشارين إمكانية الوصول إلى ملاحظات الجلسات لأغراض الحماية. التسجيل يتطلب الموافقة وغير متاح عند وجود قاصرين.'
                : 'We take student safety seriously. Counselors may have access to session notes for safeguarding purposes. Recording requires consent and is not available when minors are present.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '6. الملكية الفكرية' : '6. Intellectual Property'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'Mentorshape والمحتوى والميزات والوظائف المرتبطة بها هي ملك لـ Mentorshape ومحمية بموجب قوانين حقوق النشر الدولية.'
                : 'Mentorshape and its original content, features, and functionality are owned by Mentorshape and are protected by international copyright laws.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '7. إنهاء الخدمة' : '7. Termination'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'قد ننهي أو نعلق وصولك فوراً، دون إشعار مسبق، لأي سبب، بما في ذلك انتهاك هذه الشروط.'
                : 'We may terminate or suspend your access immediately, without prior notice, for any reason, including breach of these Terms.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '8. اتصل بنا' : '8. Contact Us'}
            </h2>
            <p className="text-ms-ink-muted">
              {isRTL
                ? 'إذا كانت لديك أسئلة حول هذه الشروط، يرجى الاتصال بنا على:'
                : 'If you have questions about these terms, please contact us at:'}
              {' '}
              <a href="mailto:hello@mentorshape.ai" className="text-ms-orange hover:underline">
                hello@mentorshape.ai
              </a>
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
