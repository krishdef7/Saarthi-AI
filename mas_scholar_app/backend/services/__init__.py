# Services package
from .data_loader import load_scholarships_data
from .eligibility import calculate_eligibility_match, compute_radar_scores
from .safety import detect_scam_indicators, validate_scholarship, get_deadline_info
from .hybrid_search import initialize_search_engine, search_scholarships, get_search_status
