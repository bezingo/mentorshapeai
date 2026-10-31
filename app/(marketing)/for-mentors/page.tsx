'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { 
  CheckCircle2, 
  Heart, 
  Target, 
  Calendar, 
  Clock, 
  MessageSquare,
  Award,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react'

export default function ForMentorsPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  const benefits = [
    {
      icon: Target,
      title: isRTL ? 'أهداف واضحة' : 'Clear Goals',
      description: isRTL
        ? 'ابدأ كل تعاون بأهداف منظمة ومراحل قابلة للقياس'
        : 'Start every collaboration with structured goals and measurable milestones',
    },
    {
      icon: Calendar,
      title: isRTL ? 'جلسات منظمة' : 'Structured Sessions',
      description: isRTL
        ? 'أجندات منشأة مسبقاً وملاحظات تجعل كل جلسة مثمرة'
        : 'Pre-generated agendas and notes make every session productive',
    },
    {
      icon: Clock,
      title: isRTL ? 'وقتك قيّم' : 'Your Time Matters',
      description: isRTL
        ? 'حدد سعتك وتوافرك - لا إفراط في الالتزام'
        : 'Set your capacity and availability — no overcommitting',
    },
    {
      icon: MessageSquare,
      title: isRTL ? 'تواصل فعال' : 'Effective Communication',
      description: isRTL
        ? 'ملاحظات مشتركة ومهام متابعة تبقي الجميع على المسار'
        : 'Shared notes and follow-up tasks keep everyone on track',
    },
    {
      icon: Award,
      title: isRTL ? 'تأثير مرئي' : 'Visible Impact',
      description: isRTL
        ? 'تتبع تقدم طلابك وشاهد أهدافهم تتحقق'
        : 'Track your mentees\' progress and see their goals come to fruition',
    },
    {
      icon: Heart,
      title: isRTL ? 'ردود الأفعال' : 'Meaningful Feedback',
      description: isRTL
        ? 'احصل على تقييمات من طلابك لتحسين تأثيرك باستمرار'
        : 'Get ratings from your mentees to continuously improve your impact',
    },
  ]

  const howItWorks = [
    {
      step: '1',
      title: isRTL ? 'انضم إلى برنامج مدرستك' : 'Join your school\'s program',
      description: isRTL
        ? 'قبول دعوة من مدرستك أو جامعتك للانضمام كمرشد'
        : 'Accept an invitation from your school or university to join as a mentor',
    },
    {
      step: '2',
      title: isRTL ? 'أكمل ملفك الشخصي' : 'Complete your profile',
      description: isRTL
        ? 'شارك خبرتك والمجالات التي يمكنك المساعدة فيها'
        : 'Share your expertise and the areas you can help with',
    },
    {
      step: '3',
      title: isRTL ? 'استقبل الطلبات' : 'Receive requests',
      description: isRTL
        ? 'يتصفح الطلاب ملفك ويقدمون طلبات للعمل معك'
        : 'Students browse your profile and submit requests to work with you',
    },
    {
      step: '4',
      title: isRTL ? 'ابدأ الإرشاد' : 'Start mentoring',
      description: isRTL
        ? 'بمجرد الموافقة، ابدأ بجدولة جلسات التركيز'
        : 'Once approved, start scheduling focus sessions',
    },
  ]

  const testimonialPlaceholder = {
    quote: isRTL
      ? '"Mentorshape يجعل الإرشاد منظماً ومجزياً. يمكنني رؤية التأثير الحقيقي على طلابي."'
      : '"Mentorshape makes mentoring structured and rewarding. I can see the real impact on my mentees."',
    author: isRTL ? 'مرشد جامعي' : 'University Mentor',
  }

  const categories = [
    { name: isRTL ? 'التمويل' : 'Finance', icon: '💰' },
    { name: isRTL ? 'المهنة' : 'Career', icon: '💼' },
    { name: isRTL ? 'النمو الشخصي' : 'Personal Growth', icon: '🌱' },
    { name: isRTL ? 'ريادة الأعمال' : 'Entrepreneurship', icon: '🚀' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-ms-shell to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange">
              <Heart className="h-4 w-4" />
              {isRTL ? 'للمرشدين' : 'For Mentors'}
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isRTL 
                ? 'شارك خبرتك. اصنع تأثيراً.' 
                : 'Share Your Expertise. Make an Impact.'}
            </h1>
            <p className="mt-6 text-lg text-ms-ink-muted">
              {isRTL
                ? 'انضم إلى برنامج إرشاد مدرستك وساعد الطلاب على تحقيق أهدافهم في التمويل، المهنة، النمو الشخصي، وريادة الأعمال.'
                : 'Join your school\'s mentorship program and help students achieve their goals in finance, career, personal growth, and entrepreneurship.'}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                  {isRTL ? 'ابدأ كمرشد' : 'Start as a Mentor'}
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

      {/* Categories */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-ms-ink-muted">
              {isRTL ? 'أرشد في المجالات التي تتميز فيها' : 'Mentor in the areas you excel at'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-ms-shell text-ms-ink font-medium"
              >
                <span className="text-xl">{category.icon}</span>
                {category.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'لماذا الإرشاد على Mentorshape' : 'Why Mentor on Mentorshape'}
            </h2>
            <p className="mt-4 text-ms-ink-muted">
              {isRTL
                ? 'نجعل الإرشاد فعالاً ومجزياً'
                : 'We make mentoring effective and rewarding'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ms-orange/10">
                  <benefit.icon className="h-6 w-6 text-ms-orange" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-ms-ink-muted">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'كيف يعمل' : 'How It Works'}
            </h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-ms-orange/20 -translate-x-1/2"></div>
              <div className="space-y-12">
                {howItWorks.map((item, index) => (
                  <div key={index} className={`flex gap-8 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                    <div className="hidden md:flex flex-1 justify-end">
                      {index % 2 === 0 && (
                        <Card className="p-6 max-w-sm bg-white">
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <p className="text-sm text-ms-ink-muted">{item.description}</p>
                        </Card>
                      )}
                    </div>
                    <div className="relative flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-ms-orange text-white flex items-center justify-center font-bold text-lg z-10 relative">
                        {item.step}
                      </div>
                    </div>
                    <div className="flex-1 md:hidden">
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm text-ms-ink-muted">{item.description}</p>
                    </div>
                    <div className="hidden md:flex flex-1">
                      {index % 2 === 1 && (
                        <Card className="p-6 max-w-sm bg-white">
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <p className="text-sm text-ms-ink-muted">{item.description}</p>
                        </Card>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Session Preview */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange mb-6">
                  <Sparkles className="h-4 w-4" />
                  {isRTL ? 'جلسات مدعومة بالذكاء الاصطناعي' : 'AI-Powered Sessions'}
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-6">
                  {isRTL ? 'كل جلسة منظمة للنجاح' : 'Every Session Structured for Success'}
                </h2>
                <p className="text-ms-ink-muted mb-6">
                  {isRTL
                    ? 'Mentorshape يوفر أجندات مسبقة، ملاحظات منظمة، ومهام متابعة لكل جلسة تركيز.'
                    : 'Mentorshape provides pre-built agendas, structured notes, and follow-up tasks for every focus session.'}
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'أجندات منشأة بالذكاء الاصطناعي بناءً على الأهداف' : 'AI-generated agendas based on goals'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'ملاحظات خاصة ومشتركة مع الطالب' : 'Private and shared notes with mentee'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'مهام ومتابعات واضحة' : 'Clear action items and follow-ups'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'تقييم متبادل بعد كل جلسة' : 'Mutual grading after each session'}</span>
                  </li>
                </ul>
              </div>
              <Card className="p-6 bg-white shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-ms-orange/20 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-ms-orange" />
                      </div>
                      <div>
                        <p className="font-semibold">{isRTL ? 'جلسة تركيز' : 'Focus Session'}</p>
                        <p className="text-sm text-ms-ink-muted">{isRTL ? '45 دقيقة' : '45 minutes'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {isRTL ? 'قادمة' : 'Upcoming'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ms-ink-muted mb-2">{isRTL ? 'الأجندة' : 'Agenda'}</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-ms-orange"></div>
                        {isRTL ? 'مراجعة التقدم في الهدف' : 'Review goal progress'}
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-ms-orange"></div>
                        {isRTL ? 'مناقشة التحديات الحالية' : 'Discuss current challenges'}
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-ms-orange"></div>
                        {isRTL ? 'تحديد الخطوات التالية' : 'Define next steps'}
                      </li>
                    </ul>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-ms-ink-muted mb-2">{isRTL ? 'الهدف' : 'Goal'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-2 py-1 bg-ms-shell rounded">{isRTL ? 'المهنة' : 'Career'}</span>
                      <span className="text-sm">{isRTL ? 'الحصول على وظيفة تدريب صيفي' : 'Land a summer internship'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Users className="h-12 w-12 text-ms-orange mx-auto mb-6" />
            <blockquote className="text-2xl font-medium mb-6">
              {testimonialPlaceholder.quote}
            </blockquote>
            <p className="text-ms-ink-muted">— {testimonialPlaceholder.author}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            {isRTL ? 'هل أنت مستعد لإحداث فرق؟' : 'Ready to make a difference?'}
          </h2>
          <p className="text-lg text-ms-ink-muted mb-8 max-w-2xl mx-auto">
            {isRTL
              ? 'انضم إلى برنامج إرشاد مدرستك وابدأ بمساعدة الطلاب على تحقيق أهدافهم.'
              : 'Join your school\'s mentorship program and start helping students achieve their goals.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="bg-ms-orange hover:bg-ms-orange/90 text-lg px-8">
                {isRTL ? 'ابدأ كمرشد' : 'Start as a Mentor'}
              </Button>
            </Link>
            <Link href="mailto:hello@mentorshape.ai">
              <Button size="lg" variant="outline" className="text-lg px-8">
                {isRTL ? 'أسئلة؟ تواصل معنا' : 'Questions? Contact Us'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
