export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value && to.path.startsWith('/dashboard')) {
    return navigateTo('/')
  }

  if (user.value && to.path === '/') {
    return navigateTo('/dashboard')
  }
})
