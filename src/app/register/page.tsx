import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">BuildSite</h1>
          <p className="text-sm text-muted-foreground">Create an account to get started</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
