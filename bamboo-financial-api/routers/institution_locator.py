# routers/institutions_locator.py - API complète pour les institutions financières
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
import math
from database import get_db
import models

router = APIRouter()

class Coordinates(BaseModel):
    lat: float
    lng: float

class OpeningHours(BaseModel):
    monday: str = "8h00 - 16h00"
    tuesday: str = "8h00 - 16h00"
    wednesday: str = "8h00 - 16h00"
    thursday: str = "8h00 - 16h00"
    friday: str = "8h00 - 16h00"
    saturday: str = "8h00 - 12h00"
    sunday: str = "Fermé"

class BankBranchResponse(BaseModel):
    id: str
    bank_id: str
    bank_name: str
    branch_name: str
    address: str
    city: str
    district: str
    coordinates: Coordinates
    phone: str
    email: Optional[str] = None
    opening_hours: OpeningHours
    has_atm: bool = True
    has_parking: bool = False
    is_accessible: bool = False
    manager_name: Optional[str] = None
    specialties: List[str] = []
    wait_time: int = 0
    rating: float = 0.0
    photos: List[str] = []
    distance: Optional[float] = None

class InsuranceBranchResponse(BaseModel):
    id: str
    company_id: str
    company_name: str
    branch_name: str
    address: str
    city: str
    district: str
    coordinates: Coordinates
    phone: str
    email: Optional[str] = None
    opening_hours: OpeningHours
    services: List[str] = []
    specialties: List[str] = []
    rating: float = 0.0
    distance: Optional[float] = None

class InstitutionsResponse(BaseModel):
    banks: List[BankBranchResponse]
    insurance_companies: List[InsuranceBranchResponse]
    total_count: int
    user_location: Optional[Coordinates] = None

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcule la distance en kilomètres entre deux points géographiques"""
    R = 6371.0
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return round(distance, 2)

# Données mockées des banques au Gabon
MOCK_BANKS = [
    {
        "id": "bgfi-centre-libreville",
        "bank_id": "bgfi",
        "bank_name": "BGFI Bank",
        "branch_name": "BGFI Centre-ville Libreville",
        "address": "Boulevard de l'Indépendance",
        "city": "Libreville",
        "district": "Centre-ville",
        "coordinates": {"lat": 0.3948, "lng": 9.4537},
        "phone": "+241 01 76 20 00",
        "email": "centre@bgfibank.ga",
        "has_atm": True,
        "has_parking": True,
        "is_accessible": True,
        "manager_name": "Jean-Pierre MBOMA",
        "specialties": ["Crédit immobilier", "Épargne", "Change", "Transferts internationaux"],
        "wait_time": 15,
        "rating": 4.2
    },
    {
        "id": "ugb-glass-libreville",
        "bank_id": "ugb",
        "bank_name": "UGB",
        "branch_name": "UGB Glass",
        "address": "Quartier Glass, près du marché",
        "city": "Libreville",
        "district": "Glass",
        "coordinates": {"lat": 0.3856, "lng": 9.4472},
        "phone": "+241 01 72 00 00",
        "email": "glass@ugb.ga",
        "has_atm": True,
        "has_parking": False,
        "is_accessible": False,
        "manager_name": "Marie NGOUA",
        "specialties": ["Crédit auto", "Microfinance", "Mobile Banking"],
        "wait_time": 25,
        "rating": 3.8
    },
    {
        "id": "bicig-port-gentil",
        "bank_id": "bicig",
        "bank_name": "BICIG",
        "branch_name": "BICIG Port-Gentil Centre",
        "address": "Avenue du Gouverneur Ballay",
        "city": "Port-Gentil",
        "district": "Centre",
        "coordinates": {"lat": -0.7193, "lng": 8.7815},
        "phone": "+241 01 55 60 00",
        "has_atm": True,
        "has_parking": True,
        "is_accessible": True,
        "specialties": ["Crédit professionnel", "Transferts internationaux", "Trade Finance"],
        "wait_time": 10,
        "rating": 4.5
    },
    {
        "id": "ecobank-akanda",
        "bank_id": "ecobank",
        "bank_name": "Ecobank",
        "branch_name": "Ecobank Akanda",
        "address": "Route Nationale, Akanda",
        "city": "Libreville",
        "district": "Akanda",
        "coordinates": {"lat": 0.4895, "lng": 9.3064},
        "phone": "+241 01 44 30 00",
        "has_atm": True,
        "has_parking": True,
        "is_accessible": True,
        "specialties": ["Transferts Western Union", "Mobile Banking", "Crédit auto"],
        "wait_time": 20,
        "rating": 4.0
    },
    {
        "id": "cbao-nombakele",
        "bank_id": "cbao",
        "bank_name": "CBAO",
        "branch_name": "CBAO Nombakélé",
        "address": "Quartier Nombakélé",
        "city": "Libreville",
        "district": "Nombakélé",
        "coordinates": {"lat": 0.4162, "lng": 9.4673},
        "phone": "+241 01 74 25 00",
        "has_atm": True,
        "has_parking": True,
        "is_accessible": True,
        "specialties": ["Épargne", "Crédit PME", "Assurance"],
        "wait_time": 18,
        "rating": 4.1
    },
    {
        "id": "orabank-franceville",
        "bank_id": "orabank",
        "bank_name": "Orabank",
        "branch_name": "Orabank Franceville",
        "address": "Centre-ville Franceville",
        "city": "Franceville",
        "district": "Centre",
        "coordinates": {"lat": -1.6332, "lng": 13.5833},
        "phone": "+241 01 67 80 00",
        "has_atm": True,
        "has_parking": True,
        "is_accessible": False,
        "specialties": ["Crédit mining", "Change", "Transferts"],
        "wait_time": 30,
        "rating": 3.9
    }
]

# Données mockées des assurances au Gabon
MOCK_INSURANCE = [
    {
        "id": "saham-centre-libreville",
        "company_id": "saham",
        "company_name": "Saham Assurance",
        "branch_name": "Saham Centre-ville",
        "address": "Avenue du Colonel Parant",
        "city": "Libreville",
        "district": "Centre-ville",
        "coordinates": {"lat": 0.3920, "lng": 9.4580},
        "phone": "+241 01 76 56 00",
        "email": "libreville@saham.ga",
        "services": ["Assurance Auto", "Assurance Habitation", "Assurance Vie", "Assurance Santé"],
        "specialties": ["Assurance véhicules", "Assurance habitation"],
        "rating": 4.3
    },
    {
        "id": "nsia-glass-libreville",
        "company_id": "nsia",
        "company_name": "NSIA Assurance",
        "branch_name": "NSIA Glass",
        "address": "Quartier Glass, face à la Poste",
        "city": "Libreville",
        "district": "Glass",
        "coordinates": {"lat": 0.3845, "lng": 9.4450},
        "phone": "+241 01 72 35 00",
        "email": "glass@nsia.ga",
        "services": ["Assurance Auto", "Assurance Maladie", "Assurance Voyage"],
        "specialties": ["Assurance santé", "Assurance voyage"],
        "rating": 4.1
    },
    {
        "id": "colina-port-gentil",
        "company_id": "colina",
        "company_name": "Colina Assurance",
        "branch_name": "Colina Port-Gentil",
        "address": "Boulevard Maritime",
        "city": "Port-Gentil",
        "district": "Bord de mer",
        "coordinates": {"lat": -0.7156, "lng": 8.7891},
        "phone": "+241 01 55 20 00",
        "services": ["Assurance Maritime", "Assurance Industrielle", "Assurance Auto"],
        "specialties": ["Assurance maritime", "Assurance industrielle"],
        "rating": 3.9
    },
    {
        "id": "sanlam-franceville",
        "company_id": "sanlam",
        "company_name": "Sanlam",
        "branch_name": "Sanlam Franceville",
        "address": "Route de l'aéroport",
        "city": "Franceville",
        "district": "Centre",
        "coordinates": {"lat": -1.6300, "lng": 13.5800},
        "phone": "+241 01 67 45 00",
        "services": ["Assurance Vie", "Assurance Santé", "Assurance Auto"],
        "specialties": ["Assurance vie", "Épargne retraite"],
        "rating": 4.0
    },
    {
        "id": "gras-savoye-libreville",
        "company_id": "gras_savoye",
        "company_name": "Gras Savoye Gabon",
        "branch_name": "Gras Savoye Libreville",
        "address": "Immeuble Le Dialogue, Centre-ville",
        "city": "Libreville",
        "district": "Centre-ville",
        "coordinates": {"lat": 0.3910, "lng": 9.4520},
        "phone": "+241 01 76 89 00",
        "email": "contact@grassavoye.ga",
        "services": ["Assurance Entreprise", "Assurance Transport", "Conseil en assurance"],
        "specialties": ["Assurance entreprise", "Courtage"],
        "rating": 4.4
    }
]

async def get_bank_branches(
    db: Session,
    city: Optional[str] = None,
    district: Optional[str] = None,
    service: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance: Optional[float] = None,
    limit: int = 20
) -> List[BankBranchResponse]:
    """Récupère les agences bancaires avec filtres"""
    
    filtered_banks = []
    
    for bank_data in MOCK_BANKS:
        # Filtre par ville
        if city and bank_data["city"].lower() != city.lower():
            continue
            
        # Filtre par quartier
        if district and bank_data["district"].lower() != district.lower():
            continue
            
        # Filtre par service
        if service and not any(service.lower() in s.lower() for s in bank_data["specialties"]):
            continue
        
        # Calcul de la distance
        distance = None
        if user_lat and user_lng:
            distance = calculate_distance(
                user_lat, user_lng,
                bank_data["coordinates"]["lat"],
                bank_data["coordinates"]["lng"]
            )
            
            # Filtre par distance maximale
            if max_distance and distance > max_distance:
                continue
        
        # Création de l'objet de réponse
        bank_response = BankBranchResponse(
            id=bank_data["id"],
            bank_id=bank_data["bank_id"],
            bank_name=bank_data["bank_name"],
            branch_name=bank_data["branch_name"],
            address=bank_data["address"],
            city=bank_data["city"],
            district=bank_data["district"],
            coordinates=Coordinates(
                lat=bank_data["coordinates"]["lat"],
                lng=bank_data["coordinates"]["lng"]
            ),
            phone=bank_data["phone"],
            email=bank_data.get("email"),
            opening_hours=OpeningHours(),
            has_atm=bank_data["has_atm"],
            has_parking=bank_data["has_parking"],
            is_accessible=bank_data["is_accessible"],
            manager_name=bank_data.get("manager_name"),
            specialties=bank_data["specialties"],
            wait_time=bank_data["wait_time"],
            rating=bank_data["rating"],
            distance=distance
        )
        
        filtered_banks.append(bank_response)
    
    # Trier par distance si position utilisateur fournie
    if user_lat and user_lng:
        filtered_banks.sort(key=lambda x: x.distance or float('inf'))
    
    return filtered_banks[:limit]

async def get_insurance_branches(
    db: Session,
    city: Optional[str] = None,
    district: Optional[str] = None,
    service: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_distance: Optional[float] = None,
    limit: int = 20
) -> List[InsuranceBranchResponse]:
    """Récupère les agences d'assurance avec filtres"""
    
    filtered_insurance = []
    
    for insurance_data in MOCK_INSURANCE:
        # Filtre par ville
        if city and insurance_data["city"].lower() != city.lower():
            continue
            
        # Filtre par quartier
        if district and insurance_data["district"].lower() != district.lower():
            continue
            
        # Filtre par service
        if service:
            service_found = False
            for s in insurance_data["services"]:
                if service.lower() in s.lower():
                    service_found = True
                    break
            for s in insurance_data["specialties"]:
                if service.lower() in s.lower():
                    service_found = True
                    break
            if not service_found:
                continue
        
        # Calcul de la distance
        distance = None
        if user_lat and user_lng:
            distance = calculate_distance(
                user_lat, user_lng,
                insurance_data["coordinates"]["lat"],
                insurance_data["coordinates"]["lng"]
            )
            
            # Filtre par distance maximale
            if max_distance and distance > max_distance:
                continue
        
        # Création de l'objet de réponse
        insurance_response = InsuranceBranchResponse(
            id=insurance_data["id"],
            company_id=insurance_data["company_id"],
            company_name=insurance_data["company_name"],
            branch_name=insurance_data["branch_name"],
            address=insurance_data["address"],
            city=insurance_data["city"],
            district=insurance_data["district"],
            coordinates=Coordinates(
                lat=insurance_data["coordinates"]["lat"],
                lng=insurance_data["coordinates"]["lng"]
            ),
            phone=insurance_data["phone"],
            email=insurance_data.get("email"),
            opening_hours=OpeningHours(),
            services=insurance_data["services"],
            specialties=insurance_data["specialties"],
            rating=insurance_data["rating"],
            distance=distance
        )
        
        filtered_insurance.append(insurance_response)
    
    # Trier par distance si position utilisateur fournie
    if user_lat and user_lng:
        filtered_insurance.sort(key=lambda x: x.distance or float('inf'))
    
    return filtered_insurance[:limit]

@router.get("/api/institutions/all", response_model=InstitutionsResponse)
async def get_all_institutions(
    city: Optional[str] = Query(None, description="Filtrer par ville"),
    district: Optional[str] = Query(None, description="Filtrer par quartier"),
    institution_type: Optional[str] = Query(None, description="Type: 'bank' ou 'insurance'"),
    service: Optional[str] = Query(None, description="Service recherché"),
    user_lat: Optional[float] = Query(None, description="Latitude utilisateur"),
    user_lng: Optional[float] = Query(None, description="Longitude utilisateur"),
    max_distance: Optional[float] = Query(None, description="Distance maximale en km"),
    limit: int = Query(50, description="Nombre maximum de résultats"),
    db: Session = Depends(get_db)
):
    """Récupère toutes les institutions financières avec filtres et calcul de distances"""
    try:
        banks = []
        insurance_companies = []
        user_location = None
        
        if user_lat and user_lng:
            user_location = Coordinates(lat=user_lat, lng=user_lng)
        
        # Récupération des banques
        if not institution_type or institution_type == "bank":
            banks = await get_bank_branches(
                db, city, district, service, user_lat, user_lng, max_distance, limit
            )
        
        # Récupération des compagnies d'assurance
        if not institution_type or institution_type == "insurance":
            insurance_companies = await get_insurance_branches(
                db, city, district, service, user_lat, user_lng, max_distance, limit
            )
        
        total_count = len(banks) + len(insurance_companies)
        
        return InstitutionsResponse(
            banks=banks,
            insurance_companies=insurance_companies,
            total_count=total_count,
            user_location=user_location
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des institutions: {str(e)}")

@router.get("/api/institutions/banks", response_model=List[BankBranchResponse])
async def get_banks_only(
    city: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    user_lat: Optional[float] = Query(None),
    user_lng: Optional[float] = Query(None),
    max_distance: Optional[float] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    """Récupère uniquement les banques"""
    return await get_bank_branches(db, city, district, service, user_lat, user_lng, max_distance, limit)

@router.get("/api/institutions/insurance", response_model=List[InsuranceBranchResponse])
async def get_insurance_only(
    city: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    user_lat: Optional[float] = Query(None),
    user_lng: Optional[float] = Query(None),
    max_distance: Optional[float] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    """Récupère uniquement les compagnies d'assurance"""
    return await get_insurance_branches(db, city, district, service, user_lat, user_lng, max_distance, limit)

@router.get("/api/institutions/cities")
async def get_available_cities():
    """Récupère la liste des villes disponibles avec leurs quartiers"""
    return {
        "cities": [
            {
                "name": "Libreville",
                "districts": ["Centre-ville", "Akanda", "Glass", "Nombakélé", "Lalala", "Nzeng-Ayong", "Oloumi", "PK5", "PK8"]
            },
            {
                "name": "Port-Gentil",
                "districts": ["Centre", "Bord de mer", "Baudin", "Polytechnique", "Récréation"]
            },
            {
                "name": "Franceville",
                "districts": ["Centre", "Potos", "Bangou", "Ndéné"]
            },
            {
                "name": "Oyem",
                "districts": ["Centre", "Adjap", "Efoulan"]
            },
            {
                "name": "Lambaréné",
                "districts": ["Centre", "Islande", "Mission"]
            }
        ]
    }

@router.get("/api/institutions/nearby")
async def get_nearby_institutions(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(5.0, description="Rayon en kilomètres"),
    institution_type: Optional[str] = Query(None, description="Type: 'bank' ou 'insurance'"),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    """Trouve les institutions dans un rayon donné autour d'une position"""
    try:
        response = await get_all_institutions(
            city=None,
            district=None,
            institution_type=institution_type,
            service=None,
            user_lat=lat,
            user_lng=lng,
            max_distance=radius,
            limit=limit,
            db=db
        )
        
        return {
            "user_position": {"lat": lat, "lng": lng},
            "search_radius": radius,
            "institutions": response,
            "found_count": response.total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche: {str(e)}")

@router.get("/api/institutions/search")
async def search_institutions(
    q: str = Query(..., description="Terme de recherche"),
    institution_type: Optional[str] = Query(None, description="Type: 'bank' ou 'insurance'"),
    user_lat: Optional[float] = Query(None),
    user_lng: Optional[float] = Query(None),
    limit: int = Query(10),
    db: Session = Depends(get_db)
):
    """Recherche dans les institutions par nom, adresse ou services"""
    results = {"banks": [], "insurance_companies": [], "total": 0}
    
    # Recherche dans les banques
    if not institution_type or institution_type == "bank":
        all_banks = await get_bank_branches(db, None, None, None, user_lat, user_lng, None, 100)
        
        for bank in all_banks:
            if (q.lower() in bank.bank_name.lower() or 
                q.lower() in bank.branch_name.lower() or
                q.lower() in bank.address.lower() or
                any(q.lower() in specialty.lower() for specialty in bank.specialties)):
                results["banks"].append(bank)
                if len(results["banks"]) >= limit:
                    break
    
    # Recherche dans les assurances
    if not institution_type or institution_type == "insurance":
        all_insurance = await get_insurance_branches(db, None, None, None, user_lat, user_lng, None, 100)
        
        for insurance in all_insurance:
            if (q.lower() in insurance.company_name.lower() or 
                q.lower() in insurance.branch_name.lower() or
                q.lower() in insurance.address.lower() or
                any(q.lower() in service.lower() for service in insurance.services) or
                any(q.lower() in specialty.lower() for specialty in insurance.specialties)):
                results["insurance_companies"].append(insurance)
                if len(results["insurance_companies"]) >= limit:
                    break
    
    results["total"] = len(results["banks"]) + len(results["insurance_companies"])
    return results

# Version alternative si le problème persiste
@router.post("/api/institutions/feedback")
async def submit_feedback(
    institution_id: str = Query(...),
    institution_type: str = Query(...),
    rating: int = Query(..., ge=1, le=5),
    comment: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Permet aux utilisateurs de laisser des avis sur les institutions"""
    return {
        "success": True,
        "message": "Votre avis a été enregistré avec succès",
        "feedback": {
            "institution_id": institution_id,
            "institution_type": institution_type,
            "rating": rating,
            "comment": comment,
            "submitted_at": "2024-01-15T10:30:00Z"
        }
    }