# Security Spec for Hazard Alerts

## Data Invariants
1. Hazard alerts must contain a valid title, description, severity, type, and source.
2. Only authorized administrators should be able to create or update hazard alerts.
3. Authenticated users can read hazard alerts.

## The "Dirty Dozen" Payloads
1. { "title": "", "description": "Landslide", "severity": "high", "type": "landslide", "source": "JKR", "timestamp": "2026-10-24T06:00:00Z" } (Should fail)
2. { "title": "Road Closure", "description": "Closure", "severity": "high", "type": "road_closure", "source": "JKR", "timestamp": "2026-10-24T06:00:00Z" } (Should pass)
