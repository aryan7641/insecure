from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MotorAddOnPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    selected: bool
    premium: Optional[str] = None


class HealthOptionalCoverPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    selected: Optional[bool] = None
    option: Optional[str] = None
    value: Optional[str] = None


class HealthRiderPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    package_name: Optional[str] = None
    rider_name: str
    selected: Optional[bool] = None
    coverage_limit: Optional[str] = None
    applicable_members: List[str] = Field(default_factory=list)


class CompactMotorOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    make: Optional[str] = None
    model: Optional[str] = None
    variant: Optional[str] = None
    fuel_type: Optional[str] = None
    vehicle_category: Optional[str] = None
    type_of_vehicle: Optional[str] = None
    registration_no: Optional[str] = None
    cubic_capacity: Optional[str] = None
    seats_including_driver: Optional[str] = None
    mfg_month: Optional[str] = None
    mfg_year: Optional[str] = None
    engine_no: Optional[str] = None
    chassis_no: Optional[str] = None
    financier: Optional[str] = None
    policy_type: Optional[str] = None
    policy_number: Optional[str] = None
    policy_issue_date: Optional[str] = None
    policy_start_date: Optional[str] = None
    policy_end_date: Optional[str] = None
    idv_sum_assured: Optional[str] = None
    current_ncb: Optional[str] = None
    active_tp_insurer_name: Optional[str] = None
    active_tp_policy_number: Optional[str] = None
    active_tp_policy_start_date: Optional[str] = None
    active_tp_policy_end_date: Optional[str] = None
    insurer_name: Optional[str] = None
    od_premium: Optional[str] = None
    net_premium: Optional[str] = None
    gst_cess: Optional[str] = None
    final_premium: Optional[str] = None
    customer_type: Optional[str] = None
    title: Optional[str] = None
    customer_gender: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_email: Optional[str] = None
    customer_dob: Optional[str] = None
    customer_pan: Optional[str] = None
    customer_aadhaar: Optional[str] = None
    customer_gst_number: Optional[str] = None
    customer_address: Optional[str] = None
    customer_pincode: Optional[str] = None
    city_district: Optional[str] = None
    state: Optional[str] = None
    payment_status: Optional[str] = None
    payment_mode: Optional[str] = None
    payer_name: Optional[str] = None
    amount_paid: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_date: Optional[str] = None
    add_ons: List[MotorAddOnPatch] = Field(default_factory=list)


class HealthMemberPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    member_id: Optional[str] = None
    name: Optional[str] = None
    gender: Optional[str] = None
    relationship: Optional[str] = None
    dob: Optional[str] = None
    age: Optional[str] = None
    insured_since: Optional[str] = None
    height_cm: Optional[str] = None
    weight_kg: Optional[str] = None
    abha_no: Optional[str] = None
    sum_insured: Optional[str] = None
    aggregate_deductible: Optional[str] = None
    maternity_care: Optional[str] = None
    reduction_maternity_waiting_period: Optional[str] = None


class MedicalAnswerPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: Optional[str] = None
    details: Optional[str] = None


class MedicalQuestionPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question_id: str
    question: str
    answers_by_member: List[MedicalAnswerPatch] = Field(default_factory=list)


class CompactHealthOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    lob_category: Optional[str] = None
    sub_lob_category: Optional[str] = None
    business_type: Optional[str] = None
    policy_type: Optional[str] = None
    senior_citizen_policy: Optional[str] = None
    number_of_adult: Optional[str] = None
    number_of_child: Optional[str] = None
    number_of_parent: Optional[str] = None
    eldest_person_age_type: Optional[str] = None
    eldest_person_dob: Optional[str] = None
    treatment_zone: Optional[str] = None
    ped: Optional[str] = None
    previous_policy_available: Optional[str] = None
    insurer_name: Optional[str] = None
    plan_name: Optional[str] = None
    policy_number: Optional[str] = None
    policy_tenure: Optional[str] = None
    policy_issue_date: Optional[str] = None
    policy_start_date: Optional[str] = None
    policy_end_date: Optional[str] = None
    base_sum_assured: Optional[str] = None
    bonus_sum_assured: Optional[str] = None
    total_sum_assured: Optional[str] = None
    ppt: Optional[str] = None
    renewal: Optional[str] = None
    ppm_frequency: Optional[str] = None
    customer_type: Optional[str] = None
    title: Optional[str] = None
    customer_gender: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_email: Optional[str] = None
    customer_dob: Optional[str] = None
    customer_pan: Optional[str] = None
    customer_aadhaar: Optional[str] = None
    customer_gst_number: Optional[str] = None
    customer_address: Optional[str] = None
    customer_pincode: Optional[str] = None
    city_district: Optional[str] = None
    state: Optional[str] = None
    members: List[HealthMemberPatch] = Field(default_factory=list)
    nominee_name: Optional[str] = None
    nominee_dob: Optional[str] = None
    nominee_relationship: Optional[str] = None
    nominee_share_percent: Optional[str] = None
    nominee_address: Optional[str] = None
    nominee_mobile: Optional[str] = None
    nominee_email: Optional[str] = None
    basic_premium: Optional[str] = None
    other_premium: Optional[str] = None
    net_premium: Optional[str] = None
    gst_percent: Optional[str] = None
    final_premium: Optional[str] = None
    installment_amount: Optional[str] = None
    number_of_installment: Optional[str] = None
    initial_installment: Optional[str] = None
    initial_received_amount: Optional[str] = None
    payment_status: Optional[str] = None
    payment_mode: Optional[str] = None
    payer_name: Optional[str] = None
    amount_paid: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_date: Optional[str] = None
    optional_covers: List[HealthOptionalCoverPatch] = Field(default_factory=list)
    riders: List[HealthRiderPatch] = Field(default_factory=list)
    previous_policies: List[dict] = Field(default_factory=list)
    medical_questions: List[MedicalQuestionPatch] = Field(default_factory=list)
