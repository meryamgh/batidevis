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

    
    const authResult = await DevisService.debugAuth();
    console.log('Auth result:', authResult);
 
    const savedDevis = await DevisService.saveDevis(
      "Test Devis - Client ABC",
      testDevisData,
      "Devis de test pour validation"
    );
    console.log('Saved devis:', savedDevis);
 
    const retrievedDevis = await DevisService.getDevisById(savedDevis.id!); 
console.log("retrievedDevis", retrievedDevis);
     
 
    await DevisService.deleteDevis(savedDevis.id!); 

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for use in browser console or other testing environments
if (typeof window !== 'undefined') {
  (window as any).testDevisService = testDevisService;
}
