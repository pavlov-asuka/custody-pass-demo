import { MapPinned, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMap } from '../api/client';
import type { Line, MapResponse } from '../api/types';
import { AppShell } from '../components/AppShell';
import { MapTrack } from '../components/MapTrack';
import { ErrorState, LoadingState } from '../components/States';
import { useAsync } from '../hooks/useAsync';
import { lineLabels } from '../utils/format';

function parseLine(value?: string): Line | null {
  const normalized = value?.toUpperCase();
  if (normalized === 'ACCOUNTING' || normalized === 'CLEARING' || normalized === 'SUPERVISION') {
    return normalized;
  }
  return null;
}

export function MapPage() {
  const navigate = useNavigate();
  const { line: lineParam } = useParams<{ line: string }>();
  const line = parseLine(lineParam);
  const canLoadMap = line === 'ACCOUNTING' || line === 'CLEARING';
  const { data, error, loading, reload } = useAsync<MapResponse | null>(
    () => (canLoadMap && line ? getMap(line) : Promise.resolve(null)),
    [canLoadMap, line],
  );
  const hasScrolled = useRef(false);
  const lineName = line ? lineLabels[line] : '学习';
  const mapData = data?.line === line ? data : null;

  const nodes = useMemo(
    () => mapData?.regions.flatMap((region) => region.modules.flatMap((module) => module.nodes)) ?? [],
    [mapData],
  );

  useEffect(() => {
    document.title = `${lineName}学习地图 · 托管智训营`;
  }, [lineName]);

  useEffect(() => {
    hasScrolled.current = false;
  }, [line]);

  useEffect(() => {
    if (!mapData?.recommendedNodeId || hasScrolled.current) return;
    const timer = window.setTimeout(() => {
      // nearest：当前节点已在视口内时不滚动，保证首屏同时看见单元标题带、
      // 当前节点、后继节点与路径方向（DESIGN 9.2）
      document.getElementById(`node-${mapData.recommendedNodeId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      hasScrolled.current = true;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mapData]);

  function scrollToRecommended() {
    document.getElementById(`node-${mapData?.recommendedNodeId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <AppShell
      backLabel="返回学习世界"
      onBack={() => navigate('/worlds')}
      context={`${lineName}学习地图`}
    >
      <div className="map-page page-enter">
        {loading && <LoadingState label={`正在读取${lineName}路线…`} />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {!loading && !error && !mapData && (
          <div className="state-panel">
            <strong>{line ? `${lineName}内容建设中` : '学习地图不可用'}</strong>
            <p>{line ? '该业务世界暂未开放地图入口，请返回学习世界。' : '请从学习世界选择有效的业务地图。'}</p>
          </div>
        )}
        {mapData && (
          <>
            <div className="map-locator">
              <div className="map-locator__inner">
                <MapPinned size={16} />
                <span className="map-locator__region">{mapData.regions[0]?.name}</span>
                <span className="map-locator__progress">
                  已通过 {mapData.progress.passedRequiredRoutes} / {mapData.progress.publishedRequiredRoutes} 条必修路线
                </span>
                <button type="button" className="map-locator__back" onClick={scrollToRecommended}>
                  定位当前路线
                </button>
              </div>
            </div>

            <main className="map-main">
              {mapData.regions.map((region, regionIndex) => (
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
                      <MapTrack nodes={module.nodes} recommendedNodeId={mapData.recommendedNodeId} />
                    </div>
                  ))}
                </section>
              ))}
              {!nodes.length && (
                <div className="state-panel">
                  <strong>暂无可进入的{lineName}路线</strong>
                  <p>返回{lineName}学习世界，稍后再查看已发布路线。</p>
                </div>
              )}
              <div className="map-tail">
                <Wrench size={24} />
                <div>
                  <strong>更多{lineName}路线在建设中</strong>
                  <span>当前先开放已发布路线；新增路线发布后会显示在这里。</span>
                </div>
              </div>
            </main>
          </>
        )}
      </div>
    </AppShell>
  );
}
