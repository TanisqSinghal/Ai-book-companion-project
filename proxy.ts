import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware({
  // Local development environments can briefly drift from Clerk's token clock.
  // Keep production validation strict while allowing normal development refreshes.
  clockSkewInMs: process.env.NODE_ENV === 'development' ? 15_000 : undefined,
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
