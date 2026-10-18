import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/** Paths anyone can visit without signing in */
function isPublicPath(pathname: string) {
  if (pathname === '/') return true

  const publicExact = new Set([
    '/events',
    '/about',
    '/members',
    '/contact',
    '/auth/signin',
    '/auth/signup',
  ])

  if (publicExact.has(pathname)) return true

  const publicPrefixes = [
    '/events/',
    '/about/',
    '/members/',
    '/contact/',
    '/auth/signin',
    '/auth/signup',
    '/api/webhooks',
    '/api/events',
    '/api/event-categories',
    '/api/tickets',
    '/test',
    '/api/test',
  ]

  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/') || pathname.startsWith(prefix)
  )
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  // Public marketing + events — never force login
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // API routes: resolve session for handlers, but never redirect to HTML sign-in
  if (pathname.startsWith('/api/')) {
    await auth()
    return NextResponse.next()
  }

  // Protected app pages
  const { userId } = await auth()

  if (!userId) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
