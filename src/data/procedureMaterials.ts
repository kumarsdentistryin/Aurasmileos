export const PROCEDURE_MATERIALS: Record<
  string,
  { itemName: string; quantity: number }[]
> = {
  RCT: [
    { itemName: 'Rotary Files', quantity: 3 },
    { itemName: 'Gutta-Percha Points', quantity: 5 },
    { itemName: 'Lignocaine Cartridge', quantity: 2 },
    { itemName: 'Disposable Gloves (pair)', quantity: 2 },
  ],
  'Composite Filling': [
    { itemName: 'Composite Resin (g)', quantity: 2 },
    { itemName: 'Bonding Agent (ml)', quantity: 0.5 },
    { itemName: 'Lignocaine Cartridge', quantity: 1 },
    { itemName: 'Disposable Gloves (pair)', quantity: 1 },
  ],
  'Scaling & Polishing': [
    { itemName: 'Prophy Paste (g)', quantity: 5 },
    { itemName: 'Disposable Gloves (pair)', quantity: 1 },
  ],
  'Crown Cementation': [
    { itemName: 'GIC Luting Cement (ml)', quantity: 2 },
    { itemName: 'Disposable Gloves (pair)', quantity: 1 },
  ],
  Extraction: [
    { itemName: 'Lignocaine Cartridge', quantity: 2 },
    { itemName: 'Sutures (pack)', quantity: 1 },
    { itemName: 'Disposable Gloves (pair)', quantity: 2 },
  ],
};

/** Match procedure name to materials (case-insensitive partial match). */
export function getMaterialsForProcedure(
  procedureName: string
): { itemName: string; quantity: number }[] {
  const key = Object.keys(PROCEDURE_MATERIALS).find((k) =>
    procedureName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PROCEDURE_MATERIALS[key] : [];
}
