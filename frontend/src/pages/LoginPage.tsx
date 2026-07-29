import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, GraduationCap, KeyRound, Route, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { LINE_META, LINE_ORDER } from '../domain/labels';
import { RouteIcon } from '../components/RouteIcon';
import { Mascot } from '../components/Mascot';
import './login.css';

export function LoginPage() {
  const { status, login, sessionExpiredNotice, dismissExpiredNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [employeeNo, setEmployeeNo] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    if (status === 'authed') {
      navigate(from, { replace: true });
    }
  }, [status, navigate, from]);

  useEffect(() => () => dismissExpiredNotice(), [dismissExpiredNotice]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const no = employeeNo.trim();
    if (!no || !password) {
      setError('请输入员工号和密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(no, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setError('员工号或密码错误');
        else if (err.status === 403) setError('安全校验失败，请稍后重试');
        else setError('服务暂时不可用，请稍后重试');
      } else {
        setError('登录失败，请稍后重试');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="login-stage">
      <div className="login-panel card rise-in">
        {/* 品牌侧 */}
        <div className="login-brand">
          <div className="login-brand-head">
            <span className="login-brand-logo">
              <GraduationCap size={20} />
            </span>
            <span className="login-brand-name">托管智训营</span>
          </div>

          <div className="login-brand-mascot" aria-hidden="true">
            <Mascot size={118} mood="wave" shadow={false} />
          </div>

          <div className="login-brand-mid">
            <span className="login-kicker">
              <Sparkles size={12} />
              托管业务新人 · 智能案例训练营
            </span>
            <h1 className="login-title">
              把每一个业务案例
              <br />
              都练成你的<em>经验值</em>
            </h1>
            <p className="login-slogan">
              实战案例开放作答，智能评卷给出四维能力反馈；
              <br />
              沿着三条业务路线闯关升级，成长清晰可见。
            </p>
          </div>

          <div className="login-routes" aria-label="三条学习路线">
            {LINE_ORDER.map((line) => {
              const meta = LINE_META[line];
              return (
                <div key={line} className="login-route-chip">
                  <span className="login-route-icon">
                    <RouteIcon line={line} size={17} />
                  </span>
                  <div>
                    <strong>{meta.name}路线</strong>
                    <em>{meta.tagline}</em>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="login-footnote">
            <ShieldCheck size={13} />
            内部培训演示环境 · 案例与知识均为演示占位内容
          </p>
        </div>

        {/* 表单侧 */}
        <div className="login-form-side">
          <span className="login-form-badge">
            <Route size={13} />
            学员登录
          </span>
          <h2 className="login-form-title">欢迎回来，继续闯关</h2>
          <p className="login-form-sub">使用员工号登录，接着上次的训练进度</p>

          {sessionExpiredNotice && (
            <div className="form-error" role="alert" style={{ marginBottom: 14 }}>
              <CircleAlert size={15} style={{ flex: 'none', marginTop: 2 }} />
              登录状态已失效，请重新登录
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="employeeNo">员工号</label>
              <div className="login-input-wrap">
                <UserRound size={16} className="login-input-icon" />
                <input
                  id="employeeNo"
                  className="input login-input"
                  value={employeeNo}
                  onChange={(e) => setEmployeeNo(e.target.value)}
                  placeholder="请输入员工号"
                  autoComplete="username"
                  inputMode="numeric"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="password">密码</label>
              <div className="login-input-wrap">
                <KeyRound size={16} className="login-input-icon" />
                <input
                  id="password"
                  type="password"
                  className="input login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={submitting}
                />
              </div>
            </div>

            {error && (
              <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
                <CircleAlert size={15} style={{ flex: 'none', marginTop: 2 }} />
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting && <span className="btn-spinner" aria-hidden="true" />}
              {submitting ? '正在登录…' : '进入学习地图'}
            </button>
          </form>

          <p className="login-demo-hint">忘记密码或没有账号，请联系培训管理员开通</p>
        </div>
      </div>
    </div>
  );
}
