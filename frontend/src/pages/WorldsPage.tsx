import { ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Line, World } from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { ErrorState, LoadingState } from '../components/States';
import { WorldScene } from '../components/WorldScene';
import { useAsync } from '../hooks/useAsync';
import { getWorlds } from '../api/client';

const worldKickers: Record<Line, string> = {
  CLEARING: '资金与证券交收',
  ACCOUNTING: '核算、估值与复核',
  SUPERVISION: '边界识别与风险报告',
};

function worldStatusText(world: World): string {
  if (world.status === 'PASSED') return '已完成';
  if (world.status === 'NOT_STARTED') return '准备出发';
  return '继续学习';
}

function WorldCard({ world }: { world: World }) {
  const navigate = useNavigate();
  const building = world.availability === 'BUILDING';

  return (
    <article className={`world-card ${building ? 'is-building' : ''}`}>
      <WorldScene line={world.line} building={building} />
      <div className="world-card__body">
        <span className="world-card__kicker">{worldKickers[world.line]}</span>
        <h2>{world.name}</h2>
        <p className="world-card__goal">{world.description}</p>
        {building ? (
          <div className="world-card__status">
            <span className="building-tag">内容建设中</span>
          </div>
        ) : (
          <>
            <div className="world-card__status">
              <div className="world-card__progress-line">
                <strong>{worldStatusText(world)}</strong>
                <span>{world.passedRequiredRoutes} / {world.publishedRequiredRoutes} 条必修路线</span>
              </div>
              <div className="b3-progress" aria-hidden="true">
                <span style={{ width: `${world.progressPercent}%` }} />
              </div>
            </div>
            <button
              className="b3-btn b3-btn--primary b3-btn--wide world-card__action"
              type="button"
              onClick={() => navigate('/map/accounting')}
            >
              进入学习地图 <ArrowRight size={20} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function WorldsPage() {
  const { data, error, loading, reload } = useAsync(getWorlds, []);

  useEffect(() => {
    document.title = '学习世界 · 托管智训营';
  }, []);

  return (
    <AppShell>
      <div className="worlds-page page-enter">
        <header className="worlds-header">
          <div className="worlds-header__copy">
            <h1>今天想进入哪个学习世界？</h1>
            <p>每个世界都有自己的岗位路线。选定一条业务线，专注完成今天的学习。</p>
          </div>
          <Mascot
            pose="WELCOME_WAVE"
            size="small"
            message="选择一条业务线，我们就出发！"
          />
        </header>

        {loading && <LoadingState label="正在打开学习世界…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && (
          <section className="world-grid" data-testid="world-grid">
            {data.worlds.map((world) => <WorldCard key={world.line} world={world} />)}
          </section>
        )}
      </div>
    </AppShell>
  );
}
