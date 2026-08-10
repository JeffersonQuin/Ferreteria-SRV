export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function signInWithEmail(email: string, password: string) {
    loading.value = true
    error.value = null

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    loading.value = false

    if (authError) {
      error.value = 'Correo o contraseña incorrectos.'
      return false
    }

    await navigateTo('/dashboard')
    return true
  }

  async function signOut() {
    await supabase.auth.signOut()
    await navigateTo('/')
  }

  function getUser() {
    return user.value
  }

  function isAuthenticated() {
    return !!user.value
  }

  return { user, loading, error, signInWithEmail, signOut, getUser, isAuthenticated }
}
