# routers/bank_admin.py - Router d'administration des banques
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, case, text
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import models
import schemas
import os
import shutil
import base64
import sqlalchemy
import csv
import io
from pathlib import Path
from database import get_db

router = APIRouter(tags=["bank_admin"]) 
UPLOAD_DIR = Path("uploads/banks")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ==================== CRUD OPERATIONS ====================

@router.get("", response_model=schemas.BankListResponse)
async def get_banks_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    rating: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupère toutes les banques avec statistiques pour l'admin"""
    try:
        # Requête de base avec les statistiques
        base_query = db.query(models.Bank)
        
        # Application des filtres
        filters = []
        
        if search:
            search_filter = f"%{search}%"
            filters.append(or_(
                models.Bank.name.ilike(search_filter),
                models.Bank.full_name.ilike(search_filter),
                models.Bank.description.ilike(search_filter),
                models.Bank.id.ilike(search_filter)
            ))
        
        if is_active is not None:
            filters.append(models.Bank.is_active == is_active)
            
        if rating:
            filters.append(models.Bank.rating == rating)

        if filters:
            base_query = base_query.filter(and_(*filters))

        # Compter le total
        total = base_query.count()

        # Récupérer les banques avec pagination
        banks_query = base_query.order_by(desc(models.Bank.created_at)).offset(skip).limit(limit)
        banks = banks_query.all()

        # Pour chaque banque, calculer les statistiques
        result_banks = []
        for bank in banks:
            # Compter les produits de crédit
            credit_products_count = db.query(models.CreditProduct).filter(
                models.CreditProduct.bank_id == bank.id,
                models.CreditProduct.is_active == True
            ).count()

            # Compter les produits d'épargne
            savings_products_count = db.query(models.SavingsProduct).filter(
                models.SavingsProduct.bank_id == bank.id,
                models.SavingsProduct.is_active == True
            ).count()

            # Compter les simulations de crédit
            credit_simulations_count = db.query(models.CreditSimulation).join(
                models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
            ).filter(models.CreditProduct.bank_id == bank.id).count()

            # Compter les simulations d'épargne
            savings_simulations_count = db.query(models.SavingsSimulation).join(
                models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
            ).filter(models.SavingsProduct.bank_id == bank.id).count()

            # Dernière simulation
            last_credit_sim = db.query(func.max(models.CreditSimulation.created_at)).join(
                models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
            ).filter(models.CreditProduct.bank_id == bank.id).scalar()

            last_savings_sim = db.query(func.max(models.SavingsSimulation.created_at)).join(
                models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
            ).filter(models.SavingsProduct.bank_id == bank.id).scalar()

            last_simulation_date = None
            if last_credit_sim and last_savings_sim:
                last_simulation_date = max(last_credit_sim, last_savings_sim)
            elif last_credit_sim:
                last_simulation_date = last_credit_sim
            elif last_savings_sim:
                last_simulation_date = last_savings_sim

            # Créer l'objet bank avec statistiques
            bank_data = {
                "id": bank.id,
                "name": bank.name,
                "full_name": bank.full_name,
                "description": bank.description,
                "logo_url": bank.logo_url,
                "website": bank.website,
                "contact_phone": bank.contact_phone,
                "contact_email": bank.contact_email,
                "address": bank.address,
                "swift_code": bank.swift_code,
                "license_number": bank.license_number,
                "established_year": bank.established_year,
                "total_assets": float(bank.total_assets) if bank.total_assets else None,
                "rating": bank.rating,
                "is_active": bank.is_active,
                "created_at": bank.created_at,
                "updated_at": bank.updated_at,
                "credit_products_count": credit_products_count,
                "savings_products_count": savings_products_count,
                "total_simulations": credit_simulations_count + savings_simulations_count,
                "last_simulation_date": last_simulation_date
            }
            
            result_banks.append(bank_data)

        return {
            "banks": result_banks,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    except Exception as e:
        print(f"Erreur get_banks_admin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des banques: {str(e)}")

@router.get("/stats")
async def get_banks_stats(db: Session = Depends(get_db)):
    """Récupère les statistiques globales des banques"""
    try:
        # Statistiques des banques
        total_banks = db.query(models.Bank).count()
        active_banks = db.query(models.Bank).filter(models.Bank.is_active == True).count()
        
        # Statistiques des produits
        total_credit_products = db.query(models.CreditProduct).filter(models.CreditProduct.is_active == True).count()
        total_savings_products = db.query(models.SavingsProduct).filter(models.SavingsProduct.is_active == True).count()
        
        # Statistiques des simulations
        total_credit_simulations = db.query(models.CreditSimulation).count()
        total_savings_simulations = db.query(models.SavingsSimulation).count()
        total_simulations = total_credit_simulations + total_savings_simulations
        
        # Simulations ce mois-ci
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        credit_simulations_month = db.query(models.CreditSimulation).filter(
            models.CreditSimulation.created_at >= current_month
        ).count()
        savings_simulations_month = db.query(models.SavingsSimulation).filter(
            models.SavingsSimulation.created_at >= current_month
        ).count()
        simulations_month = credit_simulations_month + savings_simulations_month
        
        # Top banques par simulations (calcul simplifié)
        top_banks = []
        banks = db.query(models.Bank).limit(10).all()
        for bank in banks:
            # Compter toutes les simulations pour cette banque
            credit_sims = db.query(models.CreditSimulation).join(
                models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
            ).filter(models.CreditProduct.bank_id == bank.id).count()
            
            savings_sims = db.query(models.SavingsSimulation).join(
                models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
            ).filter(models.SavingsProduct.bank_id == bank.id).count()
            
            total_bank_sims = credit_sims + savings_sims
            if total_bank_sims > 0:
                top_banks.append({
                    "bank_id": bank.id,
                    "bank_name": bank.name,
                    "simulations_count": total_bank_sims
                })
        
        # Trier les top banques
        top_banks = sorted(top_banks, key=lambda x: x['simulations_count'], reverse=True)[:5]

        result = {
            "banks": {
                "total": total_banks,
                "active": active_banks,
                "inactive": total_banks - active_banks
            },
            "products": {
                "credit_total": total_credit_products,
                "savings_total": total_savings_products,
                "total": total_credit_products + total_savings_products
            },
            "simulations": {
                "total": total_simulations,
                "this_month": simulations_month
            },
            "top_banks": top_banks
        }

        return result

    except Exception as e:
        print(f"Erreur get_banks_stats: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des statistiques: {str(e)}")

@router.get("/validate-id")
async def validate_bank_id(id: str = Query(...), db: Session = Depends(get_db)):
    """Valide la disponibilité d'un ID de banque"""
    try:
        existing_bank = db.query(models.Bank).filter(models.Bank.id == id).first()
        return {"available": existing_bank is None}
    except Exception as e:
        print(f"Erreur validate_bank_id: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la validation")

@router.get("/{bank_id}")
async def get_bank_admin(bank_id: str, db: Session = Depends(get_db)):
    """Récupère une banque par son ID avec statistiques"""
    try:
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Calculer les statistiques
        credit_products_count = db.query(models.CreditProduct).filter(
            models.CreditProduct.bank_id == bank_id,
            models.CreditProduct.is_active == True
        ).count()

        savings_products_count = db.query(models.SavingsProduct).filter(
            models.SavingsProduct.bank_id == bank_id,
            models.SavingsProduct.is_active == True
        ).count()

        credit_simulations_count = db.query(models.CreditSimulation).join(
            models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
        ).filter(models.CreditProduct.bank_id == bank_id).count()

        savings_simulations_count = db.query(models.SavingsSimulation).join(
            models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
        ).filter(models.SavingsProduct.bank_id == bank_id).count()

        return {
            "id": bank.id,
            "name": bank.name,
            "full_name": bank.full_name,
            "description": bank.description,
            "logo_url": bank.logo_url,
            "website": bank.website,
            "contact_phone": bank.contact_phone,
            "contact_email": bank.contact_email,
            "address": bank.address,
            "swift_code": bank.swift_code,
            "license_number": bank.license_number,
            "established_year": bank.established_year,
            "total_assets": float(bank.total_assets) if bank.total_assets else None,
            "rating": bank.rating,
            "is_active": bank.is_active,
            "created_at": bank.created_at,
            "updated_at": bank.updated_at,
            "credit_products_count": credit_products_count,
            "savings_products_count": savings_products_count,
            "total_simulations": credit_simulations_count + savings_simulations_count
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_bank_admin: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de la banque")

@router.post("")
async def create_bank_admin(bank: schemas.BankCreate, db: Session = Depends(get_db)):
    """Crée une nouvelle banque"""
    try:
        # Vérifier si l'ID existe déjà 
        existing_bank = db.query(models.Bank).filter(models.Bank.id == bank.id).first()
        if existing_bank:
            raise HTTPException(status_code=409, detail="Une banque avec cet ID existe déjà")

        # Créer la banque
        bank_data = bank.dict()
        db_bank = models.Bank(**bank_data)
        db.add(db_bank)
        db.commit()
        db.refresh(db_bank)

        # Retourner la banque créée avec statistiques
        return {
            "id": db_bank.id,
            "name": db_bank.name,
            "full_name": db_bank.full_name,
            "description": db_bank.description,
            "logo_url": db_bank.logo_url,
            "website": db_bank.website,
            "contact_phone": db_bank.contact_phone,
            "contact_email": db_bank.contact_email,
            "address": db_bank.address,
            "swift_code": db_bank.swift_code,
            "license_number": db_bank.license_number,
            "established_year": db_bank.established_year,
            "total_assets": float(db_bank.total_assets) if db_bank.total_assets else None,
            "rating": db_bank.rating,
            "is_active": db_bank.is_active,
            "created_at": db_bank.created_at,
            "updated_at": db_bank.updated_at,
            "credit_products_count": 0,
            "savings_products_count": 0,
            "total_simulations": 0
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur create_bank_admin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erreur lors de la création de la banque")

@router.put("/{bank_id}")
async def update_bank_admin(bank_id: str, bank_update: schemas.BankUpdate, db: Session = Depends(get_db)):
    """Met à jour une banque"""
    try:
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Mettre à jour les champs
        update_data = bank_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_bank, field, value)

        db.commit()
        db.refresh(db_bank)

        # Calculer les statistiques pour la réponse
        credit_products_count = db.query(models.CreditProduct).filter(
            models.CreditProduct.bank_id == bank_id,
            models.CreditProduct.is_active == True
        ).count()

        savings_products_count = db.query(models.SavingsProduct).filter(
            models.SavingsProduct.bank_id == bank_id,
            models.SavingsProduct.is_active == True
        ).count()

        credit_simulations_count = db.query(models.CreditSimulation).join(
            models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
        ).filter(models.CreditProduct.bank_id == bank_id).count()

        savings_simulations_count = db.query(models.SavingsSimulation).join(
            models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
        ).filter(models.SavingsProduct.bank_id == bank_id).count()

        return {
            "id": db_bank.id,
            "name": db_bank.name,
            "full_name": db_bank.full_name,
            "description": db_bank.description,
            "logo_url": db_bank.logo_url,
            "website": db_bank.website,
            "contact_phone": db_bank.contact_phone,
            "contact_email": db_bank.contact_email,
            "address": db_bank.address,
            "swift_code": db_bank.swift_code,
            "license_number": db_bank.license_number,
            "established_year": db_bank.established_year,
            "total_assets": float(db_bank.total_assets) if db_bank.total_assets else None,
            "rating": db_bank.rating,
            "is_active": db_bank.is_active,
            "created_at": db_bank.created_at,
            "updated_at": db_bank.updated_at,
            "credit_products_count": credit_products_count,
            "savings_products_count": savings_products_count,
            "total_simulations": credit_simulations_count + savings_simulations_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update_bank_admin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour de la banque")

@router.delete("/{bank_id}")
async def delete_bank_admin(bank_id: str, db: Session = Depends(get_db)):
    """Supprime une banque"""
    try:
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Vérifier s'il y a des produits liés
        credit_products = db.query(models.CreditProduct).filter(models.CreditProduct.bank_id == bank_id).count()
        savings_products = db.query(models.SavingsProduct).filter(models.SavingsProduct.bank_id == bank_id).count()
        
        if credit_products > 0 or savings_products > 0:
            raise HTTPException(
                status_code=409, 
                detail=f"Impossible de supprimer la banque. Elle a {credit_products} produits de crédit et {savings_products} produits d'épargne associés."
            )

        bank_name = db_bank.name
        db.delete(db_bank)
        db.commit()

        return {"message": f"Banque '{bank_name}' supprimée avec succès"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_bank_admin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression de la banque")

# ==================== ENDPOINTS SUPPLÉMENTAIRES ====================

@router.get("/{bank_id}/products")
async def get_bank_products(bank_id: str, db: Session = Depends(get_db)):
    """Récupère les produits d'une banque"""
    try:
        # Vérifier que la banque existe
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Récupérer les produits de crédit
        credit_products = db.query(models.CreditProduct).filter(
            models.CreditProduct.bank_id == bank_id
        ).all()

        # Récupérer les produits d'épargne
        savings_products = db.query(models.SavingsProduct).filter(
            models.SavingsProduct.bank_id == bank_id
        ).all()

        return {
            "credit": [
                {
                    "id": p.id,
                    "name": p.name,
                    "type": p.type,
                    "average_rate": float(p.average_rate),
                    "min_amount": float(p.min_amount),
                    "max_amount": float(p.max_amount),
                    "is_active": p.is_active,
                    "created_at": p.created_at
                } for p in credit_products
            ],
            "savings": [
                {
                    "id": p.id,
                    "name": p.name,
                    "type": p.type,
                    "interest_rate": float(p.interest_rate),
                    "minimum_deposit": float(p.minimum_deposit),
                    "maximum_deposit": float(p.maximum_deposit) if p.maximum_deposit else None,
                    "is_active": p.is_active,
                    "created_at": p.created_at
                } for p in savings_products
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_bank_products: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des produits")

@router.get("/{bank_id}/simulations")
async def get_bank_simulations(
    bank_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Récupère les simulations d'une banque"""
    try:
        # Vérifier que la banque existe
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Récupérer les simulations de crédit
        credit_simulations = db.query(models.CreditSimulation).join(
            models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
        ).filter(
            models.CreditProduct.bank_id == bank_id
        ).order_by(desc(models.CreditSimulation.created_at)).offset(skip).limit(limit).all()

        # Récupérer les simulations d'épargne
        savings_simulations = db.query(models.SavingsSimulation).join(
            models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
        ).filter(
            models.SavingsProduct.bank_id == bank_id
        ).order_by(desc(models.SavingsSimulation.created_at)).offset(skip).limit(limit).all()

        # Compter le total
        total_credit = db.query(models.CreditSimulation).join(
            models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
        ).filter(models.CreditProduct.bank_id == bank_id).count()

        total_savings = db.query(models.SavingsSimulation).join(
            models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
        ).filter(models.SavingsProduct.bank_id == bank_id).count()

        return {
            "credit_simulations": [
                {
                    "id": s.id,
                    "product_name": s.credit_product.name if s.credit_product else "Produit supprimé",
                    "requested_amount": float(s.requested_amount),
                    "duration_months": s.duration_months,
                    "monthly_payment": float(s.monthly_payment),
                    "applied_rate": float(s.applied_rate),
                    "eligible": s.eligible,
                    "created_at": s.created_at
                } for s in credit_simulations
            ],
            "savings_simulations": [
                {
                    "id": s.id,
                    "product_name": s.savings_product.name if s.savings_product else "Produit supprimé",
                    "initial_amount": float(s.initial_amount),
                    "monthly_contribution": float(s.monthly_contribution),
                    "duration_months": s.duration_months,
                    "final_amount": float(s.final_amount),
                    "created_at": s.created_at
                } for s in savings_simulations
            ],
            "total_credit": total_credit,
            "total_savings": total_savings
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_bank_simulations: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des simulations")

@router.get("/{bank_id}/performance")
async def get_bank_performance(
    bank_id: str,
    period: str = Query("6m", regex="^(1m|3m|6m|1y|2y)$"),
    db: Session = Depends(get_db)
):
    """Récupère les performances d'une banque sur une période"""
    try:
        # Vérifier que la banque existe
        bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Calculer la période
        period_map = {
            "1m": 1,
            "3m": 3,
            "6m": 6,
            "1y": 12,
            "2y": 24
        }
        months = period_map.get(period, 6)
        start_date = datetime.now() - timedelta(days=months * 30)

        # Statistiques par mois pour les crédits
        credit_monthly = db.query(
            func.date_trunc('month', models.CreditSimulation.created_at).label('month'),
            func.count(models.CreditSimulation.id).label('count'),
            func.sum(models.CreditSimulation.requested_amount).label('volume')
        ).join(
            models.CreditProduct, models.CreditSimulation.credit_product_id == models.CreditProduct.id
        ).filter(
            models.CreditProduct.bank_id == bank_id,
            models.CreditSimulation.created_at >= start_date
        ).group_by('month').order_by('month').all()

        # Statistiques par mois pour l'épargne
        savings_monthly = db.query(
            func.date_trunc('month', models.SavingsSimulation.created_at).label('month'),
            func.count(models.SavingsSimulation.id).label('count'),
            func.sum(models.SavingsSimulation.initial_amount + models.SavingsSimulation.monthly_contribution * models.SavingsSimulation.duration_months).label('volume')
        ).join(
            models.SavingsProduct, models.SavingsSimulation.savings_product_id == models.SavingsProduct.id
        ).filter(
            models.SavingsProduct.bank_id == bank_id,
            models.SavingsSimulation.created_at >= start_date
        ).group_by('month').order_by('month').all()

        # Volumes totaux
        total_credit_volume = sum(float(row.volume or 0) for row in credit_monthly)
        total_savings_volume = sum(float(row.volume or 0) for row in savings_monthly)

        return {
            "bank_id": bank_id,
            "bank_name": bank.name,
            "period": period,
            "monthly_simulations": {
                "credit": [
                    {
                        "month": row.month.strftime("%Y-%m"),
                        "count": row.count
                    } for row in credit_monthly
                ],
                "savings": [
                    {
                        "month": row.month.strftime("%Y-%m"),
                        "count": row.count
                    } for row in savings_monthly
                ]
            },
            "volumes": {
                "total_credit_volume": total_credit_volume,
                "total_savings_volume": total_savings_volume,
                "total_volume": total_credit_volume + total_savings_volume
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_bank_performance: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des performances")

# ==================== ENDPOINTS D'UPLOAD D'IMAGES (CORRIGÉS) ====================

@router.post("/{bank_id}/upload-logo")
async def upload_bank_logo(
    bank_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload un logo pour une banque et l'enregistre en base de données"""
    try:
        # Vérifier que la banque existe
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        # Valider le type de fichier
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Le fichier doit être une image")
        
        # Valider la taille du fichier (5MB max)
        MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Le fichier est trop volumineux (5MB max)")
        
        # Encoder l'image en base64
        encoded_image = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{encoded_image}"
        
        # STOCKER SEULEMENT L'URL DATA (pas les données binaires)
        db_bank.logo_data = None  # Ne pas stocker les données binaires
        db_bank.logo_content_type = file.content_type
        db_bank.logo_url = data_url  # Stocker l'URL data complète
        
        db.commit()
        db.refresh(db_bank)
        
        return {
            "message": "Logo uploadé avec succès",
            "logo_url": data_url,
            "file_size": len(file_content),
            "content_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur upload_logo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload du logo: {str(e)}")

@router.get("/{bank_id}/logo")
async def get_bank_logo(bank_id: str, db: Session = Depends(get_db)):
    """Récupère le logo d'une banque depuis la base de données"""
    try:
        # Récupérer la banque avec son logo
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        if not db_bank.logo_url:
            raise HTTPException(status_code=404, detail="Logo non trouvé")
        
        # Décoder l'URL data
        if db_bank.logo_url.startswith('data:'):
            try:
                header, data = db_bank.logo_url.split(',', 1)
                decoded_data = base64.b64decode(data)
                content_type = header.split(';')[0].split(':')[1]
                
                return Response(
                    content=decoded_data,
                    media_type=content_type
                )
            except Exception as decode_error:
                print(f"Erreur décodage URL data: {decode_error}")
                raise HTTPException(status_code=500, detail="Erreur lors du décodage de l'image")
        else:
            raise HTTPException(status_code=404, detail="Format de logo non supporté")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur get_logo: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du logo: {str(e)}")

@router.delete("/{bank_id}/logo")
async def delete_bank_logo(bank_id: str, db: Session = Depends(get_db)):
    """Supprime le logo d'une banque de la base de données"""
    try:
        # Vérifier que la banque existe
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")
        
        # Supprimer les données du logo
        db_bank.logo_data = None
        db_bank.logo_content_type = None
        db_bank.logo_url = None
        
        db.commit()
        
        return {"message": "Logo supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete_logo: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du logo")

# ==================== ENDPOINTS POUR RÉCUPÉRER TOUTES LES BANQUES AVEC LOGOS ====================

@router.get("/")
async def get_banks_with_logos(db: Session = Depends(get_db)):
    """Récupère toutes les banques avec leurs logos"""
    try:
        banks = db.query(models.Bank).filter(models.Bank.is_active == True).all()
        
        result = []
        for bank in banks:
            bank_data = {
                "id": bank.id,
                "name": bank.name,
                "full_name": bank.full_name,
                "description": bank.description,
                "website": bank.website,
                "logo_url": bank.logo_url,  # URL data ou URL classique
                "has_logo": bank.logo_url is not None and bank.logo_url.strip() != ""
            }
            result.append(bank_data)
        
        return {"banks": result}
        
    except Exception as e:
        print(f"Erreur get_banks: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération des banques")

# ==================== ACTIONS RAPIDES ====================

@router.patch("/{bank_id}/toggle-status")
async def toggle_bank_status(bank_id: str, db: Session = Depends(get_db)):
    """Active/désactive une banque"""
    try:
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            raise HTTPException(status_code=404, detail="Banque non trouvée")

        # Inverser le statut
        db_bank.is_active = not db_bank.is_active
        db.commit()
        db.refresh(db_bank)

        return {
            "message": f"Banque {'activée' if db_bank.is_active else 'désactivée'} avec succès",
            "is_active": db_bank.is_active
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur toggle_bank_status: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du changement de statut")

@router.get("/export")
async def export_banks(
    format: str = Query("csv", regex="^(csv|excel)$"),
    db: Session = Depends(get_db)
):
    """Exporte la liste des banques"""
    try:
        # Récupérer toutes les banques avec statistiques
        banks = db.query(models.Bank).all()
        
        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            
            # En-têtes
            writer.writerow([
                'ID', 'Nom', 'Nom complet', 'Description', 'Téléphone', 'Email', 
                'Site web', 'Adresse', 'Code SWIFT', 'Licence', 'Année création',
                'Total actifs', 'Notation', 'Actif', 'Date création', 'Dernière MAJ'
            ])
            
            # Données
            for bank in banks:
                writer.writerow([
                    bank.id, bank.name, bank.full_name or '', bank.description or '',
                    bank.contact_phone or '', bank.contact_email or '', bank.website or '',
                    bank.address or '', bank.swift_code or '', bank.license_number or '',
                    bank.established_year or '', bank.total_assets or '', bank.rating or '',
                    'Oui' if bank.is_active else 'Non',
                    bank.created_at.strftime('%Y-%m-%d'),
                    bank.updated_at.strftime('%Y-%m-%d')
                ])
            
            output.seek(0)
            
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=banques.csv"}
            )
        
        # Format Excel non implémenté pour simplifier
        raise HTTPException(status_code=501, detail="Export Excel non disponible")

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur export_banks: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'export")

# ==================== ENDPOINTS DE DEBUG (TEMPORAIRES) ====================

@router.get("/debug/test-db")
async def test_db_connection(db: Session = Depends(get_db)):
    """Test de connexion à la base de données"""
    try:
        result = db.execute(text("SELECT version()")).fetchone()
        return {"status": "success", "db_version": result[0]}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@router.get("/debug/environment")
async def debug_environment():
    """Debug de l'environnement"""
    import os
    import sys
    return {
        "python_version": sys.version,
        "working_directory": os.getcwd(),
        "sqlalchemy_version": sqlalchemy.__version__,
        "environment_vars": {
            "DATABASE_URL": os.getenv("DATABASE_URL", "non défini"),
            "DB_HOST": os.getenv("DB_HOST", "non défini"),
            "DB_NAME": os.getenv("DB_NAME", "non défini")
        }
    }

@router.get("/debug/bank/{bank_id}")
async def debug_bank_update(bank_id: str, db: Session = Depends(get_db)):
    """Test de mise à jour d'une banque"""
    try:
        db_bank = db.query(models.Bank).filter(models.Bank.id == bank_id).first()
        if not db_bank:
            return {"error": "Banque non trouvée"}
        
        # Test de mise à jour simple
        original_name = db_bank.name
        db_bank.name = f"TEST_{original_name}"
        db.commit()
        
        # Remettre le nom original
        db_bank.name = original_name
        db.commit()
        
        return {"status": "Test de mise à jour réussi"}
        
    except Exception as e:
        db.rollback()
        return {"error": f"Erreur test mise à jour: {str(e)}"}

@router.get("/test-simple")
async def test_simple():
    """Test simple pour vérifier que le router fonctionne"""
    return {"message": "Router fonctionne parfaitement"}