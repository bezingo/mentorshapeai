'use client'

import { useI18n } from '@/lib/i18n'
import { Card } from '@/components/ui/card'

export default function PrivacyPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-8 text-center">
            {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </h1>
          <Card className="p-8 prose prose-slate max-w-none">
            <p className="text-ms-ink-muted mb-6">
              {isRTL 
                ? 'آخر تحديث: أكتوبر 2025' 
                : 'Last updated: October 2025'}
            </p>
            
            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '1. مقدمة' : '1. Introduction'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'Mentorshape ("نحن"، "لنا"، أو "خاصتنا") تحترم خصوصيتك وتلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيف نجمع ونستخدم ونحمي معلوماتك عند استخدام منصتنا.'
                : 'Mentorshape ("we," "us," or "our") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information when you use our platform.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '2. البيانات التي نجمعها' : '2. Data We Collect'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'نجمع المعلومات التي تقدمها مباشرة لنا، بما في ذلك:'
                : 'We collect information you provide directly to us, including:'}
            </p>
            <ul className="list-disc list-inside text-ms-ink-muted mb-4 space-y-2">
              <li>{isRTL ? 'معلومات الحساب (الاسم، البريد الإلكتروني)' : 'Account information (name, email)'}</li>
              <li>{isRTL ? 'معلومات الملف الشخصي (السيرة الذاتية، المنطقة الزمنية)' : 'Profile information (bio, timezone)'}</li>
              <li>{isRTL ? 'بيانات الأهداف والجلسات' : 'Goals and session data'}</li>
              <li>{isRTL ? 'انتماءات المنظمة' : 'Organization affiliations'}</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '3. كيف نستخدم بياناتك' : '3. How We Use Your Data'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'نستخدم بياناتك لـ:'
                : 'We use your data to:'}
            </p>
            <ul className="list-disc list-inside text-ms-ink-muted mb-4 space-y-2">
              <li>{isRTL ? 'تقديم وصيانة خدماتنا' : 'Provide and maintain our services'}</li>
              <li>{isRTL ? 'تسهيل علاقات الإرشاد' : 'Facilitate mentorship relationships'}</li>
              <li>{isRTL ? 'إرسال الإشعارات والتحديثات' : 'Send notifications and updates'}</li>
              <li>{isRTL ? 'تحسين منصتنا' : 'Improve our platform'}</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '4. حماية البيانات' : '4. Data Protection'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'نطبق إجراءات أمنية مناسبة لحماية بياناتك الشخصية من الوصول غير المصرح به أو التغيير أو الكشف أو التدمير.'
                : 'We implement appropriate security measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '5. حماية القاصرين' : '5. Minor Protection'}
            </h2>
            <p className="text-ms-ink-muted mb-4">
              {isRTL
                ? 'بالنسبة للمستخدمين الذين تقل أعمارهم عن 18 عامًا، نطلب موافقة ولي الأمر قبل المشاركة في أنشطة الإرشاد. التسجيل غير مسموح به عند وجود قاصر في الجلسة.'
                : 'For users under 18 years old, we require guardian consent before participating in mentorship activities. Recording is not permitted when a minor is in the session.'}
            </p>

            <h2 className="text-xl font-semibold mt-8 mb-4">
              {isRTL ? '6. اتصل بنا' : '6. Contact Us'}
            </h2>
            <p className="text-ms-ink-muted">
              {isRTL
                ? 'إذا كانت لديك أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على:'
                : 'If you have questions about this privacy policy, please contact us at:'}
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
