import React from 'react';
import { ToothCondition, ToothId, ToothState, ToothSurface } from '../../domain/types';
import { isAnteriorTooth, isMaxillaryArch } from '../../domain/fdi';

interface ToothSvgProps {
  toothId: ToothId;
  state?: ToothState;
  isSelected: boolean;
  onSelectTooth: (toothId: ToothId) => void;
  onToggleSurface?: (toothId: ToothId, surface: ToothSurface) => void;
}

/** Whole-unit conditions paint the full crown even with empty surface lists. */
const WHOLE_TOOTH: ReadonlySet<ToothCondition> = new Set([
  'CROWN',
  'RCT',
  'EXTRACTION_INDICATED',
  'MISSING',
  'IMPLANT',
]);

function conditionFill(condition: ToothCondition): string {
  switch (condition) {
    case 'CARIES':
      return 'var(--status-caries)';
    case 'COMPOSITE':
      return 'var(--status-composite)';
    case 'AMALGAM':
      return 'var(--status-amalgam)';
    case 'CROWN':
      return 'var(--status-crown)';
    case 'RCT':
      return 'var(--status-rct)';
    case 'EXTRACTION_INDICATED':
      return 'var(--status-extraction)';
    case 'MISSING':
      return 'var(--status-missing)';
    case 'IMPLANT':
      return 'var(--status-implant)';
    case 'FRACTURE':
      return 'var(--status-fracture)';
    default:
      return 'var(--status-sound)';
  }
}

function conditionOutline(condition: ToothCondition, isSelected: boolean): string {
  if (isSelected) return 'var(--color-brand)';
  if (condition === 'SOUND') return 'var(--status-sound-outline)';
  return conditionFill(condition);
}

export const ToothSvg: React.FC<ToothSvgProps> = ({
  toothId,
  state,
  isSelected,
  onSelectTooth,
  onToggleSurface,
}) => {
  const isAnterior = isAnteriorTooth(toothId);
  const isMaxillary = isMaxillaryArch(toothId);
  const condition: ToothCondition = state?.condition || 'SOUND';
  const affectedSurfaces = state?.affectedSurfaces || [];
  const paintWhole =
    condition !== 'SOUND' &&
    (WHOLE_TOOTH.has(condition) || affectedSurfaces.length === 0);

  const quadrant = Math.floor(toothId / 10);
  const isRightSide = quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;

  const centerSurfaceName: ToothSurface = isAnterior ? 'I' : 'O';
  const topSurfaceName: ToothSurface = isMaxillary ? 'B' : 'L';
  const bottomSurfaceName: ToothSurface = isMaxillary ? 'L' : 'B';
  const leftSurfaceName: ToothSurface = isRightSide ? 'D' : 'M';
  const rightSurfaceName: ToothSurface = isRightSide ? 'M' : 'D';

  const getSurfaceColor = (surface: ToothSurface): string => {
    if (condition === 'SOUND') return 'var(--status-sound)';
    if (paintWhole || affectedSurfaces.includes(surface)) {
      return conditionFill(condition);
    }
    return 'var(--status-sound)';
  };

  const handleSurfaceClick = (e: React.MouseEvent, surface: ToothSurface) => {
    e.stopPropagation();
    if (onToggleSurface) {
      onToggleSurface(toothId, surface);
    } else {
      onSelectTooth(toothId);
    }
  };

  const outline = conditionOutline(condition, isSelected);
  const rootFill =
    condition === 'RCT'
      ? '#DCFCE7'
      : condition === 'IMPLANT'
        ? '#EDE9FE'
        : 'var(--status-sound)';
  const crownBaseFill =
    condition === 'CROWN'
      ? '#FEF3C7'
      : paintWhole
        ? conditionFill(condition)
        : 'var(--status-sound)';

  return (
    <div
      onClick={() => onSelectTooth(toothId)}
      className={`tactile-btn flex flex-col items-center cursor-pointer rounded-md p-1 motion-colors ${
        isSelected
          ? 'bg-teal-50 ring-2 ring-[var(--color-brand)]'
          : 'hover:bg-slate-100/80'
      }`}
      title={`Tooth #${toothId} · ${condition}${
        affectedSurfaces.length > 0 ? ` (${affectedSurfaces.join(', ')})` : ''
      }`}
    >
      <span
        className={`mb-1 rounded px-1.5 py-0.5 font-mono text-xs font-bold motion-colors ${
          isSelected
            ? 'bg-[var(--color-brand)] text-white'
            : condition !== 'SOUND'
              ? 'bg-slate-200 text-slate-900'
              : 'text-slate-600'
        }`}
      >
        {toothId}
      </span>

      <div className="relative h-20 w-14 sm:h-[5.5rem] sm:w-16">
        <svg viewBox="0 0 100 140" className="h-full w-full overflow-visible">
          {isMaxillary ? (
            <path
              d="M35,50 C32,20 40,5 50,5 C60,5 68,20 65,50 Z"
              fill={rootFill}
              stroke={outline}
              strokeWidth="2.5"
            />
          ) : (
            <path
              d="M35,90 C32,120 40,135 50,135 C60,135 68,120 65,90 Z"
              fill={rootFill}
              stroke={outline}
              strokeWidth="2.5"
            />
          )}

          {condition === 'RCT' && (
            <line
              x1="50"
              y1={isMaxillary ? '10' : '90'}
              x2="50"
              y2={isMaxillary ? '50' : '130'}
              stroke="var(--status-rct)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}

          {condition === 'IMPLANT' && (
            <g stroke="var(--status-implant)" strokeWidth="2">
              <line x1="42" y1={isMaxillary ? '15' : '95'} x2="58" y2={isMaxillary ? '15' : '95'} />
              <line x1="40" y1={isMaxillary ? '25' : '105'} x2="60" y2={isMaxillary ? '25' : '105'} />
              <line x1="42" y1={isMaxillary ? '35' : '115'} x2="58" y2={isMaxillary ? '35' : '115'} />
              <line x1="45" y1={isMaxillary ? '45' : '125'} x2="55" y2={isMaxillary ? '45' : '125'} />
            </g>
          )}

          <g transform={isMaxillary ? 'translate(0, 45)' : 'translate(0, 5)'}>
            <rect
              x="15"
              y="15"
              width="70"
              height="70"
              rx="8"
              fill={crownBaseFill}
              stroke={outline}
              strokeWidth={isSelected ? '3' : '2'}
            />

            <polygon
              points="15,15 85,15 65,35 35,35"
              fill={getSurfaceColor(topSurfaceName)}
              stroke="var(--status-sound-outline)"
              strokeWidth="1.5"
              className="tooth-surface"
              onClick={(e) => handleSurfaceClick(e, topSurfaceName)}
            />
            <polygon
              points="35,65 65,65 85,85 15,85"
              fill={getSurfaceColor(bottomSurfaceName)}
              stroke="var(--status-sound-outline)"
              strokeWidth="1.5"
              className="tooth-surface"
              onClick={(e) => handleSurfaceClick(e, bottomSurfaceName)}
            />
            <polygon
              points="15,15 35,35 35,65 15,85"
              fill={getSurfaceColor(leftSurfaceName)}
              stroke="var(--status-sound-outline)"
              strokeWidth="1.5"
              className="tooth-surface"
              onClick={(e) => handleSurfaceClick(e, leftSurfaceName)}
            />
            <polygon
              points="85,15 85,85 65,65 65,35"
              fill={getSurfaceColor(rightSurfaceName)}
              stroke="var(--status-sound-outline)"
              strokeWidth="1.5"
              className="tooth-surface"
              onClick={(e) => handleSurfaceClick(e, rightSurfaceName)}
            />
            <rect
              x="35"
              y="35"
              width="30"
              height="30"
              rx="2"
              fill={getSurfaceColor(centerSurfaceName)}
              stroke="var(--status-sound-outline)"
              strokeWidth="1.5"
              className="tooth-surface"
              onClick={(e) => handleSurfaceClick(e, centerSurfaceName)}
            />
            <text
              x="50"
              y="54"
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill="#475569"
              pointerEvents="none"
              fontFamily="monospace"
            >
              {centerSurfaceName}
            </text>

            {condition === 'EXTRACTION_INDICATED' && (
              <g stroke="var(--status-extraction)" strokeWidth="5" strokeLinecap="round">
                <line x1="12" y1="12" x2="88" y2="88" />
                <line x1="88" y1="12" x2="12" y2="88" />
              </g>
            )}

            {condition === 'MISSING' && (
              <line
                x1="8"
                y1="50"
                x2="92"
                y2="50"
                stroke="var(--status-missing)"
                strokeWidth="4"
                strokeDasharray="4 2"
              />
            )}

            {condition === 'FRACTURE' && (
              <polyline
                points="20,20 45,50 35,60 80,80"
                fill="none"
                stroke="var(--status-fracture)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        </svg>
      </div>

      <div className="mt-1 flex h-3.5 items-center justify-center space-x-0.5">
        {affectedSurfaces.map((s) => (
          <span
            key={s}
            className="rounded px-0.5 font-mono text-[9px] font-bold leading-none text-white"
            style={{ backgroundColor: conditionFill(condition) }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};
