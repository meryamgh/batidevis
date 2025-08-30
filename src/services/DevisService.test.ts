// Test file for DevisService
// This file can be used to test the DevisService functionality

import { DevisService, DevisData } from './DevisService';

// Example usage and testing
export const testDevisService = async () => {
  try {
    // Test data
    const testDevisData: DevisData = {
      info: {
        devoTitle: "BatiDevis",
        devoName: "Chen Emma",
        devoAddress: "73 Rue Rateau",
        devoCity: "93120 La Courneuve, France",
        devoSiren: "SIREN : 000.000.000.000",
        societeBatiment: "Société Bâtiment",
        clientAdresse: "20 rue le blanc",
        clientCodePostal: "75013 Paris",
        clientTel: "0678891223",
        clientEmail: "sociétébatiment@gmail.com",
        devisNumero: "123",
        enDateDu: "05/10/2024",
        valableJusquau: "04/12/2024",
        debutTravaux: "05/10/2024",
        dureeTravaux: "1 jour",
        fraisDeplacement: "",
        tauxHoraire: "",
        isDevisGratuit: true,
        logo: ""
      },
      lines: [
        {
          details: "Frais de déplacement - Déplacement standard (50,00€/déplacement)",
          price: 50,
          quantity: 1,
          unit: "déplacement"
        },
        {
          details: "Taux horaire - Taux standard (45,00€/heure)",
          price: 45,
          quantity: 1,
          unit: "heure"
        }
      ],
      totals: {
        totalHT: 95,
        totalTVA: 19,
        totalTTC: 114,
        acompte: 34.2,
        resteAPayer: 79.8,
        tvaRate: 0.2,
        acompteRate: 0.3
      }
    };

    console.log('🧪 Testing DevisService...');

    // Test debug auth
    console.log('1. Testing debug auth...');
    const authResult = await DevisService.debugAuth();
    console.log('Auth result:', authResult);

    // Test save devis
    console.log('2. Testing save devis...');
    const savedDevis = await DevisService.saveDevis(
      "Test Devis - Client ABC",
      testDevisData,
      "Devis de test pour validation"
    );
    console.log('Saved devis:', savedDevis);

    // Test get devis by id
    console.log('3. Testing get devis by id...');
    const retrievedDevis = await DevisService.getDevisById(savedDevis.id!);
    console.log('Retrieved devis:', retrievedDevis);

    // Test update status
    console.log('4. Testing update status...');
    const updatedDevis = await DevisService.updateDevisStatus(
      savedDevis.id!,
      'sent',
      'test-signature-request-id',
      'https://test-signature-url.com'
    );
    console.log('Updated devis:', updatedDevis);

    // Test get user devis
    console.log('5. Testing get user devis...');
    const userDevis = await DevisService.getUserDevis();
    console.log('User devis count:', userDevis.length);

    // Test delete devis
    console.log('6. Testing delete devis...');
    await DevisService.deleteDevis(savedDevis.id!);
    console.log('Devis deleted successfully');

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for use in browser console or other testing environments
if (typeof window !== 'undefined') {
  (window as any).testDevisService = testDevisService;
}
