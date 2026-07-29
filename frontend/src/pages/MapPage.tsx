import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Clock3,
  Flame,
  Play,
  SignalHigh,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { api } from '../api/client';
import type { CaseLine, CaseSummary } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { LINE_META, LINE_ORDER, difficultyLabel } from '../domain/labels';
import { computeGrowth, recommendCase } from '../domain/growth';
import { RouteIcon } from '../components/RouteIcon';
import { DemoTag } from '../components/LineTag';
import { Mascot } from '../components/Mascot';
import { RoutePath, buildNodes } from '../components/RoutePath';
import { ErrorState } from '../components/States';
import './map.css';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function MapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeLine, setActiveLine] = useState<CaseLine>('CLEARING');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [cases, records] = await Promise.all([api.listCases(), api.listAllRecords()]);
      return { cases, records };
    },
    [],
  );

  const growth = useMemo(() => computeGrowth(data?.records ?? []), [data]);
  const recommended = useMemo(
    () => (data ? recommendCase(data.cases, growth.perCase) : null),
    [data, growth],
  );

  // 默认选中当前路线的「当前/第一个可玩」案例
  useEffect(() => {
    if (!data) return;
    const lineCases = data.cases.filter((c) => c.line === activeLine);
    if (lineCases.length === 0) {
      setSelectedCaseId(null);
      return;
    }
    const nodes = buildNodes(lineCases, growth.perCase);
    const current = nodes.find((n) => n.state === 'current') ?? nodes.find((n) => n.state === 'done');
    setSelectedCaseId(current?.caseItem?.id ?? lineCases[0].id);
  }, [data, activeLine, growth]);

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 168, marginBottom: 22 }} />
        <div style={{ display: 'flex', gap: 22 }}>
          <div className="skeleton" style={{ width: 250, height: 420, flex: 'none' }} />
          <div className="skeleton" style={{ flex: 1, height: 420 }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState title="学习地图加载失败" message={error?.message} onRetry={reload} />;
  }

  const lineCases = (line: CaseLine): CaseSummary[] => data.cases.filter((c) => c.line === line);
  const activeMeta = LINE_META[activeLine];
  const activeCases = lineCases(activeLine);
  const activeDone = activeCases.filter((c) => growth.perCase.has(c.id)).length;
  const selectedCase = activeCases.find((c) => c.id === selectedCaseId) ?? null;
  const selectedProgress = selectedCase ? growth.perCase.get(selectedCase.id) : undefined;
  const allDone = activeCases.length > 0 && activeDone === activeCases.length;

  return (
    <div className="map2">
      {/* ===== 学员成长面板 ===== */}
      <section className="gpanel card rise-in">
        <div className="gpanel-level">
          <div className="gpanel-badge" aria-label={`等级 ${growth.level}`}>
            <span className="gpanel-badge-no num">{growth.level}</span>
            <Sparkles size={15} className="gpanel-badge-star" />
          </div>
          <div className="gpanel-level-info">
            <div className="gpanel-greet">
              {greeting()}，{user?.displayName}
            </div>
            <div className="gpanel-title-row">
              <span className="gpanel-title">{growth.levelTitle}</span>
              <span className="gpanel-lv num">Lv.{growth.level}</span>
            </div>
            <div className="gpanel-xpbar" role="img" aria-label={`经验值 ${growth.xpInLevel}/${growth.xpForNext}`}>
              <i style={{ width: `${Math.max(4, growth.levelProgress * 100)}%` }} />
            </div>
            <div className="gpanel-xp-text num">
              经验值 {growth.xpInLevel}/{growth.xpForNext} · 再得 {growth.xpForNext - growth.xpInLevel} XP 升级
            </div>
          </div>
        </div>

        <div className="gpanel-stats">
          <div className="gpanel-stat">
            <Flame size={17} className="gpanel-stat-icon" style={{ color: '#f97316' }} />
            <div>
              <div className="gpanel-stat-no num">{growth.streakDays}<small>天</small></div>
              <div className="gpanel-stat-label">连续训练</div>
            </div>
          </div>
          <div className="gpanel-stat">
            <Target size={17} className="gpanel-stat-icon" style={{ color: 'var(--blue)' }} />
            <div>
              <div className="gpanel-stat-no num">{growth.totalTrainings}<small>次</small></div>
              <div className="gpanel-stat-label">累计训练</div>
            </div>
          </div>
          <div className="gpanel-stat">
            <Trophy size={17} className="gpanel-stat-icon" style={{ color: 'var(--gold)' }} />
            <div>
              <div className="gpanel-stat-no num">{Math.round(growth.bestRate * 100)}<small>%</small></div>
              <div className="gpanel-stat-label">最佳得分率</div>
            </div>
          </div>
          <div className="gpanel-stat">
            <CalendarCheck2 size={17} className="gpanel-stat-icon" style={{ color: 'var(--cyan)' }} />
            <div>
              <div className="gpanel-stat-no num">{growth.todayCount}<small>次</small></div>
              <div className="gpanel-stat-label">今日已练</div>
            </div>
          </div>
        </div>

        <div className="gpanel-cta">
          <div className="gpanel-coach">
            <Mascot size={56} mood="idle" shadow={false} />
            <p>
              {growth.totalTrainings === 0
                ? '欢迎来到智训营！从任一关卡开始你的第一次实战吧。'
                : recommended
                  ? growth.perCase.has(recommended.id)
                    ? `「${recommended.title}」还有提升空间，再冲一次高分？`
                    : `下一步推荐：「${recommended.title}」，继续保持节奏！`
                  : '选择一条路线，开始今天的训练吧。'}
            </p>
          </div>
          {recommended && (
            <button
              type="button"
              className="btn btn-primary gpanel-btn"
              onClick={() => navigate(`/cases/${recommended.id}`)}
            >
              <Play size={16} />
              继续训练
            </button>
          )}
        </div>
      </section>

      {/* ===== 路线 + 关卡路径 ===== */}
      <div className="map2-main">
        {/* 路线选择 */}
        <aside className="map2-routes rise-in rise-in-1">
          <p className="map2-routes-title">选择业务路线</p>
          {LINE_ORDER.map((line) => {
            const meta = LINE_META[line];
            const cases = lineCases(line);
            const done = cases.filter((c) => growth.perCase.has(c.id)).length;
            const active = line === activeLine;
            return (
              <button
                key={line}
                type="button"
                className={`map2-route card${active ? ' active' : ''}`}
                style={{ ['--route-color' as string]: meta.color }}
                onClick={() => setActiveLine(line)}
                aria-pressed={active}
              >
                <span className="map2-route-icon" style={{ background: meta.soft, color: meta.color }}>
                  <RouteIcon line={line} size={19} />
                </span>
                <span className="map2-route-text">
                  <strong>{meta.name}</strong>
                  <em>{meta.tagline}</em>
                </span>
                <span className="map2-route-progress num">
                  {done}/{cases.length}
                </span>
              </button>
            );
          })}
          <p className="map2-routes-note">完成当前关卡后解锁下一关；案例为演示占位内容</p>
        </aside>

        {/* 关卡路径 */}
        <section className="map2-path card rise-in rise-in-2">
          <header className="map2-path-head">
            <div>
              <h2 className="map2-path-title" style={{ color: activeMeta.color }}>
                <RouteIcon line={activeLine} size={19} />
                {activeMeta.name}路线
              </h2>
              <p className="map2-path-desc">{activeMeta.description}</p>
            </div>
            <div className="map2-path-meta">
              <span className={`num ${allDone ? 'map2-path-done-tag' : 'map2-path-count'}`}>
                已掌握 {activeDone}/{activeCases.length} 关
              </span>
            </div>
          </header>

          {activeCases.length === 0 ? (
            <div className="map2-path-empty">
              <Mascot size={76} mood="thinking" shadow={false} />
              <p>该路线的案例正在备课中，敬请期待</p>
            </div>
          ) : (
            <>
              <RoutePath
                line={activeLine}
                color={activeMeta.color}
                cases={activeCases}
                perCase={growth.perCase}
                selectedCaseId={selectedCaseId}
                onSelectCase={setSelectedCaseId}
              />

              {/* 选中案例详情条 */}
              {selectedCase && (
                <div className="map2-casebar" style={{ ['--route-color' as string]: activeMeta.color }}>
                  <div className="map2-casebar-main">
                    <div className="map2-casebar-tags">
                      <span className="map2-casebar-meta-item">
                        <SignalHigh size={13} />
                        {difficultyLabel(selectedCase.difficulty)}
                      </span>
                      <span className="map2-casebar-meta-item">
                        <Clock3 size={13} />
                        约 {selectedCase.estimatedMinutes} 分钟
                      </span>
                      {selectedCase.placeholder && <DemoTag />}
                      {selectedProgress && (
                        <span className="map2-casebar-best num">
                          已练 {selectedProgress.attempts} 次 · 最佳 {Math.round(selectedProgress.bestRate * 100)}%
                        </span>
                      )}
                    </div>
                    <h3 className="map2-casebar-title">{selectedCase.title}</h3>
                    <p className="map2-casebar-summary">{selectedCase.summary}</p>
                  </div>
                  <Link to={`/cases/${selectedCase.id}`} className="btn btn-primary map2-casebar-btn">
                    {selectedProgress ? '再练一次' : '开始训练'}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
