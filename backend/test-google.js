const { SessionsClient } = require('@google-cloud/dialogflow');
const path = require('path');

// Dokładnie ta nazwa pliku, której używasz
const keyPath = path.join(__dirname, 'google-credentiols-dialogflow.json');

console.log('--- TESTOWANIE KLUCZA ---');
console.log('Szukam pliku w:', keyPath);

try {
  const client = new SessionsClient({
    keyFilename: keyPath
  });
  
  console.log('1. Plik znaleziony i załadowany.');
  console.log('2. Projekt ID z klucza:', client.projectId);
  
  // Próba uwierzytelnienia
  client.getProjectId().then(id => {
      console.log('3. SUKCES! Uwierzytelnienie działa. ID:', id);
  }).catch(err => {
      console.error('3. BŁĄD UWIERZYTELNIENIA (16 UNAUTHENTICATED):');
      console.error(err.message);
      console.log('WNIOSEK: Plik jest czytelny, ale klucz w środku jest zablokowany lub ma zły format.');
  });

} catch (e) {
  console.error('BŁĄD KRYTYCZNY (Nie znaleziono pliku lub zły JSON):', e.message);
}