import React, { useEffect, useRef, useState } from 'react';
import {
  ClinicalDentalImage,
  CaliperMeasurement,
  calculateWorkingLengthMm,
} from '../../domain/imaging';
import { MOCK_CLINICAL_IMAGES } from '../../data/mockPhase2Data';
import {
  listPatientImages,
  persistPatientImage,
} from '../../lib/clinicalPersistence';
import {
  Sliders,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Ruler,
  Sparkles,
  SplitSquareVertical,
  Upload,
} from 'lucide-react';

function storedToClinical(rows: ReturnType<typeof listPatientImages>): ClinicalDentalImage[] {
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    targetToothId: r.targetToothId as ClinicalDentalImage['targetToothId'],
    modality: 'RVG_IOPA',
    title: r.title,
    captureDate: r.captureDate,
    imageUrl: r.imageUrl,
    contrastPercent: 100,
    brightnessPercent: 100,
    isInverted: false,
    calibratedMmPerPixel: 0.052,
    measurements: [],
    pathologyBoxes: [],
    clinicalNotes: r.clinicalNotes ?? '',
  }));
}

function loadImagesForPatient(
  patientId: string,
  patientName: string,
  isDemo: boolean
): ClinicalDentalImage[] {
  const saved = storedToClinical(listPatientImages(patientId));
  if (saved.length) return saved;
  if (isDemo) {
    const matched = MOCK_CLINICAL_IMAGES.filter((i) => i.patientId === patientId);
    if (matched.length) return matched;
    // Demo sample gallery — labeled as sample, not this patient's chart
    return MOCK_CLINICAL_IMAGES.map((i) => ({
      ...i,
      title: `Sample · ${i.title}`,
      clinicalNotes: `Demo sample film (not ${patientName}'s chart). Upload clinic RVG to replace.`,
      pathologyBoxes: i.pathologyBoxes,
    }));
  }
  return [];
}

export const ImagingStudio: React.FC<{
  isDemo?: boolean;
  patientId: string;
  patientName: string;
}> = ({ isDemo = false, patientId, patientName }) => {
  const [images, setImages] = useState<ClinicalDentalImage[]>(() =>
    loadImagesForPatient(patientId, patientName, isDemo)
  );
  const [activeImageId, setActiveImageId] = useState<string>(
    () => loadImagesForPatient(patientId, patientName, isDemo)[0]?.id ?? ''
  );

  useEffect(() => {
    const next = loadImagesForPatient(patientId, patientName, isDemo);
    setImages(next);
    setActiveImageId(next[0]?.id ?? '');
    setCaliperPoints(null);
    setIsCaliperActive(false);
    setShowSplitComparison(false);
    setMeasurements(next[0]?.measurements ?? []);
  }, [patientId, patientName, isDemo]);

  const activeImage = images.find((img) => img.id === activeImageId) ?? images[0];

  const [contrast, setContrast] = useState<number>(120);
  const [brightness, setBrightness] = useState<number>(100);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [showAiBBoxes, setShowAiBBoxes] = useState<boolean>(isDemo);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showSplitComparison, setShowSplitComparison] = useState<boolean>(false);
  const [splitPosition, setSplitPosition] = useState<number>(50);

  const [isCaliperActive, setIsCaliperActive] = useState<boolean>(false);
  const [caliperPoints, setCaliperPoints] = useState<{
    startX: number;
    startY: number;
    endX?: number;
    endY?: number;
  } | null>(null);
  const [measurements, setMeasurements] = useState<CaliperMeasurement[]>([]);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectImage = (img: ClinicalDentalImage) => {
    setActiveImageId(img.id);
    setMeasurements(img.measurements);
    setCaliperPoints(null);
    setIsCaliperActive(false);
    setShowSplitComparison(false);
  };

  const handleResetFilters = () => {
    setContrast(100);
    setBrightness(100);
    setIsInverted(false);
    setZoomLevel(1);
  };

  const handleUploadXray = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadHint('Please choose a JPG, PNG, or sensor export image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const id = `img-upload-${Date.now()}`;
      const captureDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
      persistPatientImage({
        id,
        patientId,
        patientName,
        title: `Uploaded RVG · ${file.name}`,
        captureDate,
        imageUrl: dataUrl,
        clinicalNotes: 'Uploaded from clinic computer / RVG export. Calibrate before measuring.',
      });
      const newImage: ClinicalDentalImage = {
        id,
        patientId,
        patientName,
        modality: 'RVG_IOPA',
        title: `Uploaded RVG · ${file.name}`,
        captureDate,
        imageUrl: dataUrl,
        contrastPercent: 100,
        brightnessPercent: 100,
        isInverted: false,
        calibratedMmPerPixel: 0.052,
        measurements: [],
        pathologyBoxes: [],
        clinicalNotes: 'Uploaded from clinic computer / RVG export. Calibrate before measuring.',
      };
      setImages((prev) => [newImage, ...prev.filter((i) => !i.title.startsWith('Sample ·'))]);
      selectImage(newImage);
      setUploadHint(`Saved for ${patientName}: ${file.name}`);
      window.setTimeout(() => setUploadHint(null), 3200);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCaliperActive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (!caliperPoints) {
      setCaliperPoints({ startX: clickX, startY: clickY });
    } else {
      const lengthMm = calculateWorkingLengthMm(
        caliperPoints.startX,
        caliperPoints.startY,
        clickX,
        clickY,
        activeImage.calibratedMmPerPixel
      );
      const newMeasurement: CaliperMeasurement = {
        id: `meas-${Date.now()}`,
        label: `Caliper WL #${measurements.length + 1}`,
        startX: caliperPoints.startX,
        startY: caliperPoints.startY,
        endX: clickX,
        endY: clickY,
        lengthMm,
      };
      setMeasurements([...measurements, newMeasurement]);
      setCaliperPoints(null);
      setIsCaliperActive(false);
    }
  };

  if (!activeImage) {
    return (
      <div className="surface-card space-y-4 p-6 text-center">
        <h2 className="text-sm font-bold text-slate-900">No films for {patientName}</h2>
        <p className="text-[13px] text-slate-500">
          Upload an RVG / IOPA from the sensor PC. Films save on this device for this patient.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadXray}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tactile-btn inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-4 py-2 text-xs font-semibold text-white"
        >
          <Upload className="h-3.5 w-3.5" />
          Add X-ray
        </button>
        {uploadHint && (
          <p className="text-xs font-medium text-teal-800">{uploadHint}</p>
        )}
      </div>
    );
  }

  const filterStyle = `contrast(${contrast}%) brightness(${brightness}%) ${
    isInverted ? 'invert(1)' : 'invert(0)'
  }`;

  const isSvgData = activeImage.imageUrl.startsWith('data:image/svg+xml');

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-[var(--color-brand)]">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-sans text-base font-bold tracking-tight text-slate-900">
                RVG / IOPA
              </h2>
              <span className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-600">
                {isDemo ? 'Upload · Caliper · AI demo' : 'Upload · Caliper'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isDemo
                ? 'Demo film loads by default · Upload JPG/PNG from the sensor PC'
                : 'Upload JPG/PNG from the sensor PC · no AI claims on live charts'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadXray}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="tactile-btn flex items-center space-x-1.5 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-hover)]"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Add X-ray</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSplitComparison(!showSplitComparison)}
            className={`tactile-btn flex items-center space-x-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold motion-colors ${
              showSplitComparison
                ? 'border-[var(--color-brand)] bg-teal-50 text-[var(--color-brand)]'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SplitSquareVertical className="h-3.5 w-3.5" />
            <span>{showSplitComparison ? 'Single View' : 'Pre / Post-Op Split'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="tactile-btn flex items-center space-x-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            title="Reset Filters"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {uploadHint && (
        <div className="text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
          {uploadHint}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img) => {
          const active = img.id === activeImage.id;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => selectImage(img)}
              className={`tactile-btn shrink-0 text-left px-3 py-2 rounded-lg border text-xs max-w-[200px] ${
                active
                  ? 'bg-teal-50 border-teal-300 text-teal-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="font-semibold truncate">{img.title}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">{img.captureDate}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 surface-card p-4 bg-slate-950 border-slate-800 flex flex-col items-center justify-center min-h-[500px] select-none relative overflow-hidden">
          <div className="w-full flex items-start justify-between gap-3 text-xs pb-3 mb-2 border-b border-slate-700">
            <span className="font-sans text-sm font-semibold text-white leading-snug max-w-[70%]">
              {activeImage.title}
            </span>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300 border border-slate-600">
                1px = {activeImage.calibratedMmPerPixel}mm
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
                className="text-slate-200 hover:text-white p-1 rounded bg-slate-800 border border-slate-600"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="text-slate-200 hover:text-white p-1 rounded bg-slate-800 border border-slate-600"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ transform: `scale(${zoomLevel})` }}
            className={`relative w-[400px] h-[480px] rounded-lg shadow-2xl transition-transform duration-100 bg-black ${
              isCaliperActive ? 'cursor-crosshair' : 'cursor-default'
            }`}
          >
            {!showSplitComparison ? (
              isSvgData ? (
                <div
                  style={{ filter: filterStyle }}
                  className="w-full h-full rounded-lg overflow-hidden transition-all"
                  dangerouslySetInnerHTML={{
                    __html: activeImage.imageUrl.replace('data:image/svg+xml;utf8,', ''),
                  }}
                />
              ) : (
                <img
                  src={activeImage.imageUrl}
                  alt={activeImage.title}
                  style={{ filter: filterStyle }}
                  className="w-full h-full object-contain rounded-lg"
                />
              )
            ) : (
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                {isSvgData ? (
                  <div
                    style={{ filter: filterStyle }}
                    className="absolute inset-0"
                    dangerouslySetInnerHTML={{
                      __html: activeImage.imageUrl.replace('data:image/svg+xml;utf8,', ''),
                    }}
                  />
                ) : (
                  <img
                    src={activeImage.imageUrl}
                    alt="Pre-op"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ filter: filterStyle }}
                  />
                )}
                <div
                  style={{
                    clipPath: `polygon(${splitPosition}% 0, 100% 0, 100% 100%, ${splitPosition}% 100%)`,
                    filter: filterStyle,
                  }}
                  className="absolute inset-0"
                  dangerouslySetInnerHTML={
                    isSvgData
                      ? {
                          __html: (
                            activeImage.comparisonAfterUrl || activeImage.imageUrl
                          ).replace('data:image/svg+xml;utf8,', ''),
                        }
                      : undefined
                  }
                >
                  {!isSvgData && (
                    <img
                      src={activeImage.comparisonAfterUrl || activeImage.imageUrl}
                      alt="Post-op"
                      className="w-full h-full object-contain"
                      style={{ filter: filterStyle }}
                    />
                  )}
                </div>
                <div
                  style={{ left: `${splitPosition}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none shadow-sm"
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-lg">
                    ⇄
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-white border border-slate-700">
                  Pre-Op
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-slate-900/80 px-2 py-0.5 rounded text-emerald-400 border border-slate-700">
                  Post-Op
                </div>
              </div>
            )}

            {isDemo &&
              showAiBBoxes &&
              !showSplitComparison &&
              activeImage.pathologyBoxes.map((box) => (
                <div
                  key={box.id}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                  className="absolute border-2 border-dashed border-red-500 bg-red-500/10 rounded pointer-events-none flex flex-col justify-between p-0.5"
                >
                  <span className="text-[9px] font-mono font-bold bg-red-600 text-white px-1 rounded w-max">
                    {box.label} ({(box.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}

            {measurements.map((m) => (
              <svg key={m.id} className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1={m.startX}
                  y1={m.startY}
                  x2={m.endX}
                  y2={m.endY}
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  strokeDasharray="4,2"
                />
                <circle cx={m.startX} cy={m.startY} r="4" fill="#06B6D4" />
                <circle cx={m.endX} cy={m.endY} r="4" fill="#06B6D4" />
                <text
                  x={(m.startX + m.endX) / 2 + 10}
                  y={(m.startY + m.endY) / 2}
                  fill="#06B6D4"
                  fontSize="12"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {m.lengthMm} mm
                </text>
              </svg>
            ))}

            {caliperPoints && (
              <div
                style={{ left: caliperPoints.startX - 4, top: caliperPoints.startY - 4 }}
                className="absolute w-3 h-3 rounded-full bg-cyan-400 ring-4 ring-cyan-400/40 pointer-events-none animate-ping"
              />
            )}
          </div>

          {showSplitComparison && (
            <div className="w-full max-w-sm mt-3 flex items-center space-x-2 text-xs text-slate-300">
              <span>Pre-Op</span>
              <input
                type="range"
                min="0"
                max="100"
                value={splitPosition}
                onChange={(e) => setSplitPosition(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span>Post-Op</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 surface-card p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Radiology tools
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              How to add: tap <strong>Add X-ray</strong>, pick JPG/PNG from your RVG export folder.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Contrast</span>
              <span className="font-mono text-blue-700">{contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Brightness</span>
              <span className="font-mono text-blue-700">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="180"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Invert</span>
              <span className="text-[11px] text-slate-400">Find fractures / canals</span>
            </div>
            <button
              type="button"
              onClick={() => setIsInverted(!isInverted)}
              className={`tactile-btn text-xs font-bold px-3 py-1 rounded border ${
                isInverted
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isInverted ? 'ON' : 'OFF'}
            </button>
          </div>

          {isDemo && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                AI pathology boxes · Demo
              </span>
              <span className="text-[11px] text-slate-400">Overlays on sample film only</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAiBBoxes(!showAiBBoxes)}
              className={`tactile-btn text-xs font-bold px-2.5 py-1 rounded border ${
                showAiBBoxes
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-400 border-slate-300'
              }`}
            >
              {showAiBBoxes ? 'ON' : 'OFF'}
            </button>
          </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsCaliperActive(!isCaliperActive);
                setCaliperPoints(null);
              }}
              className={`tactile-btn w-full flex items-center justify-center gap-2 text-xs font-bold px-3 py-2.5 rounded-lg border ${
                isCaliperActive
                  ? 'bg-cyan-600 text-white border-cyan-500'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Ruler className="w-4 h-4" />
              {isCaliperActive ? 'Click cusp tip → then apex' : 'Measure working length'}
            </button>
            {measurements.length > 0 && (
              <ul className="mt-2 space-y-1">
                {measurements.map((m) => (
                  <li
                    key={m.id}
                    className="text-[11px] font-mono text-cyan-800 bg-cyan-50 border border-cyan-100 rounded px-2 py-1"
                  >
                    {m.label}: {m.lengthMm} mm
                  </li>
                ))}
              </ul>
            )}
          </div>

          {activeImage.clinicalNotes && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Notes: </span>
              {activeImage.clinicalNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
