from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.schedule import WardCollectionSchedule, ScheduleOverride
from app.models.ward import Ward
from app.models.user import User
from app.models.waste import WasteEntry
from app.models.audit import AuditLog

# Indian Standard Time (IST) offset +05:30
IST = timezone(timedelta(hours=5, minutes=30))

class ScheduleService:
    @staticmethod
    def get_ward_schedules(db: Session, ward_id: str) -> List[WardCollectionSchedule]:
        return db.query(WardCollectionSchedule).filter(
            WardCollectionSchedule.ward_id == ward_id,
            WardCollectionSchedule.is_active == True
        ).order_by(WardCollectionSchedule.day_of_week.asc(), WardCollectionSchedule.start_time.asc()).all()

    @staticmethod
    def get_ward_overrides(db: Session, ward_id: str) -> List[ScheduleOverride]:
        today = datetime.now(IST).date()
        return db.query(ScheduleOverride).filter(
            ScheduleOverride.ward_id == ward_id,
            ScheduleOverride.override_date >= today
        ).order_by(ScheduleOverride.override_date.asc()).all()

    @staticmethod
    def create_schedule(
        db: Session,
        ward_id: str,
        waste_type: str,
        day_of_week: int,
        frequency: str,
        start_time: str,
        end_time: str,
        vehicle_number: Optional[str],
        supervisor_name: Optional[str],
        supervisor_contact: Optional[str],
        instructions: Optional[str],
        actor: Optional[User] = None
    ) -> WardCollectionSchedule:
        schedule = WardCollectionSchedule(
            ward_id=ward_id,
            waste_type=waste_type,
            day_of_week=day_of_week,
            frequency=frequency,
            start_time=start_time,
            end_time=end_time,
            vehicle_number=vehicle_number,
            supervisor_name=supervisor_name,
            supervisor_contact=supervisor_contact,
            instructions=instructions,
            is_active=True
        )
        db.add(schedule)
        db.flush()

        if actor:
            db.add(AuditLog(
                actor_id=actor.id,
                actor_role=actor.role,
                action="CREATE_COLLECTION_SCHEDULE",
                affected_entity_type="WardCollectionSchedule",
                affected_entity_id=schedule.id,
                diff=f"Created {frequency} schedule for {waste_type} in ward {ward_id} ({start_time}-{end_time})"
            ))
        db.commit()
        db.refresh(schedule)
        return schedule

    @staticmethod
    def update_schedule(
        db: Session,
        schedule_id: str,
        updates: Dict[str, Any],
        actor: Optional[User] = None
    ) -> WardCollectionSchedule:
        schedule = db.query(WardCollectionSchedule).filter(WardCollectionSchedule.id == schedule_id).first()
        if not schedule:
            raise ValueError("Schedule slot not found")

        diff_parts = []
        for key, val in updates.items():
            if hasattr(schedule, key) and val is not None:
                old_val = getattr(schedule, key)
                setattr(schedule, key, val)
                diff_parts.append(f"{key}: {old_val} -> {val}")

        if actor:
            db.add(AuditLog(
                actor_id=actor.id,
                actor_role=actor.role,
                action="UPDATE_COLLECTION_SCHEDULE",
                affected_entity_type="WardCollectionSchedule",
                affected_entity_id=schedule.id,
                diff=", ".join(diff_parts) or "Updated collection schedule"
            ))
        db.commit()
        db.refresh(schedule)
        return schedule

    @staticmethod
    def delete_schedule(db: Session, schedule_id: str, actor: Optional[User] = None) -> bool:
        schedule = db.query(WardCollectionSchedule).filter(WardCollectionSchedule.id == schedule_id).first()
        if not schedule:
            return False

        schedule.is_active = False
        if actor:
            db.add(AuditLog(
                actor_id=actor.id,
                actor_role=actor.role,
                action="DEACTIVATE_COLLECTION_SCHEDULE",
                affected_entity_type="WardCollectionSchedule",
                affected_entity_id=schedule.id,
                diff=f"Deactivated {schedule.waste_type} schedule for ward {schedule.ward_id}"
            ))
        db.commit()
        return True

    @staticmethod
    def create_override(
        db: Session,
        ward_id: str,
        override_date: date,
        reason: str,
        waste_type: Optional[str] = None,
        is_cancelled: bool = False,
        rescheduled_date: Optional[date] = None,
        rescheduled_start_time: Optional[str] = None,
        rescheduled_end_time: Optional[str] = None,
        actor: Optional[User] = None
    ) -> ScheduleOverride:
        override = ScheduleOverride(
            ward_id=ward_id,
            override_date=override_date,
            waste_type=waste_type,
            is_cancelled=is_cancelled,
            rescheduled_date=rescheduled_date,
            rescheduled_start_time=rescheduled_start_time,
            rescheduled_end_time=rescheduled_end_time,
            reason=reason,
            created_by_id=actor.id if actor else None
        )
        db.add(override)
        db.flush()

        if actor:
            db.add(AuditLog(
                actor_id=actor.id,
                actor_role=actor.role,
                action="CREATE_SCHEDULE_OVERRIDE",
                affected_entity_type="ScheduleOverride",
                affected_entity_id=override.id,
                diff=f"Created override for {override_date}: cancelled={is_cancelled}, reason={reason}"
            ))
        db.commit()
        db.refresh(override)
        return override

    @staticmethod
    def delete_override(db: Session, override_id: str, actor: Optional[User] = None) -> bool:
        ovr = db.query(ScheduleOverride).filter(ScheduleOverride.id == override_id).first()
        if not ovr:
            return False
        db.delete(ovr)
        if actor:
            db.add(AuditLog(
                actor_id=actor.id,
                actor_role=actor.role,
                action="DELETE_SCHEDULE_OVERRIDE",
                affected_entity_type="ScheduleOverride",
                affected_entity_id=override_id,
                diff=f"Removed schedule override for date {ovr.override_date}"
            ))
        db.commit()
        return True

    @staticmethod
    def compute_upcoming_pickups(
        db: Session,
        ward_id: str,
        days_ahead: int = 14
    ) -> List[Dict[str, Any]]:
        """
        Computes chronological collection events for the ward over the next N days,
        accounting for daily/weekly/monthly recurrence and schedule overrides.
        """
        now = datetime.now(IST)
        today = now.date()
        schedules = ScheduleService.get_ward_schedules(db, ward_id)
        overrides = ScheduleService.get_ward_overrides(db, ward_id)
        override_map = {o.override_date: o for o in overrides}

        events = []

        for i in range(days_ahead):
            current_date = today + timedelta(days=i)
            # Python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
            day_of_week = current_date.weekday()
            # Is first Saturday of the month?
            is_first_saturday = (day_of_week == 5 and current_date.day <= 7)

            for s in schedules:
                applies = False
                if s.frequency == "DAILY":
                    applies = True
                elif s.frequency == "WEEKLY" and s.day_of_week == day_of_week:
                    applies = True
                elif s.frequency == "FIRST_SATURDAY_OF_MONTH" and is_first_saturday:
                    applies = True

                if applies:
                    # Check for override
                    ovr = override_map.get(current_date)
                    is_cancelled = False
                    start_time = s.start_time
                    end_time = s.end_time
                    override_reason = None

                    if ovr and (ovr.waste_type is None or ovr.waste_type == s.waste_type):
                        if ovr.is_cancelled:
                            is_cancelled = True
                        if ovr.rescheduled_start_time:
                            start_time = ovr.rescheduled_start_time
                        if ovr.rescheduled_end_time:
                            end_time = ovr.rescheduled_end_time
                        override_reason = ovr.reason

                    # Parse start datetime to sort chronologically
                    start_h, start_m = [int(x) for x in start_time.split(":")]
                    event_dt = datetime(
                        current_date.year, current_date.month, current_date.day,
                        start_h, start_m, tzinfo=IST
                    )

                    # Only show future or current-day events
                    if event_dt >= now - timedelta(hours=3):
                        events.append({
                            "schedule_id": s.id,
                            "waste_type": s.waste_type,
                            "date": current_date.isoformat(),
                            "day_name": current_date.strftime("%A"),
                            "start_time": start_time,
                            "end_time": end_time,
                            "datetime_iso": event_dt.isoformat(),
                            "vehicle_number": s.vehicle_number or "Municipal Route Electric Tipper",
                            "supervisor_name": s.supervisor_name or "Ward Field Supervisor",
                            "supervisor_contact": s.supervisor_contact or "+91 80 2553 4410",
                            "instructions": s.instructions or "Please segregate at source.",
                            "is_cancelled": is_cancelled,
                            "override_reason": override_reason,
                        })

        events.sort(key=lambda x: x["datetime_iso"])
        return events

    @staticmethod
    def get_citizen_schedule_overview(db: Session, user: User) -> Dict[str, Any]:
        """
        Builds the citizen schedule dashboard payload, resolving ward, next pickup card,
        weekly rules, 14-day upcoming list, and whether 'Not collected?' button should activate.
        """
        now = datetime.now(IST)
        ward = None
        if user.profile and user.profile.ward:
            ward = user.profile.ward
        else:
            # Fallback to Koramangala demo ward
            ward = db.query(Ward).filter(Ward.name == "Koramangala").first()

        if not ward:
            # First available ward
            ward = db.query(Ward).first()

        if not ward:
            return {
                "ward_id": None,
                "ward_name": "Bengaluru Central",
                "zone": "Central",
                "next_pickup": None,
                "weekly_schedules": [],
                "upcoming_events": [],
                "overrides": [],
            }

        schedules = ScheduleService.get_ward_schedules(db, ward.id)
        overrides = ScheduleService.get_ward_overrides(db, ward.id)
        upcoming_events = ScheduleService.compute_upcoming_pickups(db, ward.id, days_ahead=14)

        # Identify next pickup (first uncancelled future event)
        next_pickup = None
        for ev in upcoming_events:
            if not ev["is_cancelled"]:
                # Compute human countdown
                event_dt = datetime.fromisoformat(ev["datetime_iso"])
                diff = event_dt - now
                if diff.total_seconds() < 0:
                    countdown = "Happening now (Morning Collection)"
                elif diff.days == 0:
                    hours = int(diff.total_seconds() // 3600)
                    if hours == 0:
                        countdown = f"Today in {int(diff.total_seconds() // 60)} minutes"
                    else:
                        countdown = f"Today in {hours} hours ({ev['start_time']})"
                elif diff.days == 1:
                    countdown = f"Tomorrow at {ev['start_time']}"
                else:
                    countdown = f"{event_dt.strftime('%A, %b %d')} at {ev['start_time']}"

                # Check if today has a missed pickup reportable
                # Can report missed if today was a scheduled collection, start_time passed, and no weighment logged today
                today_str = now.date().isoformat()
                has_today_event = any(e["date"] == today_str and not e["is_cancelled"] for e in upcoming_events)
                
                # Check if citizen already had collection today
                today_start = datetime.combine(now.date(), time.min).replace(tzinfo=timezone.utc)
                collection_today = db.query(WasteEntry).filter(
                    WasteEntry.user_id == user.id,
                    WasteEntry.collection_date >= today_start
                ).first()

                can_report_missed = has_today_event and (collection_today is None)

                next_pickup = {
                    **ev,
                    "countdown": countdown,
                    "can_report_missed": can_report_missed,
                }
                break

        return {
            "ward_id": ward.id,
            "ward_name": ward.name,
            "zone": ward.zone,
            "next_pickup": next_pickup,
            "weekly_schedules": [
                {
                    "id": s.id,
                    "waste_type": s.waste_type,
                    "day_of_week": s.day_of_week,
                    "frequency": s.frequency,
                    "start_time": s.start_time,
                    "end_time": s.end_time,
                    "vehicle_number": s.vehicle_number,
                    "supervisor_name": s.supervisor_name,
                    "supervisor_contact": s.supervisor_contact,
                    "instructions": s.instructions,
                }
                for s in schedules
            ],
            "upcoming_events": upcoming_events,
            "overrides": [
                {
                    "id": o.id,
                    "override_date": o.override_date.isoformat(),
                    "waste_type": o.waste_type,
                    "is_cancelled": o.is_cancelled,
                    "rescheduled_date": o.rescheduled_date.isoformat() if o.rescheduled_date else None,
                    "rescheduled_start_time": o.rescheduled_start_time,
                    "rescheduled_end_time": o.rescheduled_end_time,
                    "reason": o.reason,
                }
                for o in overrides
            ],
        }

    @staticmethod
    def generate_ical_calendar(db: Session, ward_id: str) -> str:
        """
        Pure Python RFC 5545 iCalendar format generator.
        Generates subscription calendar for the ward over the next 45 days.
        Zero external dependencies or external services required.
        """
        ward = db.query(Ward).filter(Ward.id == ward_id).first()
        ward_name = ward.name if ward else "Bengaluru Ward"

        events = ScheduleService.compute_upcoming_pickups(db, ward_id, days_ahead=45)
        now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//GreenPay Bengaluru//Waste Collection Schedule//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:GreenPay Bengaluru - {ward_name} Collection",
            "X-WR-TIMEZONE:Asia/Kolkata",
            "X-WR-CALDESC:Verified doorstep waste collection schedule for Bengaluru households.",
        ]

        # Timezone component for Asia/Kolkata (UTC+0530)
        lines.extend([
            "BEGIN:VTIMEZONE",
            "TZID:Asia/Kolkata",
            "BEGIN:STANDARD",
            "DTSTART:19700101T000000",
            "TZOFFSETFROM:+0530",
            "TZOFFSETTO:+0530",
            "TZNAME:IST",
            "END:STANDARD",
            "END:VTIMEZONE",
        ])

        for idx, ev in enumerate(events):
            if ev["is_cancelled"]:
                continue

            dt_date = datetime.fromisoformat(ev["date"]).date()
            start_parts = [int(p) for p in ev["start_time"].split(":")]
            end_parts = [int(p) for p in ev["end_time"].split(":")]

            dt_start = datetime(dt_date.year, dt_date.month, dt_date.day, start_parts[0], start_parts[1])
            dt_end = datetime(dt_date.year, dt_date.month, dt_date.day, end_parts[0], end_parts[1])

            dtstart_str = dt_start.strftime("%Y%m%dT%H%M%S")
            dtend_str = dt_end.strftime("%Y%m%dT%H%M%S")
            uid = f"greenpay-{ward_id}-{ev['waste_type']}-{ev['date']}@greenpay.blr"

            waste_type_title = (
                "Wet Organic Waste (Green Bin)"
                if ev["waste_type"] == "WET"
                else "Dry Recyclables (Blue Bin)"
                if ev["waste_type"] == "DRY"
                else "Domestic Hazardous & E-Waste (Red Box)"
            )

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_utc}",
                f"DTSTART;TZID=Asia/Kolkata:{dtstart_str}",
                f"DTEND;TZID=Asia/Kolkata:{dtend_str}",
                f"SUMMARY:GreenPay: {waste_type_title}",
                f"DESCRIPTION:{ev['instructions']} Vehicle: {ev['vehicle_number']}. Supervisor: {ev['supervisor_name']} ({ev['supervisor_contact']}).",
                f"LOCATION:Ward {ward_name}, Bengaluru, Karnataka, India",
                "STATUS:CONFIRMED",
                "TRANSP:TRANSPARENT",
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                f"DESCRIPTION:Reminder: GreenPay doorstep waste collection in 15 minutes.",
                "TRIGGER:-PT15M",
                "END:VALARM",
                "END:VEVENT",
            ])

        lines.append("END:VCALENDAR")
        # RFC 5545 requires CRLF line endings
        return "\r\n".join(lines) + "\r\n"
