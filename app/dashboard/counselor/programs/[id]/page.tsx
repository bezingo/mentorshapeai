import { redirect } from 'next/navigation'

export default function ProgramPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/counselor/programs/${params.id}/matches`)
}
