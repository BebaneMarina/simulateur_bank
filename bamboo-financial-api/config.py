# config.py - Configuration globale pour résoudre les erreurs de sérialisation
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime

class ApiConfig:
    """Configuration centralisée pour l'API"""
    
    # Configuration Pydantic
    PYDANTIC_CONFIG = {
        "from_attributes": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            datetime: lambda v: v.isoformat() if v else None
        },
        "validate_assignment": True
    }

def convert_sqlalchemy_to_dict(obj, exclude_fields: List[str] = None) -> Dict[str, Any]:
    """
    Convertit un objet SQLAlchemy en dictionnaire pour éviter les erreurs Pydantic
    """
    if exclude_fields is None:
        exclude_fields = []
    
    result = {}
    
    # Récupérer tous les attributs de l'objet
    for column in obj.__table__.columns:
        field_name = column.name
        if field_name not in exclude_fields:
            value = getattr(obj, field_name, None)
            
            # Conversion des types spéciaux
            if value is not None:
                if hasattr(value, '__iter__') and not isinstance(value, (str, bytes)):
                    # Listes et autres itérables
                    result[field_name] = list(value) if value else []
                elif hasattr(value, 'isoformat'):
                    # DateTime
                    result[field_name] = value.isoformat()
                elif isinstance(value, (int, float, str, bool)):
                    # Types primitifs
                    result[field_name] = value
                else:
                    # Autres types, conversion en string
                    result[field_name] = str(value)
            else:
                result[field_name] = None
    
    return result

def convert_bank_to_dict(bank_obj) -> Dict[str, Any]:
    """Convertit un objet Bank SQLAlchemy en dictionnaire"""
    return {
        "id": bank_obj.id,
        "name": bank_obj.name,
        "full_name": bank_obj.full_name,
        "description": bank_obj.description,
        "logo_url": bank_obj.logo_url,
        "website": bank_obj.website,
        "contact_phone": bank_obj.contact_phone,
        "contact_email": bank_obj.contact_email,
        "address": bank_obj.address,
        "swift_code": bank_obj.swift_code,
        "license_number": bank_obj.license_number,
        "established_year": bank_obj.established_year,
        "total_assets": float(bank_obj.total_assets) if bank_obj.total_assets else None,
        "rating": bank_obj.rating,
        "is_active": bool(bank_obj.is_active),
        "created_at": bank_obj.created_at.isoformat() if bank_obj.created_at else None,
        "updated_at": bank_obj.updated_at.isoformat() if bank_obj.updated_at else None
    }

def convert_credit_product_to_dict(product_obj) -> Dict[str, Any]:
    """Convertit un objet CreditProduct SQLAlchemy en dictionnaire"""
    result = {
        "id": product_obj.id,
        "bank_id": product_obj.bank_id,
        "name": product_obj.name,
        "type": product_obj.type,
        "description": product_obj.description,
        "min_amount": float(product_obj.min_amount),
        "max_amount": float(product_obj.max_amount),
        "min_duration_months": product_obj.min_duration_months,
        "max_duration_months": product_obj.max_duration_months,
        "average_rate": float(product_obj.average_rate),
        "min_rate": float(product_obj.min_rate) if product_obj.min_rate else None,
        "max_rate": float(product_obj.max_rate) if product_obj.max_rate else None,
        "processing_time_hours": product_obj.processing_time_hours,
        "required_documents": product_obj.required_documents or {},
        "eligibility_criteria": product_obj.eligibility_criteria or {},
        "fees": product_obj.fees or {},
        "features": product_obj.features or [],
        "advantages": product_obj.advantages or [],
        "special_conditions": product_obj.special_conditions,
        "is_featured": bool(product_obj.is_featured),
        "is_active": bool(product_obj.is_active),
        "created_at": product_obj.created_at.isoformat() if product_obj.created_at else None,
        "updated_at": product_obj.updated_at.isoformat() if product_obj.updated_at else None
    }
    
    # Ajout de la banque si elle existe
    if hasattr(product_obj, 'bank') and product_obj.bank:
        result["bank"] = convert_bank_to_dict(product_obj.bank)
    
    return result