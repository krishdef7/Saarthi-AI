import requests
import time
import sys
import json

BASE_URL = "http://localhost:8001"

def test_health():
    print("Testing / ...", end=" ")
    try:
        r = requests.get(f"{BASE_URL}/")
        if r.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ Failed ({r.status_code})")
            return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return False
    return True

def test_stats():
    print("Testing /api/statistics ...", end=" ")
    try:
        r = requests.get(f"{BASE_URL}/api/statistics")
        if r.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ Failed ({r.status_code})")
            return False
    except:
        print("❌ Connection Error")
        return False
    return True

def test_search():
    print("Testing /api/search ...", end=" ")
    payload = {
        "search_id": "test-uuid-123",
        "query": "SC scholarship engineering",
        "top_k": 5
    }
    try:
        r = requests.post(f"{BASE_URL}/api/search", json=payload)
        if r.status_code == 200:
            data = r.json()
            if "results" in data and len(data["results"]) >= 0:
                print(f"✅ OK (Found {len(data['results'])} results)")
                return data["results"][0]["id"] if data["results"] else None
            else:
                print("❌ Invalid Response Structure")
                return None
        else:
            print(f"❌ Failed ({r.status_code})")
            print(r.text)
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_details(sch_id):
    if not sch_id:
        print("Skipping details test (no ID found)")
        return
        
    print(f"Testing /api/scholarships/{sch_id} ...", end=" ")
    try:
        r = requests.get(f"{BASE_URL}/api/scholarships/{sch_id}")
        if r.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ Failed ({r.status_code})")
    except:
        print("❌ Error")

def test_eligibility(sch_id):
    if not sch_id:
        print("Skipping eligibility test (no ID found)")
        return

    print("Testing /api/eligibility ...", end=" ")
    payload = {
        "scholarship_id": sch_id,
        "profile": {
            "category": "SC",
            "income": 200000,
            "education": "undergraduate"
        }
    }
    try:
        r = requests.post(f"{BASE_URL}/api/eligibility", json=payload)
        if r.status_code == 200:
            print("✅ OK")
        else:
            print(f"❌ Failed ({r.status_code})")
            print(r.text)
    except:
        print("❌ Error")

if __name__ == "__main__":
    print(f"Testing Backend at {BASE_URL}")
    print("--------------------------------")
    
    # Wait for server
    for i in range(5):
        try:
            requests.get(BASE_URL)
            break
        except:
            print("Waiting for server...")
            time.sleep(2)
            
    if not test_health():
        sys.exit(1)
        
    test_stats()
    first_id = test_search()
    
    # Use demo ID if search returns nothing (fallback mode)
    if not first_id:
        first_id = "demo-sc-post-matric"
        
    test_details(first_id)
    test_eligibility(first_id)
    print("\nDone.")
