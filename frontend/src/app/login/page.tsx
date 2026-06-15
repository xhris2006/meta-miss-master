import { Suspense } from "react";
import LoginClient from "./login-client";

type LoginPageProps = {
  searchParams?: {
    redirect?: string;
    tab?: string;
    token?: string;
    refreshToken?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirect = searchParams?.redirect || "/";
  const initialTab = searchParams?.tab === "register" ? "register" : "login";
  const token = searchParams?.token;
  const refreshToken = searchParams?.refreshToken;

  return (
    <Suspense fallback={<div className="page-content fade-up">Chargement...</div>}>
      <LoginClient
        initialTab={initialTab}
        redirect={redirect}
        oauthToken={token}
        oauthRefreshToken={refreshToken}
      />
    </Suspense>
  );
}
