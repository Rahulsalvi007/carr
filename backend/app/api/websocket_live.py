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

# Map of active spectator/viewer WebSockets to their individual single-frame queues
viewer_queues: dict[WebSocket, asyncio.Queue] = {}

def broadcast_frame_to_viewers(payload_str: str, exclude_ws: WebSocket = None):
    """Dispatches payload to all active viewers with non-blocking zero-latency drop semantics."""
    for ws, q in list(viewer_queues.items()):
        if ws != exclude_ws:
            if q.full():
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                q.put_nowait(payload_str)
            except asyncio.QueueFull:
                pass

# Cache to prevent duplicate database spam while ensuring every tracked vehicle is recorded
track_log_cache: dict = {}
plate_logged_cache: set = set()

def sync_save_detections(result, source: str = "camera", frame_id: int = None):
    """Persists vehicle detection records, license plates, helmet checks, and violations to database."""
    db = SessionLocal()
    try:
        source_type = "LIVE_MOBILE" if source == "mobile_phone" else "LIVE_CAM"
        for v in result.get("vehicles", []):
            veh_record = crud.get_or_create_vehicle(
                db=db,
                track_id=v.get("track_id"),
                vehicle_type=v["vehicle_type"],
                confidence=v["confidence"],
                power_type=v["power_type"],
                power_type_confidence=v["power_type_confidence"],
                plate_number=v["plate_info"].get("plate_number") if v["plate_info"].get("detected") else None
            )

            p_info = v.get("plate_info", {})
            plate_num = p_info.get("plate_number") if p_info.get("detected") else None
            is_valid_plate = plate_num and plate_num not in ["Reading...", "Uncertain", "Not Detected"]

            # Construct audit trail notes
            note_parts = []
            if is_valid_plate:
                note_parts.append(f"Plate: {plate_num}")
            if v.get("power_type") and v.get("power_type") != "Unknown":
                note_parts.append(f"EV: {v['power_type']}")
            h_info = v.get("helmet_info")
            if h_info and h_info.get("rider_detected"):
                note_parts.append(f"Helmet: {h_info.get('helmet_status')}")
            if v.get("track_id") is not None:
                note_parts.append(f"Track #{v['track_id']}")

            # Save Detection Record into History Table
            crud.log_detection(
                db=db,
                vehicle_id=veh_record.id,
                vehicle_type=v["vehicle_type"],
                confidence=v["confidence"],
                bbox=v["bbox"],
                frame_id=frame_id,
                source_type=source_type,
                notes=" | ".join(note_parts) if note_parts else "Live Stream Vehicle"
            )

            if is_valid_plate:
                crud.log_number_plate(
                    db=db,
                    vehicle_id=veh_record.id,
                    plate_number=plate_num,
                    ocr_confidence=p_info.get("ocr_confidence", 0.0),
                    raw_text=p_info.get("raw_text")
                )

            if h_info and h_info.get("rider_detected"):
                crud.log_helmet_detection(
                    db=db,
                    vehicle_id=veh_record.id,
                    helmet_status=h_info.get("helmet_status"),
                    confidence=h_info.get("confidence")
                )

        for viol in result.get("violations", []):
            crud.create_violation(
                db=db,
                violation_type=viol["violation_type"],
                vehicle_type=viol["vehicle_type"],
                confidence=viol["confidence"],
                snapshot_path=viol["snapshot_path"],
                plate_number=viol.get("plate_number"),
                notes=viol.get("notes")
            )
    except Exception as e:
        print(f"[WebSocket] Database sync error: {e}")
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
                q = asyncio.Queue(maxsize=1)
                viewer_queues[websocket] = q
                await websocket.send_text(json.dumps({
                    "status": "viewer_registered",
                    "message": "Listening for wireless camera streams..."
                }))

                async def viewer_writer():
                    while True:
                        try:
                            msg = await asyncio.wait_for(q.get(), timeout=4.0)
                            await websocket.send_text(msg)
                        except asyncio.TimeoutError:
                            try:
                                await websocket.send_text(json.dumps({"status": "heartbeat", "time": time.time()}))
                            except Exception:
                                break
                        except Exception:
                            break

                async def viewer_reader():
                    while True:
                        try:
                            raw = await websocket.receive_text()
                            v_data = json.loads(raw)
                            if v_data.get("action") == "ping":
                                await websocket.send_text(json.dumps({"status": "pong"}))
                        except Exception:
                            break

                writer_task = asyncio.create_task(viewer_writer())
                reader_task = asyncio.create_task(viewer_reader())
                done, pending = await asyncio.wait(
                    [writer_task, reader_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                for t in pending:
                    t.cancel()
                return  # Viewer loop completed cleanly

            # Initial handshake from mobile transmitter
            if data.get("action") == "camera_started":
                is_mobile_sender = True
                broadcast_frame_to_viewers(
                    json.dumps({"status": "mobile_stream_started", "source": "mobile_phone"}),
                    websocket
                )
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

            # Execute dedicated vehicle surveillance pipeline with tracking
            result = pipeline.process_frame(
                frame,
                frame_id=frame_counter,
                persist_tracking=True
            )
            inference_time = round((time.time() - t_start) * 1000, 1)

            # Intelligent History Persistence for Live Streams:
            # Guarantees every detected car/vehicle is saved to history without spamming duplicates
            vehicles_to_save = []
            now_t = time.time()
            for v in result.get("vehicles", []):
                t_id = v.get("track_id")
                k = str(t_id) if t_id is not None else f"{v['vehicle_type']}_{int(v['bbox'][0]/60)}_{int(v['bbox'][1]/60)}"
                last_logged = track_log_cache.get(k, 0)
                p_text = v.get("plate_info", {}).get("plate_number") if v.get("plate_info", {}).get("detected") else None
                has_new_plate = p_text and p_text not in ["Reading...", "Uncertain", "Not Detected"] and k not in plate_logged_cache
                if (now_t - last_logged > 8.0) or has_new_plate:
                    track_log_cache[k] = now_t
                    if has_new_plate:
                        plate_logged_cache.add(k)
                    vehicles_to_save.append(v)

            has_violations = len(result.get("violations", [])) > 0
            if vehicles_to_save or has_violations:
                save_data = {
                    "vehicles": vehicles_to_save,
                    "violations": result.get("violations", [])
                }
                asyncio.create_task(asyncio.to_thread(
                    sync_save_detections,
                    save_data,
                    data.get("source", "camera"),
                    frame_counter
                ))

            # Encode annotated frame to base64
            annotated_b64 = pipeline.frame_to_base64(result["annotated_frame"], quality=65)

            vehicles_data = [
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
            ]

            # Detect frame orientation (landscape if width >= height)
            f_height, f_width = frame.shape[:2]
            frame_orientation = data.get("orientation") or ("landscape" if f_width >= f_height else "portrait")
            frame_aspect = data.get("aspect_ratio") or round(f_width / max(1, f_height), 3)

            # Full payload with video frame for viewers (laptop monitor)
            viewer_payload = {
                "frame_id": frame_counter,
                "inference_ms": inference_time,
                "fps": round(1000.0 / max(1.0, inference_time), 1),
                "counts": result["counts"],
                "source": data.get("source", "camera"),
                "orientation": frame_orientation,
                "aspect_ratio": frame_aspect,
                "vehicles": vehicles_data,
                "violations": result["violations"],
                "annotated_frame": f"data:image/jpeg;base64,{annotated_b64}"
            }
            viewer_payload_str = json.dumps(viewer_payload)

            # 1. Reply to transmitter: If mobile transmitter doesn't need AI preview, send lightweight telemetry
            try:
                if data.get("need_preview", False) or data.get("source") != "mobile_phone":
                    await websocket.send_text(viewer_payload_str)
                else:
                    transmitter_payload = {
                        "frame_id": frame_counter,
                        "inference_ms": inference_time,
                        "fps": round(1000.0 / max(1.0, inference_time), 1),
                        "counts": result["counts"],
                        "source": "mobile_phone",
                        "orientation": frame_orientation,
                        "aspect_ratio": frame_aspect,
                        "vehicles": vehicles_data,
                        "violations": result["violations"]
                    }
                    await websocket.send_text(json.dumps(transmitter_payload))
            except Exception:
                break

            # 2. Non-blocking zero-latency broadcast to all active spectators (e.g. laptop)
            broadcast_frame_to_viewers(viewer_payload_str, websocket)

    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"[WebSocket] Streaming error: {e}")
    finally:
        viewer_queues.pop(websocket, None)
        if is_mobile_sender:
            disconnect_msg = json.dumps({"status": "mobile_stream_stopped"})
            broadcast_frame_to_viewers(disconnect_msg, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
