import { redirect } from 'next/navigation'

// Mode waitlist — les inscriptions se font via le formulaire sur la landing.
// Remettre le formulaire (SignupForm.tsx) quand on ouvre les accès.
export default function SignupPage() {
  redirect('/')
}
