import { useState } from "react";
import type { FormEvent } from "react";
import { login } from "../api/auth";

interface LoginProps {
  onLoginSuccess: () => void;
  onSwitchToSignup: () => void;
}

function Login({
  onLoginSuccess,
  onSwitchToSignup,
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }

    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    try {
      setLoading(true);

      await login(
        email.trim(),
        password
      );

      onLoginSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          "로그인에 실패했습니다."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>읽다</h1>
          <p>
            저장해둔 글을 한곳에서
            읽어보세요.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="email">
            이메일
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="email@example.com"
            autoComplete="email"
          />

          <label htmlFor="password">
            비밀번호
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="비밀번호"
            autoComplete="current-password"
          />

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "로그인 중..."
              : "로그인"}
          </button>
          <button
                type="button"
                onClick={onSwitchToSignup}
                disabled={loading}
                >
                회원가입
                </button>
        </form>
      </div>
    </main>
  );
}

export default Login;