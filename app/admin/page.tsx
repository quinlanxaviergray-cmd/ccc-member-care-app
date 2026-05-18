import { createClient } from '@/utils/supabase-admin'

export default async function UsersPage() {
  const supabase = createClient()

  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Users</h1>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </main>
  )
}