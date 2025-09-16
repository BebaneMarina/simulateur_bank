# routers/simulations.py - Endpoints pour sauvegarder les simulations
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from database import get_db
from models import CreditSimulation, SavingsSimulation, CreditProduct, SavingsProduct
from schemas import (
    CreditSimulationCreate,
    SavingsSimulationCreate,
    CreditSimulationResponse,
    SavingsSimulationResponse
)

router = APIRouter(prefix="/api/simulations", tags=["Simulations"])

def get_client_ip(request: Request) -> str:
    """Récupère l'IP du client"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"

# SIMULATIONS DE CRÉDIT

@router.post("/credit", response_model=dict)
async def save_credit_simulation(
    simulation_data: dict,  # Utiliser dict pour plus de flexibilité
    request: Request,
    db: Session = Depends(get_db)
):
    """Sauvegarder une simulation de crédit"""
    try:
        # Vérifier que le produit existe
        credit_product = db.query(CreditProduct).filter(
            CreditProduct.id == simulation_data["credit_product_id"]
        ).first()
        
        if not credit_product:
            raise HTTPException(
                status_code=404,
                detail="Produit de crédit non trouvé"
            )
        
        # Créer la simulation
        simulation = CreditSimulation(
            id=str(uuid.uuid4()),
            session_id=simulation_data.get("session_id"),
            credit_product_id=simulation_data["credit_product_id"],
            requested_amount=simulation_data["requested_amount"],
            duration_months=simulation_data["duration_months"],
            monthly_income=simulation_data["monthly_income"],
            current_debts=simulation_data.get("current_debts", 0),
            down_payment=simulation_data.get("down_payment", 0),
            applied_rate=simulation_data["applied_rate"],
            monthly_payment=simulation_data["monthly_payment"],
            total_cost=simulation_data["total_cost"],
            total_interest=simulation_data["total_interest"],
            debt_ratio=simulation_data["debt_ratio"],
            eligible=simulation_data["eligible"],
            risk_score=simulation_data.get("risk_score"),
            recommendations=simulation_data.get("recommendations", []),
            client_ip=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            created_at=datetime.utcnow()
        )
        
        db.add(simulation)
        db.commit()
        db.refresh(simulation)
        
        return {
            "success": True,
            "simulation_id": simulation.id,
            "message": "Simulation sauvegardée avec succès",
            "simulation": {
                "id": simulation.id,
                "session_id": simulation.session_id,
                "requested_amount": float(simulation.requested_amount),
                "duration_months": simulation.duration_months,
                "monthly_payment": float(simulation.monthly_payment),
                "total_cost": float(simulation.total_cost),
                "eligible": simulation.eligible,
                "created_at": simulation.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la sauvegarde de la simulation: {str(e)}"
        )

@router.get("/credit/{simulation_id}")
async def get_credit_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Récupérer une simulation de crédit"""
    simulation = db.query(CreditSimulation).filter(
        CreditSimulation.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    return simulation

# SIMULATIONS D'ÉPARGNE

@router.post("/savings", response_model=dict)
async def save_savings_simulation(
    simulation_data: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    """Sauvegarder une simulation d'épargne"""
    try:
        # Vérifier que le produit existe
        savings_product = db.query(SavingsProduct).filter(
            SavingsProduct.id == simulation_data["savings_product_id"]
        ).first()
        
        if not savings_product:
            raise HTTPException(
                status_code=404,
                detail="Produit d'épargne non trouvé"
            )
        
        # Créer la simulation
        simulation = SavingsSimulation(
            id=str(uuid.uuid4()),
            session_id=simulation_data.get("session_id"),
            savings_product_id=simulation_data["savings_product_id"],
            initial_amount=simulation_data["initial_amount"],
            monthly_contribution=simulation_data.get("monthly_contribution", 0),
            duration_months=simulation_data["duration_months"],
            final_amount=simulation_data["final_amount"],
            total_contributions=simulation_data["total_contributions"],
            total_interest=simulation_data["total_interest"],
            effective_rate=simulation_data.get("effective_rate"),
            monthly_breakdown=simulation_data.get("monthly_breakdown"),
            recommendations=simulation_data.get("recommendations", []),
            client_ip=get_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
            created_at=datetime.utcnow()
        )
        
        db.add(simulation)
        db.commit()
        db.refresh(simulation)
        
        return {
            "success": True,
            "simulation_id": simulation.id,
            "message": "Simulation d'épargne sauvegardée avec succès",
            "simulation": {
                "id": simulation.id,
                "session_id": simulation.session_id,
                "initial_amount": float(simulation.initial_amount),
                "duration_months": simulation.duration_months,
                "final_amount": float(simulation.final_amount),
                "total_interest": float(simulation.total_interest),
                "created_at": simulation.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la sauvegarde de la simulation: {str(e)}"
        )

@router.get("/savings/{simulation_id}")
async def get_savings_simulation(simulation_id: str, db: Session = Depends(get_db)):
    """Récupérer une simulation d'épargne"""
    simulation = db.query(SavingsSimulation).filter(
        SavingsSimulation.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation non trouvée")
    
    return simulation

# ENDPOINTS DE STATISTIQUES

@router.get("/stats")
async def get_simulations_stats(db: Session = Depends(get_db)):
    """Statistiques générales des simulations"""
    try:
        from sqlalchemy import func
        
        # Statistiques des simulations de crédit
        credit_stats = db.query(
            func.count(CreditSimulation.id).label('total'),
            func.count().filter(CreditSimulation.eligible == True).label('eligible'),
            func.avg(CreditSimulation.requested_amount).label('avg_amount'),
            func.avg(CreditSimulation.applied_rate).label('avg_rate')
        ).first()
        
        # Statistiques des simulations d'épargne
        savings_stats = db.query(
            func.count(SavingsSimulation.id).label('total'),
            func.avg(SavingsSimulation.initial_amount).label('avg_initial'),
            func.avg(SavingsSimulation.final_amount).label('avg_final'),
            func.avg(SavingsSimulation.effective_rate).label('avg_rate')
        ).first()
        
        return {
            "credit_simulations": {
                "total": credit_stats.total or 0,
                "eligible": credit_stats.eligible or 0,
                "average_amount": float(credit_stats.avg_amount or 0),
                "average_rate": float(credit_stats.avg_rate or 0)
            },
            "savings_simulations": {
                "total": savings_stats.total or 0,
                "average_initial_amount": float(savings_stats.avg_initial or 0),
                "average_final_amount": float(savings_stats.avg_final or 0),
                "average_rate": float(savings_stats.avg_rate or 0)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du calcul des statistiques: {str(e)}"
        )

@router.get("/recent")
async def get_recent_simulations(
    limit: int = 10,
    simulation_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Récupérer les simulations récentes"""
    results = {}
    
    if not simulation_type or simulation_type == "credit":
        credit_simulations = db.query(CreditSimulation).order_by(
            CreditSimulation.created_at.desc()
        ).limit(limit).all()
        
        results["credit"] = [
            {
                "id": sim.id,
                "requested_amount": float(sim.requested_amount),
                "monthly_payment": float(sim.monthly_payment),
                "eligible": sim.eligible,
                "created_at": sim.created_at
            }
            for sim in credit_simulations
        ]
    
    if not simulation_type or simulation_type == "savings":
        savings_simulations = db.query(SavingsSimulation).order_by(
            SavingsSimulation.created_at.desc()
        ).limit(limit).all()
        
        results["savings"] = [
            {
                "id": sim.id,
                "initial_amount": float(sim.initial_amount),
                "final_amount": float(sim.final_amount),
                "total_interest": float(sim.total_interest),
                "created_at": sim.created_at
            }
            for sim in savings_simulations
        ]
    
    return results