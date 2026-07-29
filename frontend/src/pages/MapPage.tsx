import { MapPinned, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMap } from '../api/client';
import { AppShell } from '../components/AppShell';
import { MapTrack } from '../components/MapTrack';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';

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
      // nearest：当前节点已在视口内时不滚动，保证首屏同时看见单元标题带、
      // 当前节点、后继节点与路径方向（DESIGN 9.2）
      document.getElementById(`node-${data.recommendedNodeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      hasScrolled.current = true;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [data]);

  function scrollToRecommended() {
    document.getElementById(`node-${data?.recommendedNodeId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <AppShell
      backLabel="返回学习世界"
      onBack={() => navigate('/worlds')}
      context="核算学习地图"
    >
      <div className="map-page page-enter">
        {loading && <LoadingState label="正在铺开核算学习地图…" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && (
          <>
            <div className="map-locator">
              <div className="map-locator__inner">
                <MapPinned size={16} />
                <span className="map-locator__region">{data.regions[0]?.name}</span>
                <span className="map-locator__progress">
                  已通过 {data.progress.passedRequiredRoutes} / {data.progress.publishedRequiredRoutes} 条必修路线
                </span>
                <button type="button" className="map-locator__back" onClick={scrollToRecommended}>
                  回到当前路线
                </button>
              </div>
            </div>

            <main className="map-main">
              {data.regions.map((region, regionIndex) => (
                <section key={region.regionId} aria-label={region.name}>
                  <header className="unit-banner">
                    <span className="unit-banner__index">第 {regionIndex + 1} 章</span>
                    <div>
                      <h1>{region.name}</h1>
                      {region.description && <p>{region.description}</p>}
                    </div>
                  </header>
                  {region.modules.map((module) => (
                    <div key={module.moduleId}>
                      <div className="module-divider">{module.name}</div>
                      <MapTrack nodes={module.nodes} recommendedNodeId={data.recommendedNodeId} />
                    </div>
                  ))}
                </section>
              ))}
              {!nodes.length && (
                <div className="state-panel">
                  <strong>路线正在整理中</strong>
                  <p>请稍后回到核算学习世界查看。</p>
                </div>
              )}
              <div className="map-tail">
                <Wrench size={24} />
                <div>
                  <strong>更多核算路线正在建设</strong>
                  <span>完成已发布路线后，我们会继续向下延伸。</span>
                </div>
              </div>
            </main>
          </>
        )}
      </div>
    </AppShell>
  );
}
