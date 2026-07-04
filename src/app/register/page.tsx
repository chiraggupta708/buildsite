import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">BuildSite</h1>
          <p className="text-sm text-muted-foreground">Create an account to get started</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
