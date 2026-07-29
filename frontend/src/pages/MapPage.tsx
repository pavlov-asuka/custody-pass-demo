import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Circle,
  Clock3,
  LockKeyhole,
  MapPinned,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMap } from '../api/client';
import type { MapNode } from '../api/types';
import { AppShell } from '../components/AppShell';
import { Mascot } from '../components/Mascot';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { routeStateLabels } from '../utils/format';

function NodeIcon({ node }: { node: MapNode }) {
  if (node.contentAvailability === 'BUILDING') return <Wrench />;
  if (node.state === 'LOCKED') return <LockKeyhole />;
  if (node.state === 'PASSED') return <Check />;
  if (node.state === 'LEARNED_NOT_MASTERED') return <BookOpenCheck />;
  if (node.state === 'IN_PROGRESS') return <Clock3 />;
  return <Circle />;
}

function positionOffset(position: MapNode['position']): number {
  if (position === 'LEFT') return -112;
  if (position === 'RIGHT') return 112;
  return 0;
}

function RouteNode({
  node,
  recommended,
  index,
}: {
  node: MapNode;
  recommended: boolean;
  index: number;
}) {
  const navigate = useNavigate();
  const offset = positionOffset(node.position);
  const stateLabel = node.contentAvailability === 'BUILDING'
    ? '内容建设中'
    : routeStateLabels[node.state];

  return (
    <div
      id={`node-${node.nodeId}`}
      className={`map-node-wrap ${recommended ? 'is-recommended' : ''}`}
      style={{ '--node-offset': `${offset}px` } as React.CSSProperties}
      data-node-index={index}
    >
      {recommended && (
        <div className="recommended-callout">
          <Mascot pose="GUIDE_POINT" size="small" />
          <span>{node.state === 'NOT_STARTED' ? '从这里开始' : '继续这条路线'}</span>
        </div>
      )}
      <button
        type="button"
        className={`map-node map-node--${node.state.toLowerCase()}`}
        onClick={() => node.enterable && navigate(`/learn/${node.routeId}`)}
        disabled={!node.enterable}
        aria-label={`${node.title}，${stateLabel}`}
      >
        <NodeIcon node={node} />
      </button>
      <div className="map-node__label">
        <strong>{node.title}</strong>
        <span>{stateLabel} · {node.completedSteps}/{node.totalSteps}</span>
      </div>
    </div>
  );
}

export function MapPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(() => getMap('ACCOUNTING'), []);
  const hasScrolled = useRef(false);

  const nodes = useMemo(
    () => data?.regions.flatMap((region) => region.modules.flatMap((module) => module.nodes)) ?? [],
    [data],
  );

  useEffect(() => {
    document.title = '核算学习地图 · 托管智训营';
  }, []);

  useEffect(() => {
    if (!data?.recommendedNodeId || hasScrolled.current) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`node-${data.recommendedNodeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      hasScrolled.current = true;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  return (
    <AppShell
      backLabel="返回学习世界"
      onBack={() => navigate('/worlds')}
      context="核算学习地图"
    >
      <div className="map-page page-enter">
        <section className="map-hero">
          <div className="map-hero__icon"><MapPinned size={34} /></div>
          <div>
            <span className="eyebrow">核算学习世界</span>
            <h1>沿着岗位路径，一站一站练扎实</h1>
            <p>路线状态与学习进度由系统同步，完成当前路线后再继续向前。</p>
          </div>
          {data && (
            <div className="map-hero__progress">
              <strong>{data.progress.percent}%</strong>
              <span>已通过 {data.progress.passedRequiredRoutes} / {data.progress.publishedRequiredRoutes} 条必修路线</span>
            </div>
          )}
        </section>

        {loading && <LoadingState label="正在铺开核算学习地图…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && (
          <>
            <div className="region-sticky">
              <span>当前章节</span>
              <strong>{data.regions[0]?.name}</strong>
              <button
                type="button"
                onClick={() =>
                  document.getElementById(`node-${data.recommendedNodeId}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  })
                }
              >
                回到当前路线
              </button>
            </div>

            <section className="learning-map" data-testid="learning-map">
              {data.regions.map((region) => (
                <div className="map-region" key={region.regionId}>
                  <header className="region-banner">
                    <span>第一章</span>
                    <h2>{region.name}</h2>
                    <p>{region.description}</p>
                  </header>
                  {region.modules.map((module) => (
                    <div className="map-module" key={module.moduleId}>
                      <div className="module-title">
                        <span />
                        <strong>{module.name}</strong>
                        <span />
                      </div>
                      <div className="map-path">
                        {module.nodes.map((node, index) => (
                          <div key={node.nodeId} className="map-path__segment">
                            {index > 0 && (() => {
                              const previousOffset = positionOffset(module.nodes[index - 1].position);
                              const currentOffset = positionOffset(node.position);
                              const delta = currentOffset - previousOffset;
                              const verticalGap = 92;
                              const length = Math.sqrt(verticalGap ** 2 + delta ** 2);
                              const angle = -Math.atan2(delta, verticalGap) * 180 / Math.PI;
                              return (
                                <span
                                  className="map-path__connector"
                                  style={{
                                    left: `calc(50% + ${previousOffset}px)`,
                                    height: `${length}px`,
                                    transform: `translateX(-50%) rotate(${angle}deg)`,
                                  }}
                                />
                              );
                            })()}
                            <RouteNode
                              node={node}
                              index={index}
                              recommended={node.nodeId === data.recommendedNodeId}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {!nodes.length && (
                <div className="state-panel">
                  <strong>路线正在整理中</strong>
                  <p>请稍后回到核算学习世界查看。</p>
                </div>
              )}
              <footer className="map-coming-soon">
                <Wrench size={26} />
                <div>
                  <strong>更多核算路线正在建设</strong>
                  <span>完成已发布路线后，我们会继续向下延伸。</span>
                </div>
                <ArrowRight />
              </footer>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
