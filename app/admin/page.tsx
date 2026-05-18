// Example: admin/users-page.jsx or admin/page.tsx
import { createClient } from '@/utils/supabase-admin' // uses service role key

export default async function UsersPage() {
  const supabase = createClient()
  const { data: users } = await supabase.auth.admin.listUsers()

  async function handleDeny(userId: string) {
    // Call the Edge Function
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ userId })
      }
    )

    const result = await response.json()
    
    if (result.success) {
      // Refresh the user list or remove from UI
      revalidatePath('/admin/users')
    } else {
      alert('Error: ' + result.error)
    }
  }

  return (
    <div>
      {users.users.map((user) => (
        <div key={user.id}>
          <span>{user.email}</span>
          <button onClick={() => handleDeny(user.id)}>Deny</button>
        </div>
      ))}
    </div>
  )
}