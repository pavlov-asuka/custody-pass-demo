import {
  BookOpen,
  Check,
  Flag,
  LockKeyhole,
  Star,
  Trophy,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MapNode } from '../api/types';
import { routeStateLabels } from '../utils/format';
import { Mascot } from './Mascot';

/**
 * 核算连续长地图轨道（阶段 3B）
 * 几何基线（DESIGN 9）：主轴 720px；普通节点 80px，当前 92px，
 * 里程碑 102px；纵向节距 116px；路径线 10px；标签 150—190px 常显。
 */

const TRACK_WIDTH = 720;
const TRACK_CENTER = TRACK_WIDTH / 2;
const ROW_PITCH = 116;

const NODE_SIZES = {
  normal: 80,
  current: 92,
  gate: 102,
} as const;

function offsetOf(position: MapNode['position']): number {
  if (position === 'LEFT') return -150;
  if (position === 'RIGHT') return 150;
  return 0;
}

function stateOf(node: MapNode): string {
  return node.contentAvailability === 'BUILDING' ? '内容建设中' : routeStateLabels[node.state];
}

function NodeIcon({ node, current }: { node: MapNode; current: boolean }) {
  if (node.nodeType === 'STAGE_GATE') return <Trophy />;
  if (node.contentAvailability === 'BUILDING') return <Wrench />;
  if (node.state === 'LOCKED') return <LockKeyhole />;
  if (node.state === 'PASSED') return <Check />;
  if (node.state === 'LEARNED_NOT_MASTERED') return <BookOpen />;
  if (current) return <Star />;
  return <Flag />;
}

function nodeSize(node: MapNode, current: boolean): number {
  if (node.nodeType === 'STAGE_GATE') return NODE_SIZES.gate;
  return current ? NODE_SIZES.current : NODE_SIZES.normal;
}

function segmentPath(
  from: { x: number; y: number; r: number },
  to: { x: number; y: number; r: number },
): string {
  const y1 = from.y + from.r / 2 + 4;
  const y2 = to.y - to.r / 2 - 4;
  const mid = (y1 + y2) / 2;
  return `M ${from.x} ${y1} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${y2}`;
}

export function MapTrack({
  nodes,
  recommendedNodeId,
}: {
  nodes: MapNode[];
  recommendedNodeId: string | null;
}) {
  const navigate = useNavigate();
  const height = nodes.length * ROW_PITCH;

  const geometry = nodes.map((node, index) => {
    const current = node.nodeId === recommendedNodeId;
    const size = nodeSize(node, current);
    return {
      node,
      current,
      x: TRACK_CENTER + offsetOf(node.position),
      y: index * ROW_PITCH + ROW_PITCH / 2,
      r: size,
    };
  });

  const recommended = geometry.find((item) => item.current);
  const mascotSide: 'left' | 'right' =
    recommended && recommended.x > TRACK_CENTER ? 'left' : 'right';

  return (
    <div className="map-track" style={{ height }} data-testid="learning-map">
      <svg
        className="map-track__path"
        viewBox={`0 0 ${TRACK_WIDTH} ${height}`}
        width={TRACK_WIDTH}
        height={height}
        aria-hidden="true"
      >
        {geometry.slice(1).map((to, index) => {
          const from = geometry[index];
          const d = segmentPath(from, to);
          const passed = from.node.state === 'PASSED';
          return (
            <g key={`${from.node.nodeId}-${to.node.nodeId}`}>
              <path className="map-track__segment" d={d} />
              {passed && <path className="map-track__segment map-track__segment--done" d={d} />}
            </g>
          );
        })}
      </svg>

      {geometry.map(({ node, current, x, y, r }) => {
        const label = stateOf(node);
        const gate = node.nodeType === 'STAGE_GATE';
        const clickable = node.enterable;
        return (
          <div
            key={node.nodeId}
            id={`node-${node.nodeId}`}
            className={`map-track__node ${current ? 'is-current' : ''}`}
            style={{ left: x, top: y }}
          >
            <button
              type="button"
              className={[
                'map-node',
                `map-node--${node.state.toLowerCase()}`,
                gate ? 'map-node--gate' : '',
                node.contentAvailability === 'BUILDING' ? 'map-node--building' : '',
                current ? 'is-current' : '',
              ].filter(Boolean).join(' ')}
              style={{ width: r, height: r }}
              onClick={() => clickable && navigate(`/learn/${node.routeId}`)}
              disabled={!clickable}
              aria-label={`${node.title}，${label}`}
            >
              <NodeIcon node={node} current={current} />
            </button>
            <div className={`map-node__label ${x > TRACK_CENTER ? 'map-node__label--left' : ''}`}>
              <strong>{node.title}</strong>
              <span>{label} · {node.completedSteps}/{node.totalSteps}</span>
            </div>
            {current && (
              <span className="map-node__continue">
                {node.state === 'NOT_STARTED' ? '从这里开始' : '继续'}
              </span>
            )}
          </div>
        );
      })}

      {recommended && (
        <div
          className={`map-track__mascot map-track__mascot--${mascotSide}`}
          style={{ top: recommended.y }}
        >
          <Mascot
            pose="GUIDE_POINT"
            size="small"
            message={recommended.node.state === 'NOT_STARTED' ? '从这里开始！' : '继续这条路线！'}
          />
        </div>
      )}
    </div>
  );
}
