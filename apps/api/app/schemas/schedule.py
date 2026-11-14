from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class ScheduleSlotCreate(BaseModel):
    waste_type: str = Field(..., description="WET, DRY, or HAZARDOUS_EWASTE")
    day_of_week: int = Field(..., description="0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun; -1 for Daily")
    frequency: str = Field(default="WEEKLY", description="DAILY, WEEKLY, or FIRST_SATURDAY_OF_MONTH")
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM (24-hour)")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM (24-hour)")
    vehicle_number: Optional[str] = None
    supervisor_name: Optional[str] = None
    supervisor_contact: Optional[str] = None
    instructions: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ScheduleSlotUpdate(BaseModel):
    waste_type: Optional[str] = None
    day_of_week: Optional[int] = None
    frequency: Optional[str] = None
    start_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    end_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    vehicle_number: Optional[str] = None
    supervisor_name: Optional[str] = None
    supervisor_contact: Optional[str] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = ConfigDict(from_attributes=True)


class ScheduleOverrideCreate(BaseModel):
    override_date: date
    reason: str = Field(..., min_length=3, max_length=255)
    waste_type: Optional[str] = None
    is_cancelled: bool = False
    rescheduled_date: Optional[date] = None
    rescheduled_start_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    rescheduled_end_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}$")

    model_config = ConfigDict(from_attributes=True)
