from decimal import Decimal
from typing import Union

def safe_float_conversion(value: Union[str, int, float, Decimal, None]) -> Optional[float]:
    """Conversion sécurisée en float"""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def safe_int_conversion(value: Union[str, int, float, None]) -> Optional[int]:
    """Conversion sécurisée en int"""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

def safe_bool_conversion(value: Any) -> bool:
    """Conversion sécurisée en bool"""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    return bool(value)

def safe_list_conversion(value: Any) -> List[Any]:
    """Conversion sécurisée en liste"""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, (tuple, set)):
        return list(value)
    return [value]

def safe_dict_conversion(value: Any) -> Dict[str, Any]:
    """Conversion sécurisée en dictionnaire"""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    return {}

# error_handlers.py - Gestionnaires d'erreurs personnalisés
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

async def database_error_handler(request: Request, exc: SQLAlchemyError):
    """Gestionnaire d'erreurs pour les erreurs de base de données"""
    logger.error(f"Erreur base de données: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Erreur de base de données",
            "details": "Une erreur est survenue lors de l'accès aux données",
            "timestamp": datetime.now().isoformat()
        }
    )

async def validation_error_handler(request: Request, exc: Exception):
    """Gestionnaire d'erreurs pour les erreurs de validation Pydantic"""
    logger.error(f"Erreur de validation: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "Erreur de validation des données",
            "details": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )