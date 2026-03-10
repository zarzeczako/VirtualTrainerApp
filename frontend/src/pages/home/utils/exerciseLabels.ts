const bodyPartLabels: Record<string, string> = {
  waist: 'Brzuch',
  'upper arms': 'Ramiona',
  back: 'Plecy',
  chest: 'Klatka piersiowa',
  'lower legs': 'Łydki',
  'upper legs': 'Nogi',
  shoulders: 'Barki',
  cardio: 'Cardio',
  neck: 'Szyja',
  'lower arms': 'Przedramiona',
}

const equipmentLabels: Record<string, string> = {
  'body weight': 'Własny ciężar',
  cable: 'Wyciąg',
  dumbbell: 'Hantle',
  barbell: 'Sztanga',
  band: 'Guma oporowa',
  kettlebell: 'Kettlebell',
  assisted: 'Wspomagane',
  'medicine ball': 'Piłka lekarska',
  'stability ball': 'Piłka stabilizacyjna',
  'resistance band': 'Taśma oporowa',
  'leverage machine': 'Maszyna dźwigniowa',
  rope: 'Lina',
  weighted: 'Obciążone',
  'bosu ball': 'Piłka Bosu',
  'ez barbell': 'Sztanga łamana',
  'sled machine': 'Sanki',
  'upper body ergometer': 'Ergometr',
  'stationary bike': 'Rower stacjonarny',
  'elliptical machine': 'Orbitrek',
  'skierg machine': 'SkiErg',
  hammer: 'Młot',
  'smith machine': 'Maszyna Smitha',
  roller: 'Wałek',
  'wheel roller': 'Wałek do brzucha',
  tire: 'Opona',
  'trap bar': 'Trap bar',
}

export const getBodyPartLabel = (bodyPart: string) => bodyPartLabels[bodyPart] ?? bodyPart

export const getEquipmentLabel = (equipment: string) =>
  equipmentLabels[equipment] ?? equipment
