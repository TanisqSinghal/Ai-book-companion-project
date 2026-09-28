import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <main className="flex min-h-screen items-center justify-center px-4 pt-24">
            <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </main>
    );
}
