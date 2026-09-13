import cv2
import json
import time
import base64
import numpy as np
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.database.connection import SessionLocal
from backend.app.database import crud
from backend.app.api.routes_detection import get_pipeline

router = APIRouter(prefix="", tags=["Live WebSocket"])

import asyncio

# Set of active spectator/viewer WebSockets (e.g. laptop screens watching mobile stream)
active_viewers: Set[WebSocket] = set()

def sync_save_detections(result):
    db = SessionLocal()
    try:
        for v in result["vehicles"]:
            veh_record = crud.get_or_create_vehicle(
                db=db,
                track_id=v.get("track_id"),
                vehicle_type=v["vehicle_type"],
                confidence=v["confidence"],
                power_type=v["power_type"],
                power_type_confidence=v["power_type_confidence"],
                plate_number=v["plate_info"].get("plate_number") if v["plate_info"].get("detected") else None
            )

            p_info = v["plate_info"]
            if p_info.get("detected") and p_info.get("plate_number") not in ["Reading...", "Uncertain", "Not Detected"]:
                crud.log_number_plate(
                    db=db,
                    vehicle_id=veh_record.id,
                    plate_number=p_info.get("plate_number", "Uncertain"),
                    ocr_confidence=p_info.get("ocr_confidence", 0.0),
                    raw_text=p_info.get("raw_text")
                )

            h_info = v["helmet_info"]
            if h_info and h_info.get("rider_detected"):
                crud.log_helmet_detection(
                    db=db,
                    vehicle_id=veh_record.id,
                    helmet_status=h_info.get("helmet_status"),
                    confidence=h_info.get("confidence")
                )

        for viol in result["violations"]:
            crud.create_violation(
                db=db,
                violation_type=viol["violation_type"],
                vehicle_type=viol["vehicle_type"],
                confidence=viol["confidence"],
                snapshot_path=viol["snapshot_path"],
                plate_number=viol.get("plate_number"),
                notes=viol.get("notes")
            )
    except Exception:
        pass
    finally:
        db.close()

@router.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await websocket.accept()
    pipeline = get_pipeline()
    is_viewer = False
    is_mobile_sender = False
    print("[WebSocket] Client connected for live traffic surveillance")

    frame_counter = 0

    try:
        while True:
            # Receive message from client
            message = await websocket.receive_text()
            data = json.loads(message)

            # Role registration (e.g., Laptop acting as remote display viewer for phone camera)
            if data.get("role") == "viewer" or data.get("action") == "register_viewer":
                is_viewer = True
                active_viewers.add(websocket)
                await websocket.send_text(json.dumps({
                    "status": "viewer_registered",
                    "message": "Listening for wireless camera streams..."
                }))
                # Dedicated resilient viewer loop with keepalive heartbeat
                while True:
                    try:
                        viewer_msg_raw = await asyncio.wait_for(websocket.receive_text(), timeout=8.0)
                        v_data = json.loads(viewer_msg_raw)
                        if v_data.get("action") == "ping":
                            await websocket.send_text(json.dumps({"status": "pong"}))
                    except asyncio.TimeoutError:
                        # Keep proxy & browser WebSocket connection active and healthy
                        try:
                            await websocket.send_text(json.dumps({"status": "heartbeat", "time": time.time()}))
                        except Exception:
                            break
                    except (WebSocketDisconnect, RuntimeError):
                        break
                    except Exception:
                        break
                return  # Viewer loop completed cleanly

            # Initial handshake from mobile transmitter
            if data.get("action") == "camera_started":
                is_mobile_sender = True
                notify_msg = json.dumps({"status": "mobile_stream_started", "source": "mobile_phone"})
                for v in list(active_viewers):
                    if v != websocket:
                        try:
                            await asyncio.wait_for(v.send_text(notify_msg), timeout=1.0)
                        except Exception:
                            active_viewers.discard(v)
                await websocket.send_text(json.dumps({"status": "transmitter_ready"}))
                continue

            # Heartbeat / Ping from sender clients
            if data.get("action") == "ping":
                await websocket.send_text(json.dumps({"status": "pong"}))
                continue

            image_data = data.get("image")
            if not image_data:
                continue

            if data.get("source") == "mobile_phone":
                is_mobile_sender = True

            # Strip base64 prefix if present
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]

            try:
                img_bytes = base64.b64decode(image_data)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as decode_err:
                try:
                    await websocket.send_text(json.dumps({"error": f"Frame decode error: {str(decode_err)}"}))
                except Exception:
                    pass
                continue

            if frame is None:
                continue

            frame_counter += 1
            t_start = time.time()

            # Execute full AI Pipeline with tracking
            result = pipeline.process_frame(frame, frame_id=frame_counter, persist_tracking=True)
            inference_time = round((time.time() - t_start) * 1000, 1)

            # Persist detections and violations in background without blocking video stream
            has_violations = len(result["violations"]) > 0
            if has_violations or frame_counter % 30 == 0:
                asyncio.create_task(asyncio.to_thread(sync_save_detections, result))

            # Encode annotated frame to base64
            annotated_b64 = pipeline.frame_to_base64(result["annotated_frame"], quality=65)

            # Transmit back payload to client
            response_payload = {
                "frame_id": frame_counter,
                "inference_ms": inference_time,
                "fps": round(1000.0 / max(1.0, inference_time), 1),
                "counts": result["counts"],
                "source": data.get("source", "camera"),
                "vehicles": [
                    {
                        "track_id": v["track_id"],
                        "vehicle_type": v["vehicle_type"],
                        "confidence": v["confidence"],
                        "bbox": v["bbox"],
                        "plate": v["plate_info"],
                        "helmet": v["helmet_info"],
                        "power_type": v["power_type"],
                        "power_type_confidence": v["power_type_confidence"],
                        "has_violation": v["has_violation"]
                    }
                    for v in result["vehicles"]
                ],
                "violations": result["violations"],
                "annotated_frame": f"data:image/jpeg;base64,{annotated_b64}"
            }

            payload_str = json.dumps(response_payload)

            # 1. Reply to transmitter
            try:
                await websocket.send_text(payload_str)
            except Exception:
                break

            # 2. Broadcast to all active viewers (e.g. laptop monitoring dashboard)
            dead_viewers = []
            for viewer in list(active_viewers):
                if viewer != websocket:
                    try:
                        await asyncio.wait_for(viewer.send_text(payload_str), timeout=1.5)
                    except Exception:
                        dead_viewers.append(viewer)

            for d in dead_viewers:
                active_viewers.discard(d)

    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"[WebSocket] Streaming error: {e}")
    finally:
        active_viewers.discard(websocket)
        if is_mobile_sender:
            disconnect_msg = json.dumps({"status": "mobile_stream_stopped"})
            for viewer in list(active_viewers):
                try:
                    await asyncio.wait_for(viewer.send_text(disconnect_msg), timeout=1.0)
                except Exception:
                    pass
        try:
            await websocket.close()
        except Exception:
            pass
