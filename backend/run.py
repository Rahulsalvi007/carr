import uvicorn
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

if __name__ == "__main__":
    print("==================================================================")
    print(" RoadGuard AI - Vehicle & Road Safety Monitoring Backend")
    print(" Starting server on http://0.0.0.0:8000 (accessible on LAN)")
    print(" API Documentation: http://localhost:8000/docs")
    print("==================================================================")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
