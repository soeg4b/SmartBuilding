-- Extend floor plan file type enum for CAD/PDF uploads
-- Run this before using PDF/DWG floor plan upload.

ALTER TYPE "FloorPlanFileType" ADD VALUE IF NOT EXISTS 'pdf';
ALTER TYPE "FloorPlanFileType" ADD VALUE IF NOT EXISTS 'dwg';
