import requests

def test_live_api():
    url = "http://127.0.0.1:8000/api/detect/image"
    with open("sample_media/sample_traffic.jpg", "rb") as f:
        files = {"file": ("sample_traffic.jpg", f, "image/jpeg")}
        res = requests.post(url, files=files)
    
    assert res.status_code == 200, f"Failed with status {res.status_code}: {res.text}"
    data = res.json()
    print("API Response Status:", data.get("status"))
    print("Inference Time (ms):", data.get("inference_ms"))
    print("Counts:", data.get("counts"))
    print("Violations:", len(data.get("violations", [])))
    print("Annotated image length:", len(data.get("annotated_image", "")))

if __name__ == "__main__":
    test_live_api()
