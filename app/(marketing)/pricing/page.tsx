'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { CheckCircle2, Building2, GraduationCap, Users } from 'lucide-react'

export default function PricingPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  const features = [
    {
      text: isRTL ? 'تخطيط الأهداف والمراحل المدعوم بالذكاء الاصطناعي' : 'AI-powered goal planning & milestone tracking',
    },
    {
      text: isRTL ? 'جلسات تركيز مع أجندات منظمة' : 'Focus sessions with structured agendas',
    },
    {
      text: isRTL ? 'تتبع التقدم وقياس النتائج' : 'Progress tracking & outcome measurement',
    },
    {
      text: isRTL ? 'دورات البرنامج وإدارة الطلبات' : 'Program cycles & request management',
    },
    {
      text: isRTL ? 'ملاحظات الجلسات وتوثيق الموافقة' : 'Session notes & recording consent',
    },
    {
      text: isRTL ? 'التذكيرات والملخصات اليومية' : 'Reminders & daily digests',
    },
    {
      text: isRTL ? 'موافقة ولي الأمر للقاصرين' : 'Guardian consent for minors',
    },
    {
      text: isRTL ? 'لوحة تحكم المستشار والتقارير' : 'Counselor dashboard & reporting',
    },
    {
      text: isRTL ? 'إدارة المنظمة والبرنامج' : 'Organization & program management',
    },
    {
      text: isRTL ? 'دعم كامل للغة العربية وRTL' : 'Full Arabic/RTL support',
    },
  ]

  const tiers = [
    {
      name: isRTL ? 'مدرسة واحدة' : 'Single School',
      icon: Building2,
      description: isRTL 
        ? 'مثالي للمدارس الفردية التي ترغب في بدء برنامج إرشاد' 
        : 'Perfect for individual schools starting a mentorship program',
      features: [
        isRTL ? 'حتى 500 طالب' : 'Up to 500 students',
        isRTL ? 'مرشدون غير محدودين' : 'Unlimited mentors',
        isRTL ? 'برنامج واحد' : 'Single program',
        isRTL ? 'الميزات الأساسية' : 'Core features',
      ],
    },
    {
      name: isRTL ? 'جامعة' : 'University',
      icon: GraduationCap,
      description: isRTL 
        ? 'للجامعات مع أقسام ومدارس متعددة' 
        : 'For universities with multiple departments and schools',
      features: [
        isRTL ? 'طلاب غير محدودين' : 'Unlimited students',
        isRTL ? 'مرشدون غير محدودين' : 'Unlimited mentors',
        isRTL ? 'برامج متعددة' : 'Multiple programs',
        isRTL ? 'جميع الميزات' : 'All features',
        isRTL ? 'التقارير المتقدمة' : 'Advanced reporting',
      ],
      highlighted: true,
    },
    {
      name: isRTL ? 'المنطقة التعليمية' : 'District',
      icon: Users,
      description: isRTL 
        ? 'للمناطق التعليمية التي تدير مدارس متعددة' 
        : 'For districts managing multiple schools',
      features: [
        isRTL ? 'مدارس غير محدودة' : 'Unlimited schools',
        isRTL ? 'طلاب غير محدودين' : 'Unlimited students',
        isRTL ? 'إدارة مركزية' : 'Centralized management',
        isRTL ? 'جميع الميزات' : 'All features',
        isRTL ? 'دعم مخصص' : 'Dedicated support',
      ],
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-ms-shell to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isRTL ? 'الإرشاد للمدارس والجامعات' : 'Mentorship for Schools & Universities'}
            </h1>
            <p className="mt-6 text-lg text-ms-ink-muted">
              {isRTL
                ? 'يتشارك Mentorshape مع المؤسسات التعليمية لتقديم برامج إرشاد طلابية تركز على النتائج.'
                : 'Mentorshape partners with educational institutions to deliver outcome-focused student mentorship programs.'}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`p-6 ${tier.highlighted ? 'ring-2 ring-ms-orange shadow-lg' : ''}`}
              >
                {tier.highlighted && (
                  <div className="text-center mb-4">
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-ms-orange text-white rounded-full">
                      {isRTL ? 'الأكثر شيوعاً' : 'Most Popular'}
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-ms-orange/10 mb-4">
                    <tier.icon className="h-6 w-6 text-ms-orange" />
                  </div>
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  <p className="text-sm text-ms-ink-muted mt-2">{tier.description}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${tier.highlighted ? 'bg-ms-orange hover:bg-ms-orange/90' : ''}`}
                  variant={tier.highlighted ? 'default' : 'outline'}
                  asChild
                >
                  <Link href="mailto:hello@mentorshape.ai">
                    {isRTL ? 'تواصل معنا' : 'Contact Us'}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* All Features */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">
                {isRTL ? 'جميع الخطط تشمل' : 'All Plans Include'}
              </h2>
            </div>
            <Card className="p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">
            {isRTL ? 'هل أنت مستعد للبدء؟' : 'Ready to get started?'}
          </h2>
          <p className="text-ms-ink-muted mb-8 max-w-xl mx-auto">
            {isRTL
              ? 'تبدأ البرامج على مستوى المدرسة أو القسم. لا يوجد تسعير فردي للمستهلكين.'
              : 'Programs start at the school or department level. No individual consumer pricing.'}
          </p>
          <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90" asChild>
            <Link href="mailto:hello@mentorshape.ai">
              {isRTL ? 'تواصل معنا للحصول على الأسعار' : 'Contact Us for Pricing'}
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
