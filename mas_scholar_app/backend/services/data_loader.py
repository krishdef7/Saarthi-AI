"""
💾 Data Loader Service
======================
Loads scholarship data from JSON with fallback to demo data.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger("mas_scholar_api.data")

# Paths to try for scholarship data
DATA_PATHS = [
    Path(__file__).parent.parent.parent / "shared" / "data" / "scholarships_complete.json",
    Path(__file__).parent.parent.parent.parent / "data" / "scholarships_complete.json",
    Path(__file__).parent.parent.parent.parent / "data" / "scholarships_database.json",
]

def load_scholarships_data() -> List[Dict[str, Any]]:
    """Load scholarships from JSON file with fallback."""
    
    # Try each possible path
    for data_path in DATA_PATHS:
        if data_path.exists():
            try:
                with open(data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # Handle both formats (with metadata wrapper and direct list)
                if isinstance(data, dict) and "scholarships" in data:
                    scholarships = data["scholarships"]
                elif isinstance(data, list):
                    scholarships = data
                else:
                    scholarships = []
                
                logger.info(f"✅ Loaded {len(scholarships)} scholarships from {data_path}")
                return scholarships
                
            except Exception as e:
                logger.warning(f"⚠️ Failed to load {data_path}: {e}")
                continue
    
    # Fallback to demo data
    logger.warning("⚠️ Using fallback demo scholarships")
    return get_demo_scholarships()

def get_demo_scholarships() -> List[Dict[str, Any]]:
    """Fallback demo scholarships for offline mode."""
    return [
        {
            "id": "demo-sc-post-matric",
            "name": "Post-Matric Scholarship for SC Students",
            "name_hindi": "अनुसूचित जाति के छात्रों के लिए पोस्ट-मैट्रिक छात्रवृत्ति",
            "provider": "Ministry of Social Justice and Empowerment",
            "provider_type": "government",
            "portal_url": "https://scholarships.gov.in",
            "category": ["SC"],
            "states": [],
            "gender": "All",
            "education_level": ["post-matric", "undergraduate", "postgraduate"],
            "max_income": 250000,
            "amount": 52000,
            "amount_type": "variable",
            "application_deadline": "2026-03-31",
            "required_documents": ["aadhaar", "caste_certificate", "income_certificate", "bank_passbook"],
            "description": "Complete financial assistance including tuition fees and maintenance allowance.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "NSP Official",
            "application_link": "https://scholarships.gov.in"
        },
        {
            "id": "demo-st-fellowship",
            "name": "National Fellowship for ST Students",
            "name_hindi": "अनुसूचित जनजाति छात्रों के लिए राष्ट्रीय फेलोशिप",
            "provider": "Ministry of Tribal Affairs",
            "provider_type": "government",
            "portal_url": "https://scholarships.gov.in",
            "category": ["ST"],
            "states": [],
            "gender": "All",
            "education_level": ["phd"],
            "max_income": None,
            "amount": 420000,
            "amount_type": "fixed",
            "application_deadline": "2026-01-31",
            "required_documents": ["aadhaar", "tribe_certificate", "pg_marksheet", "phd_admission_letter"],
            "description": "Fellowship for ST students pursuing MPhil/PhD research.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "NSP Official",
            "application_link": "https://scholarships.gov.in"
        },
        {
            "id": "demo-minority-merit",
            "name": "Merit-cum-Means Scholarship for Minorities",
            "name_hindi": "अल्पसंख्यकों के लिए मेरिट-कम-मीन्स छात्रवृत्ति",
            "provider": "Ministry of Minority Affairs",
            "provider_type": "government",
            "portal_url": "https://scholarships.gov.in",
            "category": ["Minority"],
            "states": [],
            "gender": "All",
            "education_level": ["undergraduate", "postgraduate"],
            "min_percentage": 50,
            "max_income": 250000,
            "amount": 30000,
            "amount_type": "fixed",
            "application_deadline": "2026-03-31",
            "required_documents": ["aadhaar", "minority_certificate", "income_certificate", "marksheet_12th"],
            "description": "Merit-cum-means based scholarship for professional courses.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "NSP Official",
            "application_link": "https://scholarships.gov.in"
        },
        {
            "id": "demo-obc-post-matric",
            "name": "Post-Matric Scholarship for OBC Students",
            "name_hindi": "अन्य पिछड़ा वर्ग के छात्रों के लिए पोस्ट-मैट्रिक छात्रवृत्ति",
            "provider": "Ministry of Social Justice and Empowerment",
            "provider_type": "government",
            "portal_url": "https://scholarships.gov.in",
            "category": ["OBC"],
            "states": [],
            "gender": "All",
            "education_level": ["post-matric", "undergraduate", "postgraduate"],
            "max_income": 300000,
            "amount": 35000,
            "amount_type": "variable",
            "application_deadline": "2026-03-31",
            "required_documents": ["aadhaar", "obc_certificate", "income_certificate", "bank_passbook"],
            "description": "Post-matric scholarship for OBC students from Class 11 onwards.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "NSP Official",
            "application_link": "https://scholarships.gov.in"
        },
        {
            "id": "demo-hdfc-badhte-kadam",
            "name": "HDFC Badhte Kadam Scholarship",
            "name_hindi": "एचडीएफसी बढ़ते कदम छात्रवृत्ति",
            "provider": "HDFC Bank CSR",
            "provider_type": "csr",
            "portal_url": "https://www.buddy4study.com",
            "category": ["General", "SC", "ST", "OBC"],
            "states": [],
            "gender": "All",
            "education_level": ["undergraduate"],
            "max_income": 600000,
            "amount": 75000,
            "amount_type": "fixed",
            "application_deadline": "2026-02-28",
            "required_documents": ["aadhaar", "income_certificate", "marksheet_12th", "admission_letter"],
            "description": "Support for high-performing students from underprivileged backgrounds.",
            "verified": True,
            "trust_score": 0.92,
            "expired": False,
            "data_source": "Buddy4Study",
            "application_link": "https://www.buddy4study.com"
        },
        {
            "id": "demo-spdc-diaspora",
            "name": "Scholarship Programme for Diaspora Children (SPDC)",
            "name_hindi": "प्रवासी बच्चों के लिए छात्रवृत्ति कार्यक्रम",
            "provider": "Ministry of External Affairs",
            "provider_type": "government",
            "portal_url": "https://spdcindia.gov.in",
            "category": ["General", "OBC", "SC", "ST", "NRI", "PIO"],
            "states": [],
            "gender": "All",
            "education_level": ["undergraduate"],
            "max_income": None,
            "amount": 330000,
            "amount_type": "variable",
            "application_deadline": "2026-01-31",
            "required_documents": ["passport", "oci_card", "admission_letter", "parent_income_proof"],
            "description": "Financial assistance for children of NRIs and PIOs pursuing undergraduate courses in India.",
            "verified": True,
            "trust_score": 0.99,
            "expired": False,
            "data_source": "MEA Official",
            "application_link": "https://spdcindia.gov.in"
        },
        {
            "id": "demo-central-sector",
            "name": "Central Sector Scheme of Scholarships for College and University Students",
            "name_hindi": "केंद्रीय क्षेत्र योजना छात्रवृत्ति",
            "provider": "Ministry of Education",
            "provider_type": "government",
            "portal_url": "https://scholarships.gov.in",
            "category": ["General", "OBC", "SC", "ST"],
            "states": [],
            "gender": "All",
            "education_level": ["undergraduate", "postgraduate"],
            "max_income": 800000,
            "amount": 20000,
            "amount_type": "fixed",
            "application_deadline": "2026-03-31",
            "required_documents": ["aadhaar", "marksheet_12th", "income_certificate", "bank_passbook"],
            "description": "Top 82 percentile students in Class XII boards pursuing graduation/post-graduation in regular colleges.",
            "verified": True,
            "trust_score": 0.99,
            "expired": False,
            "data_source": "NSP Official",
            "application_link": "https://scholarships.gov.in"
        },
        {
            "id": "demo-inspire",
            "name": "INSPIRE Fellowship for Research",
            "name_hindi": "इंस्पायर अनुसंधान फेलोशिप",
            "provider": "Department of Science and Technology",
            "provider_type": "government",
            "portal_url": "https://online-inspire.gov.in",
            "category": ["General", "OBC", "SC", "ST"],
            "states": [],
            "gender": "All",
            "education_level": ["phd"],
            "max_income": None,
            "amount": 420000,
            "amount_type": "fixed",
            "application_deadline": "2026-06-30",
            "required_documents": ["phd_admission_letter", "pg_marksheet", "research_proposal"],
            "description": "Fellowship for doctoral research in basic and applied sciences.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "DST Official",
            "application_link": "https://online-inspire.gov.in"
        },
        {
            "id": "demo-aditya-birla",
            "name": "Aditya Birla Scholarship",
            "name_hindi": "आदित्य बिड़ला छात्रवृत्ति",
            "provider": "Aditya Birla Group",
            "provider_type": "csr",
            "portal_url": "https://www.adityabirla.com/scholarship",
            "category": ["General", "OBC", "SC", "ST"],
            "states": [],
            "gender": "All",
            "education_level": ["undergraduate", "postgraduate"],
            "min_percentage": 85,
            "max_income": None,
            "amount": 150000,
            "amount_type": "fixed",
            "application_deadline": "2026-04-30",
            "required_documents": ["admission_letter", "marksheet_12th", "recommendation_letter"],
            "description": "For meritorious students in IITs, IIMs, BITS, XLRI pursuing engineering and management.",
            "verified": True,
            "trust_score": 0.95,
            "expired": False,
            "data_source": "Corporate Website",
            "application_link": "https://www.adityabirla.com/scholarship"
        },
        {
            "id": "demo-pragati-women",
            "name": "Pragati Scholarship for Girl Students in Technical Education",
            "name_hindi": "प्रगति छात्रवृत्ति - तकनीकी शिक्षा में छात्राओं के लिए",
            "provider": "AICTE",
            "provider_type": "government",
            "portal_url": "https://www.aicte-india.org/schemes/students-development-schemes/PRAGATI",
            "category": ["General", "OBC", "SC", "ST"],
            "states": [],
            "gender": "Female",
            "education_level": ["undergraduate"],
            "max_income": 800000,
            "amount": 50000,
            "amount_type": "fixed",
            "application_deadline": "2026-03-31",
            "required_documents": ["aadhaar", "marksheet_12th", "income_certificate", "admission_letter"],
            "description": "For girl students admitted to AICTE approved institutions for degree/diploma courses.",
            "verified": True,
            "trust_score": 0.98,
            "expired": False,
            "data_source": "AICTE Official",
            "application_link": "https://www.aicte-india.org"
        }
    ]
