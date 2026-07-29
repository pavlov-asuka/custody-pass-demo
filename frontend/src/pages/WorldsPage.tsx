import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Line, World } from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { getWorlds } from '../api/client';

const worldVisuals: Record<Line, {
  kicker: string;
  icon: typeof Calculator;
  objects: string[];
}> = {
  CLEARING: {
    kicker: '资金与证券交收',
    icon: Landmark,
    objects: ['交收箭头', '资金桥梁'],
  },
  ACCOUNTING: {
    kicker: '核算、估值与复核',
    icon: Calculator,
    objects: ['蓝色账簿', '核算勾稽'],
  },
  SUPERVISION: {
    kicker: '边界识别与风险报告',
    icon: ShieldCheck,
    objects: ['监督盾牌', '检查望远镜'],
  },
};

function WorldCard({ world }: { world: World }) {
  const navigate = useNavigate();
  const visual = worldVisuals[world.line];
  const Icon = visual.icon;
  const building = world.availability === 'BUILDING';

  return (
    <article className={`world-card world-card--${world.line.toLowerCase()} ${building ? 'is-building' : ''}`}>
      <div className="world-card__scene" aria-hidden="true">
        <span className="scene-cloud scene-cloud--one" />
        <span className="scene-cloud scene-cloud--two" />
        <div className="scene-object">
          <Icon size={66} strokeWidth={2.5} />
          <span>{visual.objects[0]}</span>
        </div>
        <div className="scene-ground">
          <span />
          <span />
          <span />
        </div>
        {building && <div className="scene-toolbox"><Wrench size={22} /> 建设中</div>}
        {!building && <div className="scene-check"><CheckCircle2 size={28} /></div>}
      </div>
      <div className="world-card__body">
        <span className="eyebrow">{visual.kicker}</span>
        <h2>{world.name}</h2>
        <p>{world.description}</p>
        {building ? (
          <div className="building-label">
            <Wrench size={18} />
            <span><strong>内容建设中</strong>精彩路线正在准备</span>
          </div>
        ) : (
          <>
            <div className="world-progress">
              <div>
                <span>{world.status === 'NOT_STARTED' ? '准备出发' : world.status === 'PASSED' ? '已完成' : '继续学习'}</span>
                <strong>{world.passedRequiredRoutes} / {world.publishedRequiredRoutes} 条必修路线</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${world.progressPercent}%` }} /></div>
            </div>
            <button
              className="button button--primary button--wide"
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
        <section className="worlds-hero">
          <div>
            <span className="eyebrow">选择今天的业务旅程</span>
            <h1>今天想进入哪个学习世界？</h1>
            <p>每个世界都有自己的岗位路线。选定一条业务线，专注完成今天的学习。</p>
          </div>
          <Mascot
            pose="WELCOME_WAVE"
            size="medium"
            message="选择一条业务线，我们就出发！"
          />
        </section>

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
