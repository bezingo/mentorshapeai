'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { 
  GraduationCap, 
  Users, 
  Calendar, 
  Target, 
  Award, 
  Building2,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'

export default function LandingPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  const features = [
    {
      icon: Target,
      title: isRTL ? 'تحديد الأهداف بالذكاء الاصطناعي' : 'AI Goal Shaping',
      description: isRTL 
        ? 'حوّل طموحاتك إلى أهداف منظمة مع تخطيط مراحل مدعوم بالذكاء الاصطناعي'
        : 'Turn your aspirations into structured goals with AI-powered milestone planning.',
    },
    {
      icon: Users,
      title: isRTL ? 'مرشدون خبراء' : 'Expert Mentors',
      description: isRTL
        ? 'تواصل مع مرشدين يمكنهم توجيهك بناءً على أهدافك وتحدياتك المحددة'
        : 'Connect with mentors who can guide you based on your specific goals and challenges.',
    },
    {
      icon: Calendar,
      title: isRTL ? 'جلسات تركيز' : 'Focus Sessions',
      description: isRTL
        ? 'أجندات وملخصات منشأة بالذكاء الاصطناعي تساعدك على الاستفادة القصوى من كل جلسة'
        : 'AI-generated agendas and summaries help you make the most of every focus session.',
    },
    {
      icon: Award,
      title: isRTL ? 'تتبع التقدم' : 'Progress Tracking',
      description: isRTL
        ? 'تتبع المراحل والمتابعات واحصل على رؤى مدعومة بالذكاء الاصطناعي'
        : 'Track milestones, check-ins, and get AI-powered insights on your progress.',
    },
    {
      icon: GraduationCap,
      title: isRTL ? 'أربع فئات' : 'Four Categories',
      description: isRTL
        ? 'التمويل، المهنة، النمو الشخصي، وريادة الأعمال - ركز على ما يهمك'
        : 'Finance, career, personal growth, and entrepreneurship — focus on what matters to you.',
    },
    {
      icon: Building2,
      title: isRTL ? 'للمؤسسات التعليمية' : 'For Schools',
      description: isRTL
        ? 'مثالي للمدارس والجامعات التي تدير برامج إرشاد منظمة'
        : 'Perfect for schools and universities running structured mentorship programs.',
    },
  ]

  const benefits = [
    isRTL ? 'تتبع الأهداف والمراحل الذكية' : 'Smart goal and milestone tracking',
    isRTL ? 'جلسات تركيز منظمة مع أجندات' : 'Structured focus sessions with agendas',
    isRTL ? 'لوحات تحكم للمستشارين مع تقارير' : 'Counselor dashboards with reporting',
    isRTL ? 'تدابير السلامة ورعاية الصغار' : 'Safeguarding & minor protection',
    isRTL ? 'دعم كامل للعربية مع RTL' : 'Full Arabic/RTL support',
    isRTL ? 'ملفات شخصية عامة قابلة للمشاركة' : 'Shareable public profiles',
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ms-shell to-white py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ms-orange opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ms-orange"></span>
              </span>
              {isRTL ? 'برنامج الإرشاد المدرسي' : 'School Pilot Program'}
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              {isRTL ? (
                <>
                  حقق أهدافك مع
                  <span className="text-ms-orange"> إرشاد مدعوم بالذكاء الاصطناعي</span>
                </>
              ) : (
                <>
                  Achieve Your Goals with
                  <span className="text-ms-orange"> AI-Powered Mentoring</span>
                </>
              )}
            </h1>
            <p className="mt-6 text-lg leading-8 text-ms-ink-muted md:text-xl">
              {isRTL
                ? 'يساعدك Mentorshape على تحديد أهداف واضحة، والتواصل مع مرشدين خبراء، وتتبع تقدمك من خلال جلسات تركيز منظمة ورؤى موجهة بالذكاء الاصطناعي.'
                : 'Mentorshape helps you set clear goals, find expert mentors, and track your progress through structured focus sessions and AI-guided insights.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                  {isRTL ? 'ابدأ مجاناً' : 'Get Started Free'}
                  <ArrowRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
                </Button>
              </Link>
              <Link href="/for-schools">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  {isRTL ? 'للمدارس' : 'For Schools'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {isRTL ? 'كل ما تحتاجه لتحقيق أهدافك' : 'Everything you need to achieve your goals'}
            </h2>
            <p className="mt-4 text-lg text-ms-ink-muted">
              {isRTL
                ? 'من تحديد الأهداف إلى الإنجاز، يرشدك Mentorshape في كل خطوة'
                : 'From goal setting to completion, Mentorshape guides you every step of the way.'}
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ms-orange/10">
                  <feature.icon className="h-6 w-6 text-ms-orange" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-ms-ink-muted">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-ms-shell py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  {isRTL ? 'مصمم للمدارس والجامعات' : 'Built for Schools & Universities'}
                </h2>
                <p className="text-lg text-ms-ink-muted mb-8">
                  {isRTL
                    ? 'يتشارك Mentorshape مع المؤسسات التعليمية لتقديم برامج إرشاد طلابية تركز على النتائج.'
                    : 'Mentorshape partners with educational institutions to deliver outcome-focused student mentorship programs.'}
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-ms-ink">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <Card className="p-8 bg-white shadow-xl">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-ms-orange/20 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-ms-orange" />
                      </div>
                      <div>
                        <p className="font-semibold">{isRTL ? 'مدرستك هنا' : 'Your School Here'}</p>
                        <p className="text-sm text-ms-ink-muted">{isRTL ? 'برنامج الإرشاد' : 'Mentorship Program'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg bg-ms-shell p-4 text-center">
                        <p className="text-2xl font-bold text-ms-orange">150+</p>
                        <p className="text-xs text-ms-ink-muted">{isRTL ? 'مرشد نشط' : 'Active Mentors'}</p>
                      </div>
                      <div className="rounded-lg bg-ms-shell p-4 text-center">
                        <p className="text-2xl font-bold text-ms-orange">500+</p>
                        <p className="text-xs text-ms-ink-muted">{isRTL ? 'طالب' : 'Students'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{isRTL ? 'الأهداف المكتملة' : 'Goals Completed'}</span>
                        <span className="font-semibold">78%</span>
                      </div>
                      <div className="h-2 rounded-full bg-ms-shell overflow-hidden">
                        <div className="h-full w-[78%] rounded-full bg-ms-orange"></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              {isRTL ? 'هل أنت مستعد لتحويل برنامج الإرشاد الخاص بك؟' : 'Ready to transform your mentorship program?'}
            </h2>
            <p className="text-lg text-ms-ink-muted mb-8">
              {isRTL
                ? 'انضم إلى المدارس والجامعات الرائدة التي تستخدم Mentorshape لتقديم إرشاد ذو تأثير.'
                : 'Join leading schools and universities using Mentorshape to deliver impactful mentoring.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="mailto:hello@mentorshape.ai">
                <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                  {isRTL ? 'تواصل معنا' : 'Contact Us'}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  {isRTL ? 'عرض الأسعار' : 'View Pricing'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
