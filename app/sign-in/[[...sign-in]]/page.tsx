import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
    return (
        <main className="flex min-h-screen items-center justify-center px-4 pt-24">
            <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        </main>
    );
}
