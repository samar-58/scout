import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";
import { embeddedAuthAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to Scout"
      subtitle="Pick up a saved canvas, resume a stopped run, or stress-test something new."
    >
      <SignIn appearance={embeddedAuthAppearance} />
    </AuthLayout>
  );
}
