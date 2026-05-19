import { SignIn } from "@clerk/nextjs";
import { SevenPosLogo } from "@/components/brand/sevenpos-logo";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,hsl(224_58%_13%),hsl(216_55%_11%)_52%,hsl(222_48%_7%))] p-12 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_22%,hsl(218_92%_47%/0.24),transparent_28%),radial-gradient(circle_at_80%_82%,hsl(199_92%_58%/0.12),transparent_30%)]" />
          <div className="relative flex items-center gap-3">
            <SevenPosLogo className="text-white" markClassName="size-12 bg-white text-primary shadow-[0_16px_40px_hsl(220_60%_4%/0.35)]" />
          </div>

          <div className="relative mt-auto max-w-xl pb-10">
            <p className="mb-8 inline-flex rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50 shadow-sm backdrop-blur">
              POS, inventario y reportes
            </p>
            <h1 className="max-w-lg text-5xl font-semibold leading-tight tracking-tight text-white">
              Controla tu negocio en tiempo real
            </h1>
            <p className="mt-8 text-xl font-normal text-blue-50">
              Ventas, inventario y reportes en un solo lugar
            </p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
          <div className="w-full max-w-[506px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <SevenPosLogo className="text-slate-900" markClassName="size-12" />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-[0_24px_80px_hsl(222_28%_18%/0.08)]">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Bienvenido de nuevo</h2>
                <p className="mt-3 text-sm font-normal text-slate-500">Ingresa tus credenciales para continuar.</p>
              </div>

              <SignIn
                fallbackRedirectUrl="/auth/redirect"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "w-full bg-transparent shadow-none border-0 p-0",
                    cardBox: "w-full shadow-none rounded-none border-0 bg-transparent",
                    header: "hidden",
                    socialButtonsBlockButton: "h-11 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50",
                    formFieldLabel: "text-sm font-medium text-slate-800 normal-case tracking-normal",
                    formFieldInput: "h-12 rounded-lg border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-none focus:border-primary focus:ring-primary/20",
                    formButtonPrimary: "h-12 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-[0_12px_26px_hsl(218_92%_35%/0.22)] hover:bg-primary-hover",
                    formFieldAction: "text-sm font-medium text-primary hover:text-primary-hover",
                    footer: "hidden",
                    dividerLine: "bg-slate-200",
                    dividerText: "text-slate-400",
                    identityPreviewText: "text-slate-700",
                    formResendCodeLink: "text-primary",
                  },
                }}
              />
            </div>

            <p className="mt-8 text-center text-xs font-normal text-slate-500">
              Plataforma segura para operaciones de restaurantes y comercios.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
