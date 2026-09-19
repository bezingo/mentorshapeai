import { TransactionsList } from '@/components/profile/transactions-list'
import { ProfileSubpageShell } from '@/components/profile/profile-subpage-shell'

export default function ProfileTransactionsPage() {
  return (
    <ProfileSubpageShell
      title="Transactions"
      description="View payments you made or received through Mentorshape."
    >
      <TransactionsList />
    </ProfileSubpageShell>
  )
}
