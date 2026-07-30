import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Mascot } from '../components/Mascot';

export function LoginPage() {
  const { user, restoring, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [employeeNo, setEmployeeNo] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = '登录 · 托管智训营';
  }, []);

  if (!restoring && user) return <Navigate to="/worlds" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(employeeNo.trim(), password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from || '/worlds', { replace: true });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : '登录失败，请稍后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-story__brand">
          <span className="brand__mark"><Sparkles size={22} strokeWidth={3} /></span>
          托管智训营
        </div>
        <div className="login-story__copy">
          <span className="eyebrow">把业务经验，练成岗位能力</span>
          <h1>今天，<br />从一条路线开始。</h1>
          <p>跟着小托走进真实业务情境，先学、再练、及时看见每一步成长。</p>
        </div>
        <Mascot
          pose="WELCOME_WAVE"
          size="large"
          message={<><strong>你好，我是小托。</strong><span>登录后，我们从当前路线继续。</span></>}
        />
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="eyebrow">欢迎回来</span>
            <h2>登录学习账号</h2>
            <p>使用你的员工号继续上一次学习。</p>
          </div>
          <form onSubmit={submit}>
            <label>
              <span>员工号</span>
              <input
                name="employeeNo"
                value={employeeNo}
                onChange={(event) => setEmployeeNo(event.target.value)}
                autoComplete="username"
                placeholder="请输入员工号"
                maxLength={32}
                required
                autoFocus
              />
            </label>
            <label>
              <span>密码</span>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入密码"
                maxLength={128}
                required
              />
            </label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button--primary button--wide" type="submit" disabled={submitting}>
              {submitting ? '正在进入…' : <>进入学习世界 <ArrowRight size={20} /></>}
            </button>
          </form>
          <p className="login-card__note"><ShieldCheck size={17} /> 账户仅用于岗位学习；进度与训练记录会安全保存。</p>
        </div>
      </section>
    </main>
  );
}
