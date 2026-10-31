'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { 
  CheckCircle2, 
  GraduationCap, 
  Users, 
  Target, 
  Shield, 
  Calendar,
  BarChart3,
  FileText,
  UserCheck,
  ArrowRight
} from 'lucide-react'

export default function ForSchoolsPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  const challenges = [
    {
      problem: isRTL ? 'صعوبة تتبع أهداف ونتائج الإرشاد' : 'Hard to track mentorship goals and outcomes',
      solution: isRTL ? 'تتبع الأهداف المدعوم بالذكاء الاصطناعي مع مراحل قابلة للقياس' : 'AI-powered goal tracking with measurable milestones',
    },
    {
      problem: isRTL ? 'عدم وجود هيكل للجلسات' : 'No structure for sessions',
      solution: isRTL ? 'جلسات تركيز مع أجندات منظمة وملاحظات' : 'Focus sessions with structured agendas and notes',
    },
    {
      problem: isRTL ? 'مخاوف سلامة الطلاب' : 'Student safety concerns',
      solution: isRTL ? 'حماية مدمجة وموافقة ولي الأمر للقاصرين' : 'Built-in safeguarding and guardian consent for minors',
    },
    {
      problem: isRTL ? 'تقارير يدوية مرهقة' : 'Manual reporting is tedious',
      solution: isRTL ? 'لوحات تحكم مستشارين مع تقارير تلقائية' : 'Counselor dashboards with automated reports',
    },
  ]

  const features = [
    {
      icon: Target,
      title: isRTL ? 'تحديد الأهداف الذكية' : 'Smart Goal Setting',
      description: isRTL 
        ? 'يحدد الطلاب أهدافاً في أربع فئات: التمويل، المهنة، النمو الشخصي، وريادة الأعمال'
        : 'Students set goals in four categories: finance, career, personal growth, and entrepreneurship',
    },
    {
      icon: Calendar,
      title: isRTL ? 'دورات البرنامج' : 'Program Cycles',
      description: isRTL
        ? 'أنشئ دورات إرشاد منظمة مع مواعيد نهائية للطلبات وحدود قصوى'
        : 'Create structured mentorship cycles with request deadlines and caps',
    },
    {
      icon: Users,
      title: isRTL ? 'طلبات المرشدين' : 'Mentor Requests',
      description: isRTL
        ? 'يتصفح الطلاب المرشدين ويقدمون طلبات تمر عبر المستشارين للموافقة'
        : 'Students browse mentors and submit requests that go through counselors for approval',
    },
    {
      icon: FileText,
      title: isRTL ? 'ملاحظات الجلسات' : 'Session Notes',
      description: isRTL
        ? 'ملاحظات خاصة ومشتركة مع أنواع: عام، تحضير، مهمة، متابعة'
        : 'Private and shared notes with types: general, preparation, action item, follow-up',
    },
    {
      icon: Shield,
      title: isRTL ? 'حماية الطلاب' : 'Student Safety',
      description: isRTL
        ? 'حماية مدمجة، موافقة التسجيل، وموافقة ولي الأمر للقاصرين'
        : 'Built-in safeguarding, recording consent, and guardian consent for minors',
    },
    {
      icon: BarChart3,
      title: isRTL ? 'لوحة تحكم المستشار' : 'Counselor Dashboard',
      description: isRTL
        ? 'عرض جميع التعاونات والجلسات والتقدم في لوحة تحكم واحدة'
        : 'View all collaborations, sessions, and progress in one dashboard',
    },
  ]

  const steps = [
    {
      number: '1',
      title: isRTL ? 'إعداد منظمتك' : 'Set up your organization',
      description: isRTL
        ? 'أنشئ مدرستك أو جامعتك، حدد النطاقات، وادعُ الموظفين'
        : 'Create your school or university, set domains, and invite staff',
    },
    {
      number: '2',
      title: isRTL ? 'أنشئ دورة برنامج' : 'Create a program cycle',
      description: isRTL
        ? 'حدد التواريخ والمواعيد النهائية وحدود الطلبات لكل دورة إرشاد'
        : 'Set dates, deadlines, and request limits for each mentorship cycle',
    },
    {
      number: '3',
      title: isRTL ? 'دعوة المرشدين والطلاب' : 'Invite mentors & students',
      description: isRTL
        ? 'أرسل دعوات بالبريد الإلكتروني أو شارك روابط الانضمام للتسجيل'
        : 'Send email invites or share join links for registration',
    },
    {
      number: '4',
      title: isRTL ? 'مطابقة ومراقبة' : 'Match & monitor',
      description: isRTL
        ? 'راجع طلبات الطلاب، وافق على التعاونات، وتتبع التقدم'
        : 'Review student requests, approve collaborations, and track progress',
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-ms-shell to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange">
              <GraduationCap className="h-4 w-4" />
              {isRTL ? 'للمؤسسات التعليمية' : 'For Educational Institutions'}
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isRTL 
                ? 'إرشاد منظم. نتائج قابلة للقياس.' 
                : 'Structured Mentorship. Measurable Outcomes.'}
            </h1>
            <p className="mt-6 text-lg text-ms-ink-muted">
              {isRTL
                ? 'يساعد Mentorshape المدارس والجامعات على تشغيل برامج إرشاد فعالة مع تتبع الأهداف، جلسات منظمة، ورؤى قابلة للتنفيذ.'
                : 'Mentorshape helps schools and universities run effective mentorship programs with goal tracking, structured sessions, and actionable insights.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="mailto:hello@mentorshape.ai">
                <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                  {isRTL ? 'جدول عرض توضيحي' : 'Schedule a Demo'}
                  <ArrowRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-5 w-5`} />
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

      {/* Challenges & Solutions */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'من التحديات إلى الحلول' : 'From Challenges to Solutions'}
            </h2>
          </div>
          <div className="max-w-4xl mx-auto grid gap-6">
            {challenges.map((item, index) => (
              <Card key={index} className="p-6">
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-lg">✕</span>
                    </div>
                    <p className="text-ms-ink-muted">{item.problem}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="font-medium">{item.solution}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'ميزات مصممة للمدارس' : 'Features Built for Schools'}
            </h2>
            <p className="mt-4 text-ms-ink-muted">
              {isRTL
                ? 'كل ما تحتاجه لتشغيل برنامج إرشاد ناجح'
                : 'Everything you need to run a successful mentorship program'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-white">
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

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'كيف يعمل' : 'How It Works'}
            </h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-ms-orange text-white flex items-center justify-center font-bold">
                      {step.number}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-ms-ink-muted">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 mb-6">
                  <Shield className="h-4 w-4" />
                  {isRTL ? 'السلامة أولاً' : 'Safety First'}
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-6">
                  {isRTL ? 'حماية مدمجة' : 'Built-in Safeguarding'}
                </h2>
                <p className="text-ms-ink-muted mb-6">
                  {isRTL
                    ? 'Mentorshape يأخذ سلامة الطلاب على محمل الجد. تم بناء المنصة مع ميزات حماية شاملة.'
                    : 'Mentorshape takes student safety seriously. The platform is built with comprehensive safeguarding features.'}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <UserCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'موافقة ولي الأمر مطلوبة للقاصرين' : 'Guardian consent required for minors'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'موافقة التسجيل من الطرفين قبل التسجيل' : 'Recording consent from both parties before recording'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'لا تسجيل عند وجود قاصر في الجلسة' : 'No recording when a minor is in the session'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'إمكانية وصول المستشار لملاحظات الجلسات' : 'Counselor access to session notes'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'نظام الإبلاغ عن المخاوف' : 'Concern reporting system'}</span>
                  </li>
                </ul>
              </div>
              <Card className="p-6 bg-white">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                    <Shield className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">
                        {isRTL ? 'حماية مفعّلة' : 'Safeguarding Enabled'}
                      </p>
                      <p className="text-sm text-green-600">
                        {isRTL ? 'جميع الجلسات مراقبة' : 'All sessions monitored'}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-ms-shell">
                    <p className="text-sm text-ms-ink-muted mb-2">
                      {isRTL ? 'حالة موافقة ولي الأمر' : 'Guardian Consent Status'}
                    </p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">{isRTL ? 'تمت الموافقة' : 'Approved'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            {isRTL ? 'هل أنت مستعد لتحويل برنامج الإرشاد الخاص بك؟' : 'Ready to transform your mentorship program?'}
          </h2>
          <p className="text-lg text-ms-ink-muted mb-8 max-w-2xl mx-auto">
            {isRTL
              ? 'جدول عرضاً توضيحياً لترى كيف يمكن لـ Mentorshape مساعدة مدرستك على تقديم إرشاد ذو تأثير.'
              : 'Schedule a demo to see how Mentorshape can help your school deliver impactful mentoring.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="mailto:hello@mentorshape.ai">
              <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                {isRTL ? 'جدول عرض توضيحي' : 'Schedule a Demo'}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                {isRTL ? 'عرض الأسعار' : 'View Pricing'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
