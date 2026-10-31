'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { 
  Target, 
  Heart, 
  Shield, 
  Globe,
  Sparkles,
  GraduationCap,
  ArrowRight
} from 'lucide-react'

export default function AboutPage() {
  const { locale } = useI18n()
  const isRTL = locale === 'ar'

  const values = [
    {
      icon: Target,
      title: isRTL ? 'التركيز على النتائج' : 'Outcome-Focused',
      description: isRTL
        ? 'نؤمن بأن الإرشاد يجب أن يؤدي إلى تقدم قابل للقياس، وليس مجرد محادثات'
        : 'We believe mentorship should lead to measurable progress, not just conversations',
    },
    {
      icon: Heart,
      title: isRTL ? 'الإنسان أولاً' : 'Human-First',
      description: isRTL
        ? 'التكنولوجيا تدعم العلاقات البشرية، لا تستبدلها'
        : 'Technology supports human relationships, it doesn\'t replace them',
    },
    {
      icon: Shield,
      title: isRTL ? 'السلامة والثقة' : 'Safety & Trust',
      description: isRTL
        ? 'حماية الطلاب والحفاظ على بيئة آمنة هي أولويتنا القصوى'
        : 'Protecting students and maintaining a safe environment is our top priority',
    },
    {
      icon: Globe,
      title: isRTL ? 'وصول عالمي' : 'Global Access',
      description: isRTL
        ? 'دعم كامل للعربية والإنجليزية لخدمة المدارس في جميع أنحاء العالم'
        : 'Full Arabic and English support to serve schools around the world',
    },
  ]

  const timeline = [
    {
      year: '2024',
      title: isRTL ? 'الانطلاق' : 'Launch',
      description: isRTL
        ? 'بدأنا Mentorshape بهدف واحد: جعل الإرشاد فعالاً وقابلاً للقياس'
        : 'Started Mentorshape with one goal: make mentorship effective and measurable',
    },
    {
      year: '2025',
      title: isRTL ? 'البرنامج التجريبي للمدارس' : 'School Pilot',
      description: isRTL
        ? 'إطلاق برنامجنا التجريبي للمدارس مع دورات البرنامج وحماية مدمجة'
        : 'Launching our school pilot program with program cycles and built-in safeguarding',
    },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-ms-shell to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {isRTL 
                ? 'نبني مستقبل الإرشاد' 
                : 'Building the Future of Mentorship'}
            </h1>
            <p className="mt-6 text-lg text-ms-ink-muted max-w-2xl mx-auto">
              {isRTL
                ? 'Mentorshape هي منصة إرشاد مدعومة بالذكاء الاصطناعي تساعد المدارس والجامعات على تقديم برامج إرشاد تركز على النتائج.'
                : 'Mentorshape is an AI-powered mentorship platform helping schools and universities deliver outcome-focused mentorship programs.'}
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange mb-6">
                  <Sparkles className="h-4 w-4" />
                  {isRTL ? 'مهمتنا' : 'Our Mission'}
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-6">
                  {isRTL 
                    ? 'جعل الإرشاد الفعال متاحاً لكل طالب' 
                    : 'Make effective mentorship accessible to every student'}
                </h2>
                <p className="text-ms-ink-muted mb-4">
                  {isRTL
                    ? 'نحن نؤمن بأن كل طالب يستحق الوصول إلى إرشاد عالي الجودة. ومع ذلك، تفتقر العديد من برامج الإرشاد إلى الهيكل، مما يجعل من الصعب قياس النتائج وتحسينها.'
                    : 'We believe every student deserves access to high-quality mentorship. Yet, many mentorship programs lack structure, making it hard to measure and improve outcomes.'}
                </p>
                <p className="text-ms-ink-muted">
                  {isRTL
                    ? 'Mentorshape يجمع بين الذكاء الاصطناعي والهيكل المدروس لمساعدة المدارس على تقديم إرشاد ذو تأثير حقيقي على حياة الطلاب.'
                    : 'Mentorshape combines AI and thoughtful structure to help schools deliver mentorship that has a real impact on students\' lives.'}
                </p>
              </div>
              <Card className="p-8 bg-ms-shell border-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-ms-orange flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">M</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">Mentorshape</p>
                      <p className="text-ms-ink-muted">
                        {isRTL ? 'شكّل مستقبلك' : 'Shape your future'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 border-t">
                    <p className="text-sm text-ms-ink-muted mb-4">
                      {isRTL ? 'فئات الأهداف' : 'Goal Categories'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="px-3 py-2 bg-white rounded-lg text-sm text-center">
                        💰 {isRTL ? 'التمويل' : 'Finance'}
                      </div>
                      <div className="px-3 py-2 bg-white rounded-lg text-sm text-center">
                        💼 {isRTL ? 'المهنة' : 'Career'}
                      </div>
                      <div className="px-3 py-2 bg-white rounded-lg text-sm text-center">
                        🌱 {isRTL ? 'النمو الشخصي' : 'Personal Growth'}
                      </div>
                      <div className="px-3 py-2 bg-white rounded-lg text-sm text-center">
                        🚀 {isRTL ? 'ريادة الأعمال' : 'Entrepreneurship'}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'قيمنا' : 'Our Values'}
            </h2>
            <p className="mt-4 text-ms-ink-muted">
              {isRTL
                ? 'المبادئ التي توجه كل ما نبنيه'
                : 'The principles that guide everything we build'}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="p-6 bg-white text-center">
                <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-ms-orange/10">
                  <value.icon className="h-6 w-6 text-ms-orange" />
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-ms-ink-muted">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              {isRTL ? 'رحلتنا' : 'Our Journey'}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex-shrink-0 w-20 text-right">
                    <span className="text-xl font-bold text-ms-orange">{item.year}</span>
                  </div>
                  <div className="relative pb-8">
                    <div className="absolute left-0 top-2 h-full w-px bg-ms-orange/20"></div>
                    <div className="absolute left-0 top-2 -translate-x-1/2 h-4 w-4 rounded-full bg-ms-orange"></div>
                    <div className="pl-8">
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-ms-ink-muted">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Schools */}
      <section className="bg-ms-shell py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-ms-orange/10 px-4 py-2 text-sm font-medium text-ms-orange mb-6">
                  <GraduationCap className="h-4 w-4" />
                  {isRTL ? 'للمؤسسات التعليمية' : 'For Educational Institutions'}
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-6">
                  {isRTL 
                    ? 'مصمم للمدارس والجامعات' 
                    : 'Built for Schools & Universities'}
                </h2>
                <p className="text-ms-ink-muted mb-6">
                  {isRTL
                    ? 'Mentorshape ليس سوقاً للمستهلكين. نحن نتشارك مع المؤسسات التعليمية لتقديم برامج إرشاد منظمة لطلابهم.'
                    : 'Mentorshape is not a consumer marketplace. We partner with educational institutions to deliver structured mentorship programs for their students.'}
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'مرشدون من داخل المؤسسة فقط' : 'In-roster mentors only'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'إشراف المستشارين على جميع التعاونات' : 'Counselor oversight on all collaborations'}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{isRTL ? 'حماية مدمجة وموافقة ولي الأمر' : 'Built-in safeguarding and guardian consent'}</span>
                  </li>
                </ul>
                <Link href="/for-schools">
                  <Button className="bg-ms-orange hover:bg-ms-orange/90">
                    {isRTL ? 'اعرف المزيد' : 'Learn More'}
                    <ArrowRight className={`${isRTL ? 'mr-2 rotate-180' : 'ml-2'} h-4 w-4`} />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-white text-center">
                  <GraduationCap className="h-8 w-8 text-ms-orange mx-auto mb-3" />
                  <p className="font-semibold">{isRTL ? 'المدارس' : 'Schools'}</p>
                </Card>
                <Card className="p-6 bg-white text-center">
                  <GraduationCap className="h-8 w-8 text-ms-orange mx-auto mb-3" />
                  <p className="font-semibold">{isRTL ? 'الجامعات' : 'Universities'}</p>
                </Card>
                <Card className="p-6 bg-white text-center col-span-2">
                  <Globe className="h-8 w-8 text-ms-orange mx-auto mb-3" />
                  <p className="font-semibold">{isRTL ? 'عالمي - EN + AR' : 'Global — EN + AR'}</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            {isRTL ? 'هل أنت مستعد للشراكة معنا؟' : 'Ready to partner with us?'}
          </h2>
          <p className="text-lg text-ms-ink-muted mb-8 max-w-2xl mx-auto">
            {isRTL
              ? 'تواصل معنا لمعرفة كيف يمكن لـ Mentorshape مساعدة مدرستك أو جامعتك.'
              : 'Get in touch to learn how Mentorshape can help your school or university.'}
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
      </section>
    </>
  )
}
