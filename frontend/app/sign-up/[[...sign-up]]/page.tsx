import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";
import { embeddedAuthAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <AuthLayout
      eyebrow="Create an account"
      title="Start researching"
      subtitle="Every stress test is saved as a project you can reopen, version, and resume."
    >
      <SignUp appearance={embeddedAuthAppearance} />
    </AuthLayout>
  );
}
