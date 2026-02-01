"""
WebSocket Search Endpoint Test Script
=====================================
Tests the /ws/search endpoint for live reasoning streaming.

Usage:
    1. Start the backend: uvicorn main:app --reload --port 8000
    2. Run this script: python test_websocket.py
"""

import asyncio
import json
import websockets
import sys

WS_URL = "ws://localhost:8000/ws/search"


async def test_websocket_search():
    """Test the WebSocket search endpoint with a sample query."""
    print(f"\n{'='*60}")
    print("WebSocket Search Endpoint Test")
    print(f"{'='*60}")
    print(f"Connecting to: {WS_URL}\n")

    try:
        async with websockets.connect(WS_URL) as ws:
            # Send search request
            request = {
                "query": "SC scholarship engineering",
                "profile": {
                    "category": "SC",
                    "income": 200000,
                    "education": "undergraduate",
                    "state": "All India"
                }
            }

            print(f"Sending request: {json.dumps(request, indent=2)}\n")
            print("-" * 60)
            print("Stage Updates:")
            print("-" * 60)

            await ws.send(json.dumps(request))

            # Receive all stage updates
            stages_received = []
            while True:
                try:
                    response = await asyncio.wait_for(ws.recv(), timeout=10.0)
                    data = json.loads(response)
                    stages_received.append(data)

                    # Pretty print the stage update
                    stage = data.get("stage", "unknown")
                    message = data.get("message", "")
                    progress = data.get("progress", 0)
                    timing = data.get("timing_ms", 0)
                    stage_data = data.get("data", {})

                    print(f"\n[{progress:3d}%] {stage.upper()}")
                    print(f"       Message: {message}")
                    print(f"       Timing:  {timing:.2f}ms")

                    # Print relevant data
                    if stage_data:
                        for key, value in stage_data.items():
                            if key != "results":  # Skip full results for brevity
                                print(f"       {key}: {value}")

                    # If complete, print summary
                    if stage == "complete":
                        results = stage_data.get("results", [])
                        print(f"\n{'='*60}")
                        print(f"SEARCH COMPLETE - {len(results)} results")
                        print(f"{'='*60}")
                        for i, r in enumerate(results[:5], 1):
                            print(f"{i}. {r.get('name', 'Unknown')[:50]}")
                            print(f"   Score: {r.get('match_score')} | "
                                  f"Status: {r.get('eligibility_status')} | "
                                  f"Verified: {r.get('verified')}")
                        break

                    if stage == "error":
                        print(f"\nERROR: {message}")
                        break

                except asyncio.TimeoutError:
                    print("\nTimeout waiting for response")
                    break
                except websockets.exceptions.ConnectionClosed:
                    break

            print(f"\n{'='*60}")
            print(f"Total stages received: {len(stages_received)}")
            print(f"Stages: {' -> '.join(s.get('stage', '?') for s in stages_received)}")
            print(f"{'='*60}\n")

            return len(stages_received) >= 7

    except ConnectionRefusedError:
        print("ERROR: Cannot connect to WebSocket server.")
        print("Make sure the backend is running: uvicorn main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


async def test_empty_query():
    """Test error handling for empty query."""
    print("\nTesting empty query handling...")

    try:
        async with websockets.connect(WS_URL) as ws:
            await ws.send(json.dumps({"query": "", "profile": {}}))
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(response)

            if data.get("stage") == "error":
                print("  OK: Empty query correctly returns error")
                return True
            else:
                print("  FAIL: Expected error for empty query")
                return False
    except Exception as e:
        print(f"  ERROR: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("MAS-Scholar WebSocket Search Test")
    print("=" * 60)

    # Run main test
    success = asyncio.run(test_websocket_search())

    # Run error handling test
    error_test = asyncio.run(test_empty_query())

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Main search test:    {'PASS' if success else 'FAIL'}")
    print(f"Empty query test:    {'PASS' if error_test else 'FAIL'}")
    print("=" * 60)

    sys.exit(0 if (success and error_test) else 1)
