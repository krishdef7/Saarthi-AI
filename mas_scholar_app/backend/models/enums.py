"""
Strict Enums for MAS-Scholar API Contracts.
"""
from enum import Enum

class SearchStage(str, Enum):
    """
    Formal stages of the search lifecycle for frontend visualization.
    Values are UPPERCASE to match frontend WebSocket expectations.
    """
    START = "START"
    EMBEDDING = "EMBEDDING"
    VECTOR_SEARCH = "VECTOR_SEARCH"
    BM25_SEARCH = "BM25_SEARCH"
    RRF_FUSION = "RRF_FUSION"
    SCORING = "SCORING"
    COMPLETE = "COMPLETE"
    ERROR = "ERROR"

class Category(str, Enum):
    SC = "SC"
    ST = "ST"
    OBC = "OBC"
    GENERAL = "General"
    MINORITY = "Minority"
    EWS = "EWS"
    PWD = "PWD"
    ALL = "All"

class EducationLevel(str, Enum):
    CLASS_9_10 = "class_9_10"
    CLASS_11_12 = "class_11_12"
    UNDERGRADUATE = "undergraduate"
    POSTGRADUATE = "postgraduate"
    PHD = "phd"
    OTHER = "other"
