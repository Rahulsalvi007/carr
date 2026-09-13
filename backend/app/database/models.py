import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    track_id = Column(Integer, index=True, nullable=True)
    vehicle_type = Column(String(50), nullable=False)
    power_type = Column(String(50), default="Unknown") # Electric, Conventional/Fuel, Unknown
    power_type_confidence = Column(Float, default=0.0)
    confidence = Column(Float, nullable=False)
    plate_number = Column(String(50), nullable=True)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    number_plates = relationship("NumberPlate", back_populates="vehicle", cascade="all, delete-orphan")
    helmet_detections = relationship("HelmetDetection", back_populates="vehicle", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="vehicle", cascade="all, delete-orphan")
    detections = relationship("DetectionRecord", back_populates="vehicle", cascade="all, delete-orphan")

class NumberPlate(Base):
    __tablename__ = "number_plates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True)
    plate_number = Column(String(50), nullable=False)
    ocr_confidence = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    raw_text = Column(String(100), nullable=True)

    vehicle = relationship("Vehicle", back_populates="number_plates")

class HelmetDetection(Base):
    __tablename__ = "helmet_detections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True)
    helmet_status = Column(String(30), nullable=False) # YES, NO, UNKNOWN
    confidence = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="helmet_detections")

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    vehicle_type = Column(String(50), nullable=False)
    plate_number = Column(String(50), nullable=True)
    violation_type = Column(String(50), nullable=False) # NO_HELMET, MISSING_PLATE, UNREADABLE_PLATE
    confidence = Column(Float, nullable=False)
    snapshot_path = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(30), default="ACTIVE") # ACTIVE, REVIEWED, DISMISSED
    notes = Column(Text, nullable=True)

    vehicle = relationship("Vehicle", back_populates="violations")

class DetectionRecord(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    frame_id = Column(Integer, nullable=True)
    vehicle_type = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    bbox_json = Column(String(200), nullable=True) # "[x1, y1, x2, y2]"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    source_type = Column(String(30), default="LIVE") # LIVE, VIDEO, IMAGE

    vehicle = relationship("Vehicle", back_populates="detections")
