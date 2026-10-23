
import { useState } from "react";
import type { FormEvent } from "react";
import { signup } from "../api/auth";

interface SignupProps {
  onSignupSuccess: () => void;
  onSwitchToLogin: () => void;
}

function Signup({
  onSignupSuccess,
  onSwitchToLogin,
}: SignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("이메일을 입력해 주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상 입력해 주세요.");
      return;
    }

    if (
      new TextEncoder().encode(password).length > 72
    ) {
      setError(
        "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);

      const result = await signup(
        normalizedEmail,
        password
      );

      setMessage(
        result.message || "회원가입이 완료되었습니다."
      );

      onSignupSuccess();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("회원가입에 실패했습니다.");
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
          <p>새로운 계정을 만들어 보세요.</p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="signup-email">
            이메일
          </label>

          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="email@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="signup-password">
            비밀번호
          </label>

          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="8자 이상"
            autoComplete="new-password"
            required
          />

          <label htmlFor="confirm-password">
            비밀번호 확인
          </label>

          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="비밀번호를 다시 입력해 주세요."
            autoComplete="new-password"
            required
          />

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          {message && (
            <p role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "가입 중..."
              : "회원가입"}
          </button>

          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            로그인으로 돌아가기
          </button>
        </form>
      </div>
    </main>
  );
}

export default Signup;
