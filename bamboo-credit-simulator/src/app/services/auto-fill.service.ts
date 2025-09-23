// auto-fill.service.ts

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface SimulationData {
  // Données communes
  age?: number;
  city?: string;
  
  // Auto
  vehicleCategory?: string;
  vehicleValue?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  
  // Habitation
  propertyType?: string;
  propertyValue?: number;
  propertyAddress?: string;
  surface?: number;
  constructionYear?: number;
  
  // Vie
  coverageAmount?: number;
  healthStatus?: string;
  beneficiaries?: string;
  smokingStatus?: string;
  
  // Santé
  familySize?: string;
  coverageLevel?: string;
  medicalHistory?: string;
  currentTreatments?: string;
  
  // Voyage
  destination?: string;
  duration?: number;
  tripStartDate?: string;
  activities?: string;
  
  // Transport
  cargoType?: string;
  cargoValue?: number;
  transportMode?: string;
  transportRoute?: string;
  transportDate?: string;
  cargoDescription?: string;
  
  // Garanties et sélections
  selectedGuarantees?: string[];
  selectedInsurers?: string[];
  contractType?: string;
  medicalNeeds?: string[];
  travelRisks?: string[];
  
  // Métadonnées
  insuranceType?: string;
  simulationDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AutoFillService {
  private simulationDataKey = 'insurance_simulation_data';

  /**
   * Sauvegarde les données de simulation
   */
  saveSimulationData(
    formData: any, 
    insuranceType: string, 
    selections: {
      guarantees: string[],
      insurers: string[],
      contractType?: string,
      medicalNeeds?: string[],
      travelRisks?: string[]
    }
  ): void {
    const simulationData: SimulationData = {
      // Données communes
      age: formData.age,
      city: formData.city,
      
      // Données spécifiques par type
      ...this.extractTypeSpecificData(formData, insuranceType),
      
      // Sélections utilisateur
      selectedGuarantees: selections.guarantees,
      selectedInsurers: selections.insurers,
      contractType: selections.contractType,
      medicalNeeds: selections.medicalNeeds,
      travelRisks: selections.travelRisks,
      
      // Métadonnées
      insuranceType: insuranceType,
      simulationDate: new Date().toISOString()
    };

    console.log('💾 Sauvegarde des données de simulation:', simulationData);
    
    try {
      // Utiliser sessionStorage pour la session courante
      sessionStorage.setItem(this.simulationDataKey, JSON.stringify(simulationData));
      
      // Optionnel : aussi en localStorage pour persistence
      localStorage.setItem(this.simulationDataKey + '_backup', JSON.stringify(simulationData));
      
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder les données de simulation:', error);
    }
  }

  /**
   * Récupère les données de simulation sauvegardées
   */
  getSimulationData(): SimulationData | null {
    try {
      // Essayer d'abord sessionStorage
      let dataStr = sessionStorage.getItem(this.simulationDataKey);
      
      // Si pas trouvé, essayer localStorage
      if (!dataStr) {
        dataStr = localStorage.getItem(this.simulationDataKey + '_backup');
      }
      
      if (dataStr) {
        const data = JSON.parse(dataStr) as SimulationData;
        console.log('📖 Données de simulation récupérées:', data);
        return data;
      }
      
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération des données de simulation:', error);
    }
    
    return null;
  }

  /**
   * Prérempli un formulaire avec les données de simulation
   */
  prefillApplicationForm(form: FormGroup, insuranceType: string): boolean {
    const simulationData = this.getSimulationData();
    
    if (!simulationData || simulationData.insuranceType !== insuranceType) {
      console.log('❌ Aucune donnée de simulation compatible trouvée');
      return false;
    }

    console.log('🔄 Préremplissage du formulaire avec:', simulationData);

    // Préremplissage des champs de base
    this.setFormValue(form, 'birth_date', this.calculateBirthDate(simulationData.age));
    this.setFormValue(form, 'applicant_address', this.formatAddress(simulationData.city));
    this.setFormValue(form, 'profession', this.inferProfession(simulationData));

    // Préremplissage spécifique par type
    switch (insuranceType) {
      case 'auto':
        this.prefillAutoData(form, simulationData);
        break;
      case 'habitation':
        this.prefillHabitationData(form, simulationData);
        break;
      case 'vie':
        this.prefillVieData(form, simulationData);
        break;
      case 'sante':
        this.prefillSanteData(form, simulationData);
        break;
      case 'voyage':
        this.prefillVoyageData(form, simulationData);
        break;
      case 'transport':
        this.prefillTransportData(form, simulationData);
        break;
    }

    // Marquer les champs comme non-touchés pour éviter les erreurs de validation
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      if (control && control.value) {
        control.markAsUntouched();
      }
    });

    return true;
  }

  /**
   * Extrait les données spécifiques selon le type d'assurance
   */
  private extractTypeSpecificData(formData: any, insuranceType: string): Partial<SimulationData> {
    switch (insuranceType) {
      case 'auto':
        return {
          vehicleCategory: formData.vehicleCategory,
          vehicleValue: formData.vehicleValue,
          vehicleMake: formData.vehicleMake,
          vehicleModel: formData.vehicleModel,
          vehicleYear: formData.vehicleYear
        };
        
      case 'habitation':
        return {
          propertyType: formData.propertyType,
          propertyValue: formData.propertyValue,
          propertyAddress: formData.propertyAddress,
          surface: formData.surface,
          constructionYear: formData.constructionYear
        };
        
      case 'vie':
        return {
          coverageAmount: formData.coverageAmount,
          healthStatus: formData.healthStatus,
          smokingStatus: formData.smokingStatus,
          beneficiaries: formData.beneficiaries
        };
        
      case 'sante':
        return {
          familySize: formData.familySize,
          coverageLevel: formData.coverageLevel,
          medicalHistory: formData.medicalHistory,
          currentTreatments: formData.currentTreatments
        };
        
      case 'voyage':
        return {
          destination: formData.destination,
          duration: formData.duration,
          activities: formData.activities
        };
        
      case 'transport':
        return {
          cargoType: formData.cargoType,
          cargoValue: formData.cargoValue,
          transportMode: formData.transportMode
        };
        
      default:
        return {};
    }
  }

  /**
   * Préremplissage pour assurance auto
   */
  private prefillAutoData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'vehicle_make', data.vehicleMake);
    this.setFormValue(form, 'vehicle_model', data.vehicleModel);
    this.setFormValue(form, 'vehicle_year', data.vehicleYear);
    this.setFormValue(form, 'vehicle_value', data.vehicleValue);
  }

  /**
   * Préremplissage pour assurance habitation
   */
  private prefillHabitationData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'property_type', data.propertyType);
    this.setFormValue(form, 'property_value', data.propertyValue);
    this.setFormValue(form, 'property_address', data.propertyAddress || this.formatAddress(data.city));
  }

  /**
   * Préremplissage pour assurance vie
   */
  private prefillVieData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'coverage_amount', data.coverageAmount);
    this.setFormValue(form, 'beneficiaries', data.beneficiaries);
    this.setFormValue(form, 'medical_history', this.formatMedicalHistory(data.healthStatus));
  }

  /**
   * Préremplissage pour assurance santé
   */
  private prefillSanteData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'medical_history', data.medicalHistory);
    this.setFormValue(form, 'current_treatments', data.currentTreatments);
  }

  /**
   * Préremplissage pour assurance voyage
   */
  private prefillVoyageData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'trip_destination', data.destination);
    this.setFormValue(form, 'trip_duration', data.duration);
    this.setFormValue(form, 'trip_start_date', data.tripStartDate || this.getDefaultTripDate());
    this.setFormValue(form, 'trip_activities', data.activities);
  }

  /**
   * Préremplissage pour assurance transport
   */
  private prefillTransportData(form: FormGroup, data: SimulationData): void {
    this.setFormValue(form, 'cargo_description', data.cargoDescription || this.formatCargoDescription(data.cargoType));
    this.setFormValue(form, 'transport_route', data.transportRoute || this.getDefaultRoute(data.city));
    this.setFormValue(form, 'transport_date', data.transportDate || this.getDefaultTransportDate());
  }

  /**
   * Définit une valeur dans le formulaire de manière sécurisée
   */
  private setFormValue(form: FormGroup, controlName: string, value: any): void {
    if (value !== undefined && value !== null && value !== '') {
      const control = form.get(controlName);
      if (control) {
        control.setValue(value);
        console.log(`✅ ${controlName} prérempli avec:`, value);
      }
    }
  }

  /**
   * Calcule la date de naissance à partir de l'âge
   */
  private calculateBirthDate(age?: number): string | undefined {
    if (!age) return undefined;
    
    const birthYear = new Date().getFullYear() - age;
    return `${birthYear}-01-01`; // Date approximative
  }

  /**
   * Formate l'adresse à partir de la ville
   */
  private formatAddress(city?: string): string | undefined {
    if (!city) return undefined;
    
    const addressTemplates: { [key: string]: string } = {
      'libreville': 'Quartier Glass, Libreville',
      'port-gentil': 'Centre-ville, Port-Gentil',
      'franceville': 'Centre-ville, Franceville',
      'oyem': 'Centre-ville, Oyem'
    };
    
    return addressTemplates[city] || `Centre-ville, ${city}`;
  }

  /**
   * Infère une profession par défaut basée sur les données
   */
  private inferProfession(data: SimulationData): string {
    // Logique simple d'inférence basée sur les montants
    if (data.vehicleValue && data.vehicleValue > 20000000) return 'Cadre dirigeant';
    if (data.propertyValue && data.propertyValue > 50000000) return 'Chef d\'entreprise';
    if (data.coverageAmount && data.coverageAmount > 100000000) return 'Profession libérale';
    
    return 'Employé'; // Valeur par défaut
  }

  /**
   * Formate l'historique médical à partir du statut santé
   */
  private formatMedicalHistory(healthStatus?: string): string | undefined {
    if (!healthStatus) return undefined;
    
    const historyMap: { [key: string]: string } = {
      'excellent': 'Aucun antécédent médical particulier',
      'bon': 'Suivi médical régulier, aucun problème majeur',
      'moyen': 'Quelques antécédents mineurs',
      'fragile': 'Suivi médical spécialisé en cours'
    };
    
    return historyMap[healthStatus];
  }

  /**
   * Date par défaut pour les voyages (dans 1 mois)
   */
  private getDefaultTripDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  }

  /**
   * Description de cargo par défaut
   */
  private formatCargoDescription(cargoType?: string): string | undefined {
    if (!cargoType) return undefined;
    
    const descriptions: { [key: string]: string } = {
      'generale': 'Marchandises générales diverses',
      'perissable': 'Produits alimentaires périssables',
      'fragile': 'Équipements électroniques et fragiles',
      'dangereux': 'Matières dangereuses selon réglementation',
      'vehicules': 'Véhicules automobiles',
      'conteneur': 'Transport par conteneur'
    };
    
    return descriptions[cargoType];
  }

  /**
   * Itinéraire par défaut
   */
  private getDefaultRoute(city?: string): string | undefined {
    if (!city) return undefined;
    
    return `${city} - Port de Libreville`;
  }

  /**
   * Date par défaut pour transport (dans 2 semaines)
   */
  private getDefaultTransportDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  }

  /**
   * Nettoie les données sauvegardées
   */
  clearSimulationData(): void {
    try {
      sessionStorage.removeItem(this.simulationDataKey);
      localStorage.removeItem(this.simulationDataKey + '_backup');
      console.log('🗑️ Données de simulation nettoyées');
    } catch (error) {
      console.warn('⚠️ Erreur lors du nettoyage:', error);
    }
  }
}
