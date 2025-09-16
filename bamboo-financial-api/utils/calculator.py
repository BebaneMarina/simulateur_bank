# utils/calculators.py
import math
from typing import List, Dict, Any

def calculate_monthly_payment(principal: float, annual_rate: float, months: int) -> float:
    """Calcule la mensualité d'un crédit"""
    if annual_rate == 0:
        return principal / months
    
    monthly_rate = annual_rate / 100 / 12
    factor = (1 + monthly_rate) ** months
    return principal * (monthly_rate * factor) / (factor - 1)

def calculate_effective_rate(principal: float, monthly_payment: float, months: int, fees: float = 0) -> float:
    """Calcule le taux effectif global (TEG)"""
    total_paid = monthly_payment * months + fees
    total_interest = total_paid - principal
    return (total_interest / principal) * 100

def generate_amortization_schedule(
    principal: float, 
    annual_rate: float, 
    months: int,
    monthly_payment: float = None
) -> List[Dict[str, Any]]:
    """Génère un tableau d'amortissement"""
    if monthly_payment is None:
        monthly_payment = calculate_monthly_payment(principal, annual_rate, months)
    
    monthly_rate = annual_rate / 100 / 12
    balance = principal
    schedule = []
    
    for month in range(1, months + 1):
        interest_payment = balance * monthly_rate
        principal_payment = monthly_payment - interest_payment
        balance -= principal_payment
        
        schedule.append({
            "month": month,
            "principal": round(principal_payment, 2),
            "interest": round(interest_payment, 2),
            "remaining_balance": round(max(0, balance), 2),
            "monthly_payment": round(monthly_payment, 2)
        })
    
    return schedule

def calculate_savings_projection(
    initial_amount: float,
    monthly_contribution: float,
    annual_rate: float,
    months: int,
    contribution_increase_rate: float = 0
) -> Dict[str, Any]:
    """Calcule la projection d'épargne avec augmentation optionnelle des contributions"""
    monthly_rate = annual_rate / 100 / 12
    balance = initial_amount
    total_contributions = initial_amount
    breakdown = []
    
    current_contribution = monthly_contribution
    
    for month in range(1, months + 1):
        # Augmentation annuelle des contributions
        if month > 12 and month % 12 == 1 and contribution_increase_rate > 0:
            current_contribution *= (1 + contribution_increase_rate / 100)
        
        interest = balance * monthly_rate
        balance += current_contribution + interest
        total_contributions += current_contribution
        
        breakdown.append({
            "month": month,
            "contribution": round(current_contribution, 2),
            "interest": round(interest, 2),
            "cumulative_amount": round(balance, 2)
        })
    
    return {
        "final_amount": round(balance, 2),
        "total_contributions": round(total_contributions, 2),
        "total_interest": round(balance - total_contributions, 2),
        "breakdown": breakdown,
        "annual_yield": round((balance / total_contributions - 1) * (12 / months) * 100, 2)
    }

def calculate_insurance_premium(
    base_premium: float,
    coverage_amount: float,
    age: int,
    risk_factors: Dict[str, Any],
    insurance_type: str
) -> float:
    """Calcule la prime d'assurance basée sur les facteurs de risque"""
    premium = base_premium
    
    # Facteur âge
    if insurance_type == "auto":
        if age < 25:
            premium *= 1.5
        elif age > 65:
            premium *= 1.3
    elif insurance_type == "vie":
        age_factor = 1.0 + max(0, (age - 30) * 0.02)
        premium *= age_factor
    
    # Facteurs de risque spécifiques
    if insurance_type == "auto":
        if risk_factors.get("accidents", 0) > 0:
            premium *= 1.2
        if risk_factors.get("violations", 0) > 0:
            premium *= 1.1
        if coverage_amount:
            premium = max(premium, coverage_amount * 0.03 / 12)
    
    elif insurance_type == "habitation":
        if coverage_amount:
            premium = max(premium, coverage_amount * 0.002 / 12)
    
    elif insurance_type == "sante":
        if risk_factors.get("chronic_conditions"):
            premium *= 1.3
        if risk_factors.get("smoking"):
            premium *= 1.4
    
    return round(premium, 2)