const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, '..', 'data', 'exercises.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const bodyParts = new Set();
  const targets = new Set();
  const equipments = new Set();

  parsed.forEach((ex) => {
    if (ex.bodyPart) bodyParts.add(ex.bodyPart);
    if (ex.target) targets.add(ex.target);
    if (ex.equipment) equipments.add(ex.equipment);
  });

  const bp = Array.from(bodyParts).sort();
  const tg = Array.from(targets).sort();
  const eq = Array.from(equipments).sort();

  console.log('bodyPart count:', bp.length);
  console.log('target count:', tg.length);
  console.log('equipment count:', eq.length);
  console.log('total features (sum):', bp.length + tg.length + eq.length);
  console.log('\nSamples:');
  console.log('bodyPart sample:', bp.slice(0, 20));
  console.log('target sample:', tg.slice(0, 20));
  console.log('equipment sample:', eq.slice(0, 20));
} catch (err) {
  console.error('Error reading or parsing exercises.json', err.message);
  process.exit(1);
}
