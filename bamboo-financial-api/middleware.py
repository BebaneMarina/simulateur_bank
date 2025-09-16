# middleware.py - Middleware pour la gestion des erreurs
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import traceback

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware pour capturer et gérer toutes les erreurs"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error(f"Erreur non gérée: {str(e)}\n{traceback.format_exc()}")
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": True,
                    "message": "Erreur interne du serveur",
                    "details": "Une erreur inattendue s'est produite",
                    "timestamp": datetime.now().isoformat()
                }
            )

def setup_error_handlers(app: FastAPI):
    """Configure les gestionnaires d'erreurs pour l'application"""
    app.add_exception_handler(SQLAlchemyError, database_error_handler)
    app.add_middleware(ErrorHandlingMiddleware)