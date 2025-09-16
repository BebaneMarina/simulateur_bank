// savings-products.service.ts - Service Angular pour les produits d'épargne
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Interfaces
export interface Bank {
  id: string;
  name: string;
  full_name?: string;
  logo_url?: string;
}

export interface SavingsProductBase {
  bank_id: string;
  name: string;
  type: string;
  description?: string;
  interest_rate: number;
  minimum_deposit: number;
  maximum_deposit?: number;
  minimum_balance: number;
  liquidity: string;
  notice_period_days: number;
  term_months?: number;
  compounding_frequency: string;
  fees?: any;
  features?: string[];
  advantages?: string[];
  tax_benefits?: string[];
  risk_level: number;
  early_withdrawal_penalty?: number;
  is_islamic_compliant: boolean;
  is_featured: boolean;
  is_active: boolean;
}

export interface SavingsProduct extends SavingsProductBase {
  id: string;
  created_at: string;
  updated_at: string;
  bank?: Bank;
}

export interface SavingsProductCreate extends SavingsProductBase {
  id?: string;
}

export interface SavingsProductUpdate extends Partial<SavingsProductBase> {}

export interface PaginatedSavingsProducts {
  products: SavingsProduct[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    pages: number;
    current_page: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SavingsProductFilters {
  search?: string;
  bank_id?: string;
  type?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface SavingsProductsStatistics {
  overview: {
    total_products: number;
    active_products: number;
    featured_products: number;
    inactive_products: number;
  };
  by_type: Array<{type: string; count: number}>;
  by_bank: Array<{bank_name: string; count: number}>;
  rates_by_type: Array<{
    type: string;
    avg_rate: number;
    min_rate: number;
    max_rate: number;
  }>;
}

export interface ApiResponse<T> {
  message?: string;
  product?: T;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SavingsProductsService {
  private readonly apiUrl = `${environment.apiUrl}/admin/savings-products`;
  
  // État local pour la cache et les notifications
  private productsSubject = new BehaviorSubject<SavingsProduct[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public products$ = this.productsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste des produits d'épargne avec pagination et filtres
   */
  getProducts(
    page: number = 1,
    limit: number = 50,
    filters: SavingsProductFilters = {}
  ): Observable<PaginatedSavingsProducts> {
    this.setLoading(true);
    this.clearError();

    let params = new HttpParams()
      .set('skip', ((page - 1) * limit).toString())
      .set('limit', limit.toString());

    // Ajout des filtres
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.bank_id) {
      params = params.set('bank_id', filters.bank_id);
    }
    if (filters.type) {
      params = params.set('type', filters.type);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.sort_by) {
      params = params.set('sort_by', filters.sort_by);
    }
    if (filters.sort_order) {
      params = params.set('sort_order', filters.sort_order);
    }

    return this.http.get<PaginatedSavingsProducts>(this.apiUrl, { params }).pipe(
      tap(response => {
        this.productsSubject.next(response.products);
        this.setLoading(false);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Récupère un produit d'épargne par son ID
   */
  getProduct(id: string): Observable<SavingsProduct> {
    this.setLoading(true);
    this.clearError();

    return this.http.get<SavingsProduct>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.setLoading(false)),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Crée un nouveau produit d'épargne
   */
  createProduct(productData: SavingsProductCreate): Observable<ApiResponse<SavingsProduct>> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<ApiResponse<SavingsProduct>>(this.apiUrl, productData).pipe(
      tap(response => {
        this.setLoading(false);
        // Actualiser la liste locale si nécessaire
        if (response.product) {
          const currentProducts = this.productsSubject.value;
          this.productsSubject.next([response.product, ...currentProducts]);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Met à jour un produit d'épargne
   */
  updateProduct(id: string, productData: SavingsProductUpdate): Observable<ApiResponse<any>> {
    this.setLoading(true);
    this.clearError();

    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}`, productData).pipe(
      tap(response => {
        this.setLoading(false);
        // Mettre à jour le produit dans la liste locale
        const currentProducts = this.productsSubject.value;
        const updatedProducts = currentProducts.map(product => 
          product.id === id ? { ...product, ...productData, updated_at: new Date().toISOString() } : product
        );
        this.productsSubject.next(updatedProducts);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Supprime un produit d'épargne
   */
  deleteProduct(id: string): Observable<ApiResponse<any>> {
    this.setLoading(true);
    this.clearError();

    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      tap(response => {
        this.setLoading(false);
        // Retirer le produit de la liste locale
        const currentProducts = this.productsSubject.value;
        const filteredProducts = currentProducts.filter(product => product.id !== id);
        this.productsSubject.next(filteredProducts);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Récupère la liste des banques pour les formulaires
   */
  getBanks(): Observable<{banks: Bank[]}> {
  // Corrigé pour correspondre à l'endpoint défini
  return this.http.get<{banks: Bank[]}>(`${this.apiUrl}/banks/list`).pipe(
    catchError(this.handleError.bind(this))
  );
}

  /**
   * Récupère les statistiques des produits d'épargne
   */
  getStatistics(): Observable<SavingsProductsStatistics> {
    return this.http.get<SavingsProductsStatistics>(`${this.apiUrl}/statistics/overview`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Active ou désactive un produit d'épargne
   */
  toggleProductStatus(id: string, isActive: boolean): Observable<ApiResponse<any>> {
    return this.updateProduct(id, { is_active: isActive });
  }

  /**
   * Met un produit en vedette ou le retire
   */
  toggleProductFeatured(id: string, isFeatured: boolean): Observable<ApiResponse<any>> {
    return this.updateProduct(id, { is_featured: isFeatured });
  }

  /**
   * Valide les données d'un produit avant soumission
   */
  validateProduct(productData: SavingsProductCreate | SavingsProductUpdate): string[] {
    const errors: string[] = [];

    // Validation des champs obligatoires pour la création
    if ('name' in productData) {
      if (!productData.name || productData.name.trim().length < 3) {
        errors.push('Le nom du produit doit contenir au moins 3 caractères');
      }
    }

    if ('bank_id' in productData) {
      if (!productData.bank_id) {
        errors.push('La banque est obligatoire');
      }
    }

    if ('type' in productData) {
      const validTypes = ['livret', 'terme', 'plan_epargne', 'professionnel'];
      if (!productData.type || !validTypes.includes(productData.type)) {
        errors.push('Le type de produit doit être: livret, terme, plan_epargne ou professionnel');
      }
    }

    // Validation des taux et montants
    if (productData.interest_rate !== undefined) {
      if (productData.interest_rate < 0 || productData.interest_rate > 100) {
        errors.push('Le taux d\'intérêt doit être entre 0 et 100%');
      }
    }

    if (productData.minimum_deposit !== undefined) {
      if (productData.minimum_deposit <= 0) {
        errors.push('Le dépôt minimum doit être positif');
      }
    }

    if (productData.maximum_deposit !== undefined && productData.minimum_deposit !== undefined) {
      if (productData.maximum_deposit <= productData.minimum_deposit) {
        errors.push('Le dépôt maximum doit être supérieur au dépôt minimum');
      }
    }

    if (productData.minimum_balance !== undefined && productData.minimum_deposit !== undefined) {
      if (productData.minimum_balance > productData.minimum_deposit) {
        errors.push('Le solde minimum ne peut pas être supérieur au dépôt minimum');
      }
    }

    if (productData.risk_level !== undefined) {
      if (productData.risk_level < 1 || productData.risk_level > 5) {
        errors.push('Le niveau de risque doit être entre 1 et 5');
      }
    }

    if (productData.early_withdrawal_penalty !== undefined) {
      if (productData.early_withdrawal_penalty < 0 || productData.early_withdrawal_penalty > 100) {
        errors.push('La pénalité de retrait anticipé doit être entre 0 et 100%');
      }
    }

    if (productData.notice_period_days !== undefined) {
      if (productData.notice_period_days < 0 || productData.notice_period_days > 365) {
        errors.push('La période de préavis doit être entre 0 et 365 jours');
      }
    }

    if (productData.term_months !== undefined) {
      if (productData.term_months < 1 || productData.term_months > 600) {
        errors.push('La durée doit être entre 1 et 600 mois');
      }
    }

    return errors;
  }

  /**
   * Formate un montant en FCFA
   */
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Obtient le libellé d'un type de produit
   */
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'livret': 'Livret d\'épargne',
      'terme': 'Dépôt à terme',
      'plan_epargne': 'Plan d\'épargne',
      'professionnel': 'Épargne professionnelle'
    };
    return labels[type] || type;
  }

  /**
   * Obtient le libellé d'un type de liquidité
   */
  getLiquidityLabel(liquidity: string): string {
    const labels: { [key: string]: string } = {
      'immediate': 'Immédiate',
      'notice': 'Avec préavis',
      'term': 'À terme'
    };
    return labels[liquidity] || liquidity;
  }

  /**
   * Obtient le libellé d'une fréquence de capitalisation
   */
  getCompoundingFrequencyLabel(frequency: string): string {
    const labels: { [key: string]: string } = {
      'daily': 'Quotidienne',
      'weekly': 'Hebdomadaire',
      'monthly': 'Mensuelle',
      'quarterly': 'Trimestrielle',
      'annually': 'Annuelle'
    };
    return labels[frequency] || frequency;
  }

  /**
   * Calcule le rendement annuel effectif
   */
  calculateEffectiveRate(interestRate: number, compoundingFrequency: string): number {
    const frequencies: { [key: string]: number } = {
      'daily': 365,
      'weekly': 52,
      'monthly': 12,
      'quarterly': 4,
      'annually': 1
    };

    const n = frequencies[compoundingFrequency] || 12;
    const r = interestRate / 100;
    
    return (Math.pow(1 + r/n, n) - 1) * 100;
  }

  /**
   * Exporte les produits au format CSV
   */
  exportToCsv(products: SavingsProduct[]): void {
    const headers = [
      'ID', 'Nom', 'Type', 'Banque', 'Taux (%)', 'Dépôt min', 'Dépôt max', 
      'Liquidité', 'Durée (mois)', 'Risque', 'Vedette', 'Actif', 'Créé le'
    ];

    const csvData = products.map(product => [
      product.id,
      product.name,
      this.getTypeLabel(product.type),
      product.bank?.name || '',
      product.interest_rate,
      product.minimum_deposit,
      product.maximum_deposit || '',
      this.getLiquidityLabel(product.liquidity),
      product.term_months || '',
      product.risk_level,
      product.is_featured ? 'Oui' : 'Non',
      product.is_active ? 'Actif' : 'Inactif',
      new Date(product.created_at).toLocaleDateString('fr-FR')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `produits-epargne-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Recherche rapide dans les produits
   */
  searchProducts(query: string, products: SavingsProduct[]): SavingsProduct[] {
    if (!query.trim()) {
      return products;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.type.toLowerCase().includes(searchTerm) ||
      product.bank?.name.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Trie les produits selon différents critères
   */
  sortProducts(products: SavingsProduct[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): SavingsProduct[] {
    const sortedProducts = [...products];

    sortedProducts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'interest_rate':
          aValue = a.interest_rate;
          bValue = b.interest_rate;
          break;
        case 'minimum_deposit':
          aValue = a.minimum_deposit;
          bValue = b.minimum_deposit;
          break;
        case 'bank_name':
          aValue = a.bank?.name.toLowerCase() || '';
          bValue = b.bank?.name.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'risk_level':
          aValue = a.risk_level;
          bValue = b.risk_level;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedProducts;
  }

  /**
   * Filtre les produits selon différents critères
   */
  filterProducts(
    products: SavingsProduct[], 
    filters: {
      bank_id?: string;
      type?: string;
      status?: string;
      min_rate?: number;
      max_rate?: number;
      risk_level?: number;
    }
  ): SavingsProduct[] {
    return products.filter(product => {
      if (filters.bank_id && product.bank_id !== filters.bank_id) {
        return false;
      }
      
      if (filters.type && product.type !== filters.type) {
        return false;
      }
      
      if (filters.status === 'active' && !product.is_active) {
        return false;
      }
      
      if (filters.status === 'inactive' && product.is_active) {
        return false;
      }
      
      if (filters.min_rate !== undefined && product.interest_rate < filters.min_rate) {
        return false;
      }
      
      if (filters.max_rate !== undefined && product.interest_rate > filters.max_rate) {
        return false;
      }
      
      if (filters.risk_level !== undefined && product.risk_level !== filters.risk_level) {
        return false;
      }
      
      return true;
    });
  }

  // Méthodes privées pour la gestion d'état
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string): void {
    this.errorSubject.next(error);
    this.setLoading(false);
  }

  private clearError(): void {
    this.errorSubject.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Erreur API:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage = error.error?.detail || 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé';
          break;
        case 403:
          errorMessage = 'Accès interdit';
          break;
        case 404:
          errorMessage = 'Ressource introuvable';
          break;
        case 409:
          errorMessage = error.error?.detail || 'Conflit de données';
          break;
        case 422:
          errorMessage = error.error?.detail || 'Erreur de validation';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.error?.detail || error.message}`;
      }
    }
    
    this.setError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}