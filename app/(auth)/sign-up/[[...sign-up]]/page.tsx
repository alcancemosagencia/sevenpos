import { SignUp } from "@clerk/nextjs";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_10%,hsl(218_92%_90%),transparent_28%),linear-gradient(135deg,hsl(224_42%_8%),hsl(218_54%_18%)_46%,hsl(220_33%_96%)_46%)] px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-white/55 bg-white/88 p-4 shadow-[0_30px_100px_hsl(224_42%_8%/0.28)] backdrop-blur-xl">
        <div className="mb-7 flex justify-center">
          <SevenPosLogo className="text-foreground" markClassName="size-11" />
        </div>
        <SignUp
          fallbackRedirectUrl="/auth/redirect"
          appearance={{
            elements: {
              cardBox: "shadow-none rounded-lg border-0 bg-transparent",
              formButtonPrimary: "bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg",
              socialButtonsBlockButton: "rounded-lg border bg-white font-semibold",
              formFieldInput: "rounded-lg",
            },
          }}
        />
      </div>
    </main>
  );
}
